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


/* =========================================================
   CREATE PAINT TOOL
========================================================= */

/**
 * Create a tool that paints directly onto a 3D model.
 *
 * The mouse position is raycast into the model. Three.js
 * supplies the UV coordinate at the exact surface point hit.
 * That UV coordinate is converted into paint-texture pixels
 * and sent to the existing painter.
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


    /*
     * Painting owns pointer dragging while this tool is active.
     * Orbit and pan resume when their tools are selected.
     */

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


    const texturePoint =
      getTexturePointFromPointer(
        event
      );


    /*
     * Clicking empty space must not begin a brush stroke.
     */

    if (
      !texturePoint
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
      texturePoint.x,
      texturePoint.y
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


    const texturePoint =
      getTexturePointFromPointer(
        event
      );


    /*
     * When the pointer temporarily leaves the model surface,
     * skip that point rather than drawing a line across an
     * unrelated part of the texture.
     */

    if (
      !texturePoint
    ) {

      return;

    }


    continuePaintStroke(
      texturePoint.x,
      texturePoint.y
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
   RAYCAST POINTER INTO MODEL
========================================================= */

  function getTexturePointFromPointer(
    event
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
          candidate.uv
      );


    if (
      !intersection?.uv
    ) {

      return null;

    }


    return convertUVToTexturePoint(
      intersection.uv
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


    /*
     * UV coordinates normally occupy 0–1. Clamp them so tiny
     * floating-point errors cannot paint outside the canvas.
     */

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


    return {

      x:
        u *
        paintCanvas.width,

      /*
       * HTML canvas begins at the top-left, while UV space
       * traditionally begins at the bottom-left.
       */

      y:
        (
          1 -
          v
        ) *
        paintCanvas.height

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
