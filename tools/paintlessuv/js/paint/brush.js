import {
  beginPaintStroke,
  continuePaintStroke,
  endPaintStroke,
  isPainterReady
}
from "./painter.js";


/* =========================================================
   PAINTLESSUV
   BRUSH INPUT
========================================================= */


/* =========================================================
   INTERNAL STATE
========================================================= */

let activeCanvas =
  null;

let cleanupBrush =
  null;


/* =========================================================
   INITIALISE BRUSH
========================================================= */

/**
 * Connect pointer input to a paint canvas.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {Function|null}
 */
export function initialiseBrush(
  canvas
) {

  if (
    !canvas
  ) {

    console.warn(
      "PaintlessUV could not initialise the brush."
    );

    return null;

  }


  if (
    cleanupBrush
  ) {

    cleanupBrush();

  }


  activeCanvas =
    canvas;


  activeCanvas.addEventListener(
    "pointerdown",
    handlePointerDown
  );

  activeCanvas.addEventListener(
    "pointermove",
    handlePointerMove
  );

  activeCanvas.addEventListener(
    "pointerup",
    handlePointerUp
  );

  activeCanvas.addEventListener(
    "pointercancel",
    handlePointerUp
  );

  activeCanvas.addEventListener(
    "pointerleave",
    handlePointerUp
  );


  activeCanvas.style.touchAction =
    "none";


  cleanupBrush =
    () => {

      activeCanvas?.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      activeCanvas?.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      activeCanvas?.removeEventListener(
        "pointerup",
        handlePointerUp
      );

      activeCanvas?.removeEventListener(
        "pointercancel",
        handlePointerUp
      );

      activeCanvas?.removeEventListener(
        "pointerleave",
        handlePointerUp
      );

    };


  return cleanupBrush;

}


/* =========================================================
   POINTER EVENTS
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


  event.preventDefault();


  const point =
    getCanvasPoint(
      event
    );


  activeCanvas.setPointerCapture(
    event.pointerId
  );


  beginPaintStroke(
    point.x,
    point.y
  );

}


function handlePointerMove(
  event
) {

  if (
    !isPainterReady()
  ) {

    return;

  }


  if (
    (
      event.buttons &
      1
    ) !==
    1
  ) {

    return;

  }


  event.preventDefault();


  const point =
    getCanvasPoint(
      event
    );


  continuePaintStroke(
    point.x,
    point.y
  );

}


function handlePointerUp(
  event
) {

  endPaintStroke();


  if (
    activeCanvas?.hasPointerCapture(
      event.pointerId
    )
  ) {

    activeCanvas.releasePointerCapture(
      event.pointerId
    );

  }

}


/* =========================================================
   COORDINATE CONVERSION
========================================================= */

function getCanvasPoint(
  event
) {

  const rectangle =
    activeCanvas.getBoundingClientRect();


  const scaleX =
    activeCanvas.width /
    Math.max(
      1,
      rectangle.width
    );

  const scaleY =
    activeCanvas.height /
    Math.max(
      1,
      rectangle.height
    );


  return {
    x:
      (
        event.clientX -
        rectangle.left
      ) *
      scaleX,

    y:
      (
        event.clientY -
        rectangle.top
      ) *
      scaleY
  };

}
