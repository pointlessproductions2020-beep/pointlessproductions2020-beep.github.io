import * as THREE from "three";

import {
  beginPaintStroke,
  continuePaintStroke,
  endPaintStroke,
  getPainterState,
  isPainterReady
}
from "../paint/painter.js";


/* =========================================================
   PAINTLESSUV
   3D PAINT TOOL
========================================================= */


/*
 * Temporary deep diagnostics.
 *
 * Leave this enabled while we investigate the dragon.
 * Set it to false after the UV problem is solved.
 */

const DEBUG_PAINT =
  true;

const MAX_REPORTED_OVERLAPS =
  30;

const UV_POINT_TOLERANCE =
  0.000001;


/* =========================================================
   CREATE PAINT TOOL
========================================================= */

/**
 * Paint directly onto a model using raycast UV coordinates.
 *
 * Diagnostic mode compares:
 *
 * - Three.js intersection UV;
 * - manually interpolated triangle UV;
 * - texture-transformed UV;
 * - painter texture and material texture identity;
 * - all other triangles containing the same UV coordinate.
 *
 * @param {Object} options
 * @param {HTMLCanvasElement} options.canvas
 * @param {THREE.Camera} options.camera
 * @param {OrbitControls} options.controls
 * @param {Function} options.getModel
 * @returns {Object}
 */
export function createPaintTool(
  {
    canvas,
    camera,
    controls,
    getModel
  }
) {

  if (
    !canvas
  ) {

    throw new Error(
      "PaintlessUV Paint Tool requires the model canvas."
    );

  }


  if (
    !camera
  ) {

    throw new Error(
      "PaintlessUV Paint Tool requires a camera."
    );

  }


  if (
    !controls
  ) {

    throw new Error(
      "PaintlessUV Paint Tool requires OrbitControls."
    );

  }


  if (
    typeof getModel !==
      "function"
  ) {

    throw new Error(
      "PaintlessUV Paint Tool requires a model getter."
    );

  }


  const raycaster =
    new THREE.Raycaster();

  const pointer =
    new THREE.Vector2();


  let active =
    false;

  let painting =
    false;

  let activePointerId =
    null;

  let previousControlsEnabled =
    true;


/* =========================================================
   ACTIVATE
========================================================= */

  function activate() {

    if (
      active
    ) {

      return;

    }


    active =
      true;

    painting =
      false;

    activePointerId =
      null;

    previousControlsEnabled =
      controls.enabled;


    controls.enabled =
      false;


    canvas.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    canvas.addEventListener(
      "pointermove",
      handlePointerMove
    );

    canvas.addEventListener(
      "pointerup",
      handlePointerUp
    );

    canvas.addEventListener(
      "pointercancel",
      handlePointerUp
    );

    canvas.addEventListener(
      "lostpointercapture",
      handleLostPointerCapture
    );


    canvas.style.cursor =
      "crosshair";

    canvas.style.touchAction =
      "none";


    console.log(
      "3D Paint Tool Activated"
    );

  }


/* =========================================================
   DEACTIVATE
========================================================= */

  function deactivate() {

    if (
      !active
    ) {

      return;

    }


    finishStroke();


    canvas.removeEventListener(
      "pointerdown",
      handlePointerDown
    );

    canvas.removeEventListener(
      "pointermove",
      handlePointerMove
    );

    canvas.removeEventListener(
      "pointerup",
      handlePointerUp
    );

    canvas.removeEventListener(
      "pointercancel",
      handlePointerUp
    );

    canvas.removeEventListener(
      "lostpointercapture",
      handleLostPointerCapture
    );


    canvas.style.cursor =
      "";

    canvas.style.touchAction =
      "";


    controls.enabled =
      previousControlsEnabled;

    active =
      false;


    console.log(
      "3D Paint Tool Deactivated"
    );

  }


/* =========================================================
   POINTER DOWN
========================================================= */

  function handlePointerDown(
    event
  ) {

    if (
      event.button !==
        0 ||
      !isPainterReady()
    ) {

      return;

    }


    const paintHit =
      getPaintHitFromPointer(
        event,
        true
      );


    if (
      !paintHit
    ) {

      return;

    }


    event.preventDefault();

    event.stopPropagation();


    painting =
      true;

    activePointerId =
      event.pointerId;


    try {

      canvas.setPointerCapture(
        event.pointerId
      );

    } catch (
      error
    ) {

      console.warn(
        "PaintlessUV could not capture the paint pointer.",
        error
      );

    }


    beginPaintStroke(
      paintHit.texturePoint.x,
      paintHit.texturePoint.y
    );

  }


/* =========================================================
   POINTER MOVE
========================================================= */

  function handlePointerMove(
    event
  ) {

    if (
      !painting ||
      event.pointerId !==
        activePointerId
    ) {

      return;

    }


    event.preventDefault();

    event.stopPropagation();


    /*
     * Do not run the expensive overlap diagnostics on every
     * pointer movement. They run only on pointer-down.
     */

    const paintHit =
      getPaintHitFromPointer(
        event,
        false
      );


    if (
      !paintHit
    ) {

      endPaintStroke();

      painting =
        false;

      return;

    }


    const painter =
      getPainterState();

    const previousX =
      painter.lastX;

    const previousY =
      painter.lastY;


    const jumpDistance =
      Math.hypot(
        paintHit.texturePoint.x -
          previousX,

        paintHit.texturePoint.y -
          previousY
      );


    /*
     * Adjacent 3D surface points can occupy distant texture
     * locations when crossing a UV seam. Restart rather than
     * drawing a giant line between separate UV islands.
     */

    const maximumSafeJump =
      Math.max(
        painter.size * 4,
        80
      );


    if (
      jumpDistance >
        maximumSafeJump
    ) {

      endPaintStroke();

      beginPaintStroke(
        paintHit.texturePoint.x,
        paintHit.texturePoint.y
      );

      return;

    }


    continuePaintStroke(
      paintHit.texturePoint.x,
      paintHit.texturePoint.y
    );

  }


/* =========================================================
   POINTER UP
========================================================= */

  function handlePointerUp(
    event
  ) {

    if (
      event.pointerId !==
        activePointerId
    ) {

      return;

    }


    event.preventDefault();

    event.stopPropagation();


    finishStroke();


    if (
      canvas.hasPointerCapture(
        event.pointerId
      )
    ) {

      canvas.releasePointerCapture(
        event.pointerId
      );

    }

  }


function handleLostPointerCapture(
  event
) {

  if (
    event.pointerId ===
      activePointerId
  ) {

    finishStroke();

  }

}


/* =========================================================
   FINISH STROKE
========================================================= */

  function finishStroke() {

    if (
      painting
    ) {

      endPaintStroke();

    }


    painting =
      false;

    activePointerId =
      null;

  }


/* =========================================================
   RAYCAST POINTER
========================================================= */

  function getPaintHitFromPointer(
    event,
    runDiagnostics
  ) {

    const model =
      getModel();


    if (
      !model
    ) {

      return null;

    }


    const rectangle =
      canvas.getBoundingClientRect();


    if (
      rectangle.width <=
        0 ||
      rectangle.height <=
        0
    ) {

      return null;

    }


    pointer.x =
      (
        (
          event.clientX -
          rectangle.left
        ) /
        rectangle.width
      ) *
        2 -
      1;

    pointer.y =
      -(
        (
          event.clientY -
          rectangle.top
        ) /
        rectangle.height
      ) *
        2 +
      1;


    raycaster.setFromCamera(
      pointer,
      camera
    );


    const intersections =
      raycaster.intersectObject(
        model,
        true
      );


    const intersection =
      intersections.find(
        (
          candidate
        ) =>
          candidate.object?.isMesh &&
          candidate.uv &&
          Number.isInteger(
            candidate.faceIndex
          )
      );


    if (
      !intersection?.uv
    ) {

      return null;

    }


    const painter =
      getPainterState();

    const material =
      getIntersectionMaterial(
        intersection
      );


    /*
     * Manually calculate the UV from the exact face and hit
     * point. This lets us compare our result with Three.js.
     */

    const manualResult =
      calculateManualIntersectionUV(
        intersection
      );


    /*
     * Three.js intersection.uv may include the material map's
     * texture transform. The manual raw UV does not.
     */

    const transformedManualUV =
      manualResult?.uv
        ? applyTextureTransform(
            manualResult.uv,
            material?.map
          )
        : null;


    /*
     * Use the raycaster UV for actual painting while debugging.
     */

    const activeUV =
      intersection.uv.clone();


    const texturePoint =
      convertUVToTexturePoint(
        activeUV
      );


    if (
      runDiagnostics &&
      DEBUG_PAINT
    ) {

      const overlaps =
        findUVTriangleOverlaps(
          intersection.object.geometry,
          activeUV,
          intersection.faceIndex
        );


      logPaintDiagnostics(
        {
          event,
          intersection,
          painter,
          material,
          manualResult,
          transformedManualUV,
          activeUV,
          texturePoint,
          intersections,
          overlaps
        }
      );

    }


    return {
      intersection,
      uv:
        activeUV,
      texturePoint
    };

  }


/* =========================================================
   MATERIAL
========================================================= */

  function getIntersectionMaterial(
    intersection
  ) {

    const materialValue =
      intersection.object?.material;


    if (
      Array.isArray(
        materialValue
      )
    ) {

      const materialIndex =
        intersection.face?.materialIndex ??
        0;


      return materialValue[
        materialIndex
      ] ??
        materialValue[0] ??
        null;

    }


    return materialValue ??
      null;

  }


/* =========================================================
   MANUAL UV INTERPOLATION
========================================================= */

  function calculateManualIntersectionUV(
    intersection
  ) {

    const geometry =
      intersection.object.geometry;

    const position =
      geometry.getAttribute(
        "position"
      );

    const uv =
      geometry.getAttribute(
        "uv"
      );


    if (
      !position ||
      !uv
    ) {

      return null;

    }


    const indices =
      getFaceVertexIndices(
        geometry,
        intersection.faceIndex
      );


    if (
      !indices
    ) {

      return null;

    }


    const positionA =
      readPosition(
        position,
        indices.a
      );

    const positionB =
      readPosition(
        position,
        indices.b
      );

    const positionC =
      readPosition(
        position,
        indices.c
      );


    const localHitPoint =
      intersection.object.worldToLocal(
        intersection.point.clone()
      );


    const barycentric =
      new THREE.Vector3();


    THREE.Triangle.getBarycoord(
      localHitPoint,
      positionA,
      positionB,
      positionC,
      barycentric
    );


    const uvA =
      readUV(
        uv,
        indices.a
      );

    const uvB =
      readUV(
        uv,
        indices.b
      );

    const uvC =
      readUV(
        uv,
        indices.c
      );


    const interpolatedUV =
      new THREE.Vector2(
        uvA.x *
          barycentric.x +
        uvB.x *
          barycentric.y +
        uvC.x *
          barycentric.z,

        uvA.y *
          barycentric.x +
        uvB.y *
          barycentric.y +
        uvC.y *
          barycentric.z
      );


    return {
      indices,
      positionA,
      positionB,
      positionC,
      uvA,
      uvB,
      uvC,
      barycentric,
      localHitPoint,
      uv:
        interpolatedUV
    };

  }


/* =========================================================
   TEXTURE TRANSFORM
========================================================= */

  function applyTextureTransform(
    uv,
    texture
  ) {

    const transformedUV =
      uv.clone();


    if (
      !texture?.isTexture
    ) {

      return transformedUV;

    }


    texture.updateMatrix();

    texture.transformUv(
      transformedUV
    );


    return transformedUV;

  }


/* =========================================================
   FIND OVERLAPPING UV TRIANGLES
========================================================= */

/**
 * Find every UV triangle containing the clicked UV point.
 *
 * More than one match means multiple model triangles share
 * the same texture region.
 */
  function findUVTriangleOverlaps(
    geometry,
    point,
    clickedFaceIndex
  ) {

    const uv =
      geometry.getAttribute(
        "uv"
      );


    if (
      !uv
    ) {

      return {
        count:
          0,

        clickedFaceFound:
          false,

        faces:
          []
      };

    }


    const triangleCount =
      getTriangleCount(
        geometry
      );

    const matchingFaces =
      [];

    let totalMatches =
      0;

    let clickedFaceFound =
      false;


    for (
      let faceIndex = 0;
      faceIndex <
        triangleCount;
      faceIndex += 1
    ) {

      const indices =
        getFaceVertexIndices(
          geometry,
          faceIndex
        );


      if (
        !indices
      ) {

        continue;

      }


      const uvA =
        readUV(
          uv,
          indices.a
        );

      const uvB =
        readUV(
          uv,
          indices.b
        );

      const uvC =
        readUV(
          uv,
          indices.c
        );


      if (
        pointInsideUVTriangle(
          point,
          uvA,
          uvB,
          uvC
        )
      ) {

        totalMatches +=
          1;


        if (
          faceIndex ===
            clickedFaceIndex
        ) {

          clickedFaceFound =
            true;

        }


        if (
          matchingFaces.length <
            MAX_REPORTED_OVERLAPS
        ) {

          matchingFaces.push(
            {
              faceIndex,

              clickedFace:
                faceIndex ===
                clickedFaceIndex,

              indices:
                {
                  ...indices
                },

              uvA:
                serialiseVector2(
                  uvA
                ),

              uvB:
                serialiseVector2(
                  uvB
                ),

              uvC:
                serialiseVector2(
                  uvC
                )
            }
          );

        }

      }

    }


    return {
      count:
        totalMatches,

      clickedFaceFound,

      truncated:
        totalMatches >
        matchingFaces.length,

      faces:
        matchingFaces
    };

  }


/* =========================================================
   UV POINT IN TRIANGLE
========================================================= */

  function pointInsideUVTriangle(
    point,
    pointA,
    pointB,
    pointC
  ) {

    const denominator =
      (
        pointB.y -
        pointC.y
      ) *
      (
        pointA.x -
        pointC.x
      ) +
      (
        pointC.x -
        pointB.x
      ) *
      (
        pointA.y -
        pointC.y
      );


    if (
      Math.abs(
        denominator
      ) <=
        Number.EPSILON
    ) {

      return false;

    }


    const weightA =
      (
        (
          pointB.y -
          pointC.y
        ) *
        (
          point.x -
          pointC.x
        ) +
        (
          pointC.x -
          pointB.x
        ) *
        (
          point.y -
          pointC.y
        )
      ) /
      denominator;


    const weightB =
      (
        (
          pointC.y -
          pointA.y
        ) *
        (
          point.x -
          pointC.x
        ) +
        (
          pointA.x -
          pointC.x
        ) *
        (
          point.y -
          pointC.y
        )
      ) /
      denominator;


    const weightC =
      1 -
      weightA -
      weightB;


    return (
      weightA >=
        -UV_POINT_TOLERANCE &&
      weightB >=
        -UV_POINT_TOLERANCE &&
      weightC >=
        -UV_POINT_TOLERANCE
    );

  }


/* =========================================================
   UV TO TEXTURE PIXELS
========================================================= */

  function convertUVToTexturePoint(
    uv
  ) {

    const painter =
      getPainterState();

    const paintCanvas =
      painter.canvas;


    if (
      !paintCanvas
    ) {

      return null;

    }


    const u =
      THREE.MathUtils.clamp(
        uv.x,
        0,
        1
      );

    const v =
      THREE.MathUtils.clamp(
        uv.y,
        0,
        1
      );


    /*
     * glTF UV coordinates use the same top-left orientation
     * required by a glTF-compatible texture with flipY=false.
     */

    return {
      x:
        u *
        paintCanvas.width,

      y:
        v *
        paintCanvas.height
    };

  }


/* =========================================================
   DIAGNOSTIC LOGGING
========================================================= */

  function logPaintDiagnostics(
    {
      event,
      intersection,
      painter,
      material,
      manualResult,
      transformedManualUV,
      activeUV,
      texturePoint,
      intersections,
      overlaps
    }
  ) {

    const materialTexture =
      material?.map ??
      null;

    const painterTexture =
      painter.texture ??
      null;


    const manualDifference =
      manualResult?.uv
        ? activeUV.distanceTo(
            manualResult.uv
          )
        : null;

    const transformedDifference =
      transformedManualUV
        ? activeUV.distanceTo(
            transformedManualUV
          )
        : null;


    console.group(
      `PAINT DEBUG — face ${intersection.faceIndex}`
    );


    console.log(
      "POINTER",
      {
        clientX:
          event.clientX,

        clientY:
          event.clientY,

        ndcX:
          pointer.x,

        ndcY:
          pointer.y
      }
    );


    console.log(
      "RAYCAST",
      {
        intersectionCount:
          intersections.length,

        object:
          intersection.object?.name,

        objectType:
          intersection.object?.type,

        faceIndex:
          intersection.faceIndex,

        faceMaterialIndex:
          intersection.face?.materialIndex,

        distance:
          intersection.distance,

        worldPoint:
          serialiseVector3(
            intersection.point
          ),

        intersectionUV:
          serialiseVector2(
            activeUV
          )
      }
    );


    console.log(
      "MANUAL TRIANGLE",
      manualResult
        ? {
            indices:
              manualResult.indices,

            uvA:
              serialiseVector2(
                manualResult.uvA
              ),

            uvB:
              serialiseVector2(
                manualResult.uvB
              ),

            uvC:
              serialiseVector2(
                manualResult.uvC
              ),

            barycentric:
              serialiseVector3(
                manualResult.barycentric
              ),

            manuallyInterpolatedUV:
              serialiseVector2(
                manualResult.uv
              ),

            transformedManualUV:
              serialiseVector2(
                transformedManualUV
              ),

            rawManualDifference:
              manualDifference,

            transformedDifference
          }
        : null
    );


    console.log(
      "TEXTURE COORDINATE",
      {
        textureX:
          texturePoint?.x,

        textureY:
          texturePoint?.y,

        canvasWidth:
          painter.canvas?.width,

        canvasHeight:
          painter.canvas?.height
      }
    );


    console.log(
      "TEXTURE IDENTITY",
      {
        sameTextureObject:
          materialTexture ===
          painterTexture,

        materialTextureId:
          materialTexture?.id,

        painterTextureId:
          painterTexture?.id,

        materialTextureUUID:
          materialTexture?.uuid,

        painterTextureUUID:
          painterTexture?.uuid,

        materialTextureImageIsPainterCanvas:
          materialTexture?.image ===
          painter.canvas,

        painterTextureImageIsPainterCanvas:
          painterTexture?.image ===
          painter.canvas
      }
    );


    console.log(
      "MATERIAL",
      {
        name:
          material?.name,

        type:
          material?.type,

        side:
          material?.side,

        colour:
          material?.color?.getHexString?.(),

        hasMap:
          Boolean(
            materialTexture
          )
      }
    );


    console.log(
      "TEXTURE SETTINGS",
      {
        flipY:
          materialTexture?.flipY,

        colorSpace:
          materialTexture?.colorSpace,

        mapping:
          materialTexture?.mapping,

        wrapS:
          materialTexture?.wrapS,

        wrapT:
          materialTexture?.wrapT,

        offset:
          materialTexture?.offset
            ? serialiseVector2(
                materialTexture.offset
              )
            : null,

        repeat:
          materialTexture?.repeat
            ? serialiseVector2(
                materialTexture.repeat
              )
            : null,

        center:
          materialTexture?.center
            ? serialiseVector2(
                materialTexture.center
              )
            : null,

        rotation:
          materialTexture?.rotation,

        matrixAutoUpdate:
          materialTexture?.matrixAutoUpdate,

        matrix:
          materialTexture?.matrix
            ?.elements
            ?.slice?.()
      }
    );


    console.log(
      "GEOMETRY",
      {
        indexed:
          Boolean(
            intersection.object.geometry.getIndex()
          ),

        positionCount:
          intersection.object.geometry
            .getAttribute(
              "position"
            )
            ?.count,

        uvCount:
          intersection.object.geometry
            .getAttribute(
              "uv"
            )
            ?.count,

        uv1Count:
          intersection.object.geometry
            .getAttribute(
              "uv1"
            )
            ?.count,

        triangleCount:
          getTriangleCount(
            intersection.object.geometry
          )
      }
    );


    console.log(
      "UV OVERLAP TEST",
      {
        matchCount:
          overlaps.count,

        clickedFaceFound:
          overlaps.clickedFaceFound,

        truncated:
          overlaps.truncated,

        matchingFaces:
          overlaps.faces
      }
    );


    if (
      overlaps.count >
        1
    ) {

      console.warn(
        `UV OVERLAP DETECTED: ${overlaps.count} triangles contain the clicked UV point.`
      );

    } else {

      console.log(
        "No stacked UV triangle was detected at this point."
      );

    }


    if (
      materialTexture !==
        painterTexture
    ) {

      console.error(
        "TEXTURE MISMATCH: The painter and model material are using different texture objects."
      );

    }


    if (
      transformedDifference !==
        null &&
      transformedDifference >
        0.00001
    ) {

      console.warn(
        "UV INTERPOLATION MISMATCH: Three.js and manual transformed UV values differ."
      );

    }


    console.groupEnd();

  }


/* =========================================================
   GEOMETRY HELPERS
========================================================= */

  function getFaceVertexIndices(
    geometry,
    faceIndex
  ) {

    if (
      !Number.isInteger(
        faceIndex
      )
    ) {

      return null;

    }


    const index =
      geometry.getIndex();

    const start =
      faceIndex *
      3;


    if (
      index
    ) {

      if (
        start + 2 >=
          index.count
      ) {

        return null;

      }


      return {
        a:
          index.getX(
            start
          ),

        b:
          index.getX(
            start + 1
          ),

        c:
          index.getX(
            start + 2
          )
      };

    }


    const position =
      geometry.getAttribute(
        "position"
      );


    if (
      !position ||
      start + 2 >=
        position.count
    ) {

      return null;

    }


    return {
      a:
        start,

      b:
        start + 1,

      c:
        start + 2
    };

  }


  function getTriangleCount(
    geometry
  ) {

    const index =
      geometry.getIndex();


    if (
      index
    ) {

      return Math.floor(
        index.count /
        3
      );

    }


    const position =
      geometry.getAttribute(
        "position"
      );


    return position
      ? Math.floor(
          position.count /
          3
        )
      : 0;

  }


  function readPosition(
    attribute,
    index
  ) {

    return new THREE.Vector3(
      attribute.getX(
        index
      ),

      attribute.getY(
        index
      ),

      attribute.getZ(
        index
      )
    );

  }


  function readUV(
    attribute,
    index
  ) {

    return new THREE.Vector2(
      attribute.getX(
        index
      ),

      attribute.getY(
        index
      )
    );

  }


/* =========================================================
   SERIALISERS
========================================================= */

  function serialiseVector2(
    vector
  ) {

    if (
      !vector
    ) {

      return null;

    }


    return {
      x:
        vector.x,

      y:
        vector.y
    };

  }


  function serialiseVector3(
    vector
  ) {

    if (
      !vector
    ) {

      return null;

    }


    return {
      x:
        vector.x,

      y:
        vector.y,

      z:
        vector.z
    };

  }


/* =========================================================
   PUBLIC TOOL
========================================================= */

  return {

    activate,

    deactivate,

    destroy() {

      deactivate();

    }

  };

}
