/* =========================================================
   PAINTLESSUV
   UV VIEWER
========================================================= */

export const uvView = {

  zoom: 1,

  minZoom: 0.25,

  maxZoom: 20,

  offsetX: 0,

  offsetY: 0,

  dragging: false,

  lastX: 0,

  lastY: 0

};


/* =========================================================
   INITIALISE
========================================================= */

export function initialiseUVViewer(
  canvas,
  redraw
) {

  canvas.addEventListener(
    "wheel",
    (event) => {

      event.preventDefault();

      const direction =
        event.deltaY < 0
          ? 1.1
          : 0.9;

      uvView.zoom *=
        direction;

      uvView.zoom =
        Math.min(
          uvView.maxZoom,
          Math.max(
            uvView.minZoom,
            uvView.zoom
          )
        );

      redraw();

    },
    {
      passive: false
    }
  );

}
