/* =========================================================
   PAINTLESSUV
   UV VIEWER
========================================================= */


/* =========================================================
   VIEW STATE
========================================================= */

export const uvView = {

  zoom:
    1,

  minZoom:
    0.25,

  maxZoom:
    20,

  offsetX:
    0,

  offsetY:
    0,

  dragging:
    false,

  lastX:
    0,

  lastY:
    0

};


/* =========================================================
   INTERNAL STATE
========================================================= */

let activeCanvas =
  null;

let redrawCallback =
  null;

let animationFrame =
  null;

let cleanupViewer =
  null;


/* =========================================================
   INITIALISE
========================================================= */

export function initialiseUVViewer(
  canvas,
  redraw
) {

  if (
    !canvas ||
    typeof redraw !==
      "function"
  ) {

    console.warn(
      "PaintlessUV could not initialise the UV viewer."
    );

    return;

  }


  /*
   * Remove old listeners before attaching new ones.
   * This prevents duplicate zoom and pan events.
   */

  if (
    cleanupViewer
  ) {

    cleanupViewer();

  }


  activeCanvas =
    canvas;

  redrawCallback =
    redraw;


  activeCanvas.addEventListener(
    "wheel",
    handleWheel,
    {
      passive:
        false
    }
  );


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
    "contextmenu",
    preventContextMenu
  );


  cleanupViewer =
    () => {

      activeCanvas?.removeEventListener(
        "wheel",
        handleWheel
      );

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
        "contextmenu",
        preventContextMenu
      );

    };


  scheduleRedraw();

}


/* =========================================================
   WHEEL ZOOM
========================================================= */

function handleWheel(
  event
) {

  event.preventDefault();


  if (
    !activeCanvas
  ) {

    return;

  }


  const rectangle =
    activeCanvas.getBoundingClientRect();


  const pointerX =
    event.clientX -
    rectangle.left;

  const pointerY =
    event.clientY -
    rectangle.top;


  const previousZoom =
    uvView.zoom;


  const zoomMultiplier =
    event.deltaY < 0
      ? 1.12
      : 1 / 1.12;


  const nextZoom =
    clamp(
      previousZoom *
        zoomMultiplier,

      uvView.minZoom,

      uvView.maxZoom
    );


  if (
    nextZoom ===
    previousZoom
  ) {

    return;

  }


  /*
   * Calculate which point in the cached UV image is currently
   * underneath the pointer, then keep that point stationary.
   */

  const imageX =
    (
      pointerX -
      uvView.offsetX
    ) /
    previousZoom;

  const imageY =
    (
      pointerY -
      uvView.offsetY
    ) /
    previousZoom;


  uvView.zoom =
    nextZoom;


  uvView.offsetX =
    pointerX -
    imageX *
      nextZoom;

  uvView.offsetY =
    pointerY -
    imageY *
      nextZoom;


  scheduleRedraw();

}


/* =========================================================
   POINTER PAN
========================================================= */

function handlePointerDown(
  event
) {

  if (
    !activeCanvas
  ) {

    return;

  }


  /*
   * Middle mouse button pans.
   * Right mouse is also accepted for users without a wheel.
   */

  const isPanButton =
    event.button === 1 ||
    event.button === 2;


  if (
    !isPanButton
  ) {

    return;

  }


  event.preventDefault();


  uvView.dragging =
    true;

  uvView.lastX =
    event.clientX;

  uvView.lastY =
    event.clientY;


  activeCanvas.setPointerCapture(
    event.pointerId
  );


  activeCanvas.style.cursor =
    "grabbing";

}


function handlePointerMove(
  event
) {

  if (
    !uvView.dragging
  ) {

    return;

  }


  event.preventDefault();


  const movementX =
    event.clientX -
    uvView.lastX;

  const movementY =
    event.clientY -
    uvView.lastY;


  uvView.offsetX +=
    movementX;

  uvView.offsetY +=
    movementY;


  uvView.lastX =
    event.clientX;

  uvView.lastY =
    event.clientY;


  scheduleRedraw();

}


function handlePointerUp(
  event
) {

  if (
    !uvView.dragging
  ) {

    return;

  }


  uvView.dragging =
    false;


  if (
    activeCanvas?.hasPointerCapture(
      event.pointerId
    )
  ) {

    activeCanvas.releasePointerCapture(
      event.pointerId
    );

  }


  if (
    activeCanvas
  ) {

    activeCanvas.style.cursor =
      "default";

  }

}


/* =========================================================
   REDRAW SCHEDULING
========================================================= */

function scheduleRedraw() {

  if (
    animationFrame !==
    null
  ) {

    return;

  }


  animationFrame =
    requestAnimationFrame(
      () => {

        animationFrame =
          null;

        redrawCallback?.(
          uvView
        );

      }
    );

}


/* =========================================================
   RESET VIEW
========================================================= */

export function resetUVView() {

  uvView.zoom =
    1;

  uvView.offsetX =
    0;

  uvView.offsetY =
    0;

  uvView.dragging =
    false;

  uvView.lastX =
    0;

  uvView.lastY =
    0;


  scheduleRedraw();

}


/* =========================================================
   HELPERS
========================================================= */

function preventContextMenu(
  event
) {

  event.preventDefault();

}


function clamp(
  value,
  minimum,
  maximum
) {

  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );

}
