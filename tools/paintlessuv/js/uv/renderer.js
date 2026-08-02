import {
  prepareUVCache,
  getUVCacheCanvas
}
from "./cache.js";


/* =========================================================
   PAINTLESSUV
   UV LAYOUT RENDERER
========================================================= */

const TRIANGLES_PER_BATCH =
  300;

const FALLBACK_UV_SIZE =
  1024;


/**
 * Build the UV layout inside an off-screen cache,
 * then copy the cached image onto the visible UV canvas.
 *
 * @param {THREE.Object3D} modelScene
 * @param {HTMLCanvasElement} canvas
 * @returns {{hasUV: boolean, meshes: number, triangles: number}}
 */
export function drawUVLayout(
  modelScene,
  canvas
) {

  if (
    !modelScene ||
    !canvas
  ) {

    return {
      hasUV:
        false,

      meshes:
        0,

      triangles:
        0
    };

  }


  const visibleContext =
    canvas.getContext(
      "2d"
    );


  if (
    !visibleContext
  ) {

    throw new Error(
      "PaintlessUV could not access the visible UV canvas."
    );

  }


  const dimensions =
    getUVCanvasDimensions(
      canvas
    );

  const width =
    dimensions.width;

  const height =
    dimensions.height;


  canvas.width =
    width;

  canvas.height =
    height;


  const cache =
    prepareUVCache(
      width,
      height
    );

  const cacheContext =
    cache.context;


  drawCheckerboard(
    cacheContext,
    width,
    height
  );


  let hasUV =
    false;

  let meshCount =
    0;

  let triangleCount =
    0;


  modelScene.traverse(
    (
      object
    ) => {

      if (
        !object.isMesh ||
        !object.geometry
      ) {

        return;

      }


      const geometry =
        object.geometry;

      const uv =
        geometry.getAttribute(
          "uv"
        );


      if (
        !uv
      ) {

        return;

      }


      hasUV =
        true;

      meshCount +=
        1;


      const index =
        geometry.getIndex();


      cacheContext.save();

      cacheContext.strokeStyle =
        "rgba(125, 30, 225, 0.78)";

      cacheContext.lineWidth =
        0.9;

      cacheContext.lineJoin =
        "round";

      cacheContext.lineCap =
        "round";


      if (
        index
      ) {

        triangleCount +=
          drawIndexedGeometry(
            cacheContext,
            uv,
            index,
            width,
            height
          );

      } else {

        triangleCount +=
          drawNonIndexedGeometry(
            cacheContext,
            uv,
            width,
            height
          );

      }


      cacheContext.restore();

    }
  );


  if (
    !hasUV
  ) {

    drawNoUVMessage(
      cacheContext,
      width,
      height
    );

  }


  drawCachedUV(
    canvas
  );


  return {
    hasUV,

    meshes:
      meshCount,

    triangles:
      triangleCount
  };

}


/* =========================================================
   CANVAS DIMENSIONS
========================================================= */

/**
 * Obtain a usable UV canvas size even when the workspace is
 * temporarily hidden during model loading.
 *
 * A hidden canvas reports a client size of zero. Rendering
 * the complete UV map at 1 × 1 creates a solid purple pixel
 * which is later stretched over the whole viewport.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {{width: number, height: number}}
 */
function getUVCanvasDimensions(
  canvas
) {

  const canvasRectangle =
    canvas.getBoundingClientRect();

  const parentRectangle =
    canvas.parentElement
      ?.getBoundingClientRect();


  let width =
    Math.round(
      canvasRectangle.width ||
      canvas.clientWidth ||
      parentRectangle?.width ||
      0
    );

  let height =
    Math.round(
      canvasRectangle.height ||
      canvas.clientHeight ||
      parentRectangle?.height ||
      0
    );


  /*
   * The editor may still be hidden while the loading overlay
   * is active. Use a proper UV working resolution rather than
   * allowing the cache to become 1 × 1.
   */

  if (
    width <
      64 ||
    height <
      64
  ) {

    width =
      FALLBACK_UV_SIZE;

    height =
      FALLBACK_UV_SIZE;

  }


  return {
    width:
      Math.max(
        64,
        width
      ),

    height:
      Math.max(
        64,
        height
      )
  };

}


/* =========================================================
   DRAW INDEXED GEOMETRY
========================================================= */

function drawIndexedGeometry(
  context,
  uv,
  index,
  width,
  height
) {

  let triangleCount =
    0;

  let trianglesInBatch =
    0;


  context.beginPath();


  for (
    let position = 0;
    position + 2 <
      index.count;
    position += 3
  ) {

    addTriangleToPath(
      context,
      uv,
      index.getX(
        position
      ),
      index.getX(
        position + 1
      ),
      index.getX(
        position + 2
      ),
      width,
      height
    );


    triangleCount +=
      1;

    trianglesInBatch +=
      1;


    if (
      trianglesInBatch >=
      TRIANGLES_PER_BATCH
    ) {

      context.stroke();

      context.beginPath();

      trianglesInBatch =
        0;

    }

  }


  if (
    trianglesInBatch >
      0
  ) {

    context.stroke();

  }


  return triangleCount;

}


/* =========================================================
   DRAW NON-INDEXED GEOMETRY
========================================================= */

function drawNonIndexedGeometry(
  context,
  uv,
  width,
  height
) {

  let triangleCount =
    0;

  let trianglesInBatch =
    0;


  context.beginPath();


  for (
    let position = 0;
    position + 2 <
      uv.count;
    position += 3
  ) {

    addTriangleToPath(
      context,
      uv,
      position,
      position + 1,
      position + 2,
      width,
      height
    );


    triangleCount +=
      1;

    trianglesInBatch +=
      1;


    if (
      trianglesInBatch >=
      TRIANGLES_PER_BATCH
    ) {

      context.stroke();

      context.beginPath();

      trianglesInBatch =
        0;

    }

  }


  if (
    trianglesInBatch >
      0
  ) {

    context.stroke();

  }


  return triangleCount;

}


/* =========================================================
   DISPLAY CACHED UV
========================================================= */

/**
 * Copy the rendered UV cache onto the visible canvas.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Object} view
 */
export function drawCachedUV(
  canvas,
  view = {
    zoom:
      1,

    offsetX:
      0,

    offsetY:
      0
  }
) {

  if (
    !canvas
  ) {

    return;

  }


  const visibleContext =
    canvas.getContext(
      "2d"
    );

  const cachedCanvas =
    getUVCacheCanvas();


  if (
    !visibleContext ||
    !cachedCanvas
  ) {

    return;

  }


  /*
   * When the visible canvas was previously created while the
   * workspace was hidden, make sure it is no longer 1 × 1.
   */

  if (
    canvas.width <
      64 ||
    canvas.height <
      64
  ) {

    canvas.width =
      cachedCanvas.width;

    canvas.height =
      cachedCanvas.height;

  }


  visibleContext.setTransform(
    1,
    0,
    0,
    1,
    0,
    0
  );

  visibleContext.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  visibleContext.save();

  visibleContext.translate(
    view.offsetX,
    view.offsetY
  );

  visibleContext.scale(
    view.zoom,
    view.zoom
  );

  visibleContext.imageSmoothingEnabled =
    false;

  visibleContext.drawImage(
    cachedCanvas,
    0,
    0
  );

  visibleContext.restore();

}


/* =========================================================
   BUILD TRIANGLE PATH
========================================================= */

function addTriangleToPath(
  context,
  uv,
  indexA,
  indexB,
  indexC,
  width,
  height
) {

  const pointA =
    convertUVToCanvas(
      uv.getX(
        indexA
      ),
      uv.getY(
        indexA
      ),
      width,
      height
    );

  const pointB =
    convertUVToCanvas(
      uv.getX(
        indexB
      ),
      uv.getY(
        indexB
      ),
      width,
      height
    );

  const pointC =
    convertUVToCanvas(
      uv.getX(
        indexC
      ),
      uv.getY(
        indexC
      ),
      width,
      height
    );


  context.moveTo(
    pointA.x,
    pointA.y
  );

  context.lineTo(
    pointB.x,
    pointB.y
  );

  context.lineTo(
    pointC.x,
    pointC.y
  );

  context.closePath();

}


/* =========================================================
   CONVERT UV TO CANVAS POSITION
========================================================= */

function convertUVToCanvas(
  u,
  v,
  width,
  height
) {

  return {
    x:
      u *
      width,

    y:
      (
        1 - v
      ) *
      height
  };

}


/* =========================================================
   CHECKERBOARD
========================================================= */

function drawCheckerboard(
  context,
  width,
  height
) {

  const squareSize =
    24;


  for (
    let y = 0;
    y <
      height;
    y +=
      squareSize
  ) {

    for (
      let x = 0;
      x <
        width;
      x +=
        squareSize
    ) {

      const isLight =
        (
          x /
            squareSize +
          y /
            squareSize
        ) %
          2 ===
        0;


      context.fillStyle =
        isLight
          ? "#eeeeee"
          : "#d3d3d3";


      context.fillRect(
        x,
        y,
        squareSize,
        squareSize
      );

    }

  }

}


/* =========================================================
   NO UV MESSAGE
========================================================= */

function drawNoUVMessage(
  context,
  width,
  height
) {

  context.save();


  context.fillStyle =
    "rgba(12, 8, 18, 0.82)";

  context.fillRect(
    0,
    0,
    width,
    height
  );


  context.textAlign =
    "center";

  context.textBaseline =
    "middle";


  context.fillStyle =
    "#ffffff";

  context.font =
    "700 34px Arial, sans-serif";


  context.fillText(
    "No UV map found",
    width / 2,
    height / 2 - 22
  );


  context.fillStyle =
    "#cbb7da";

  context.font =
    "500 20px Arial, sans-serif";


  context.fillText(
    "PaintlessUV will generate one automatically.",
    width / 2,
    height / 2 + 24
  );


  context.restore();

}
