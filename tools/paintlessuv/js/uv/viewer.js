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
   INITIALISE
========================================================= */

export function initialiseUVViewer(
  canvas
) {

  if (
    !canvas
  ) {

    console.warn(
      "PaintlessUV could not initialise the UV viewer."
    );

    return;

  }


  /*
   * Important:
   * This temporary safe version does not redraw the UV canvas.
   *
   * The dragon UV contains tens of thousands of triangles.
   * Rebuilding all of them on every wheel event caused the
   * browser and 3D viewport to lag.
   *
   * We will connect zoom and pan to a cached UV image next.
   */

  canvas.addEventListener(
    "wheel",
    preventBrowserScroll,
    {
      passive:
        false
    }
  );

}


/* =========================================================
   PREVENT PAGE SCROLL
========================================================= */

function preventBrowserScroll(
  event
) {

  event.preventDefault();

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

}
