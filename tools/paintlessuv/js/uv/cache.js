/* =========================================================
   PAINTLESSUV
   UV CACHE
========================================================= */

let cachedCanvas =
  null;

let cachedContext =
  null;


/**
 * Create or resize the off-screen UV cache.
 *
 * @param {number} width
 * @param {number} height
 * @returns {HTMLCanvasElement}
 */
export function prepareUVCache(
  width,
  height
) {

  if (
    !cachedCanvas
  ) {

    cachedCanvas =
      document.createElement(
        "canvas"
      );

    cachedContext =
      cachedCanvas.getContext(
        "2d"
      );

  }


  if (
    cachedCanvas.width !== width ||
    cachedCanvas.height !== height
  ) {

    cachedCanvas.width =
      width;

    cachedCanvas.height =
      height;

  }


  cachedContext.clearRect(
    0,
    0,
    width,
    height
  );


  return cachedCanvas;

}


/**
 * Get the cached UV canvas.
 *
 * @returns {HTMLCanvasElement|null}
 */
export function getUVCache() {

  return cachedCanvas;

}


/**
 * Get the cached UV drawing context.
 *
 * @returns {CanvasRenderingContext2D|null}
 */
export function getUVCacheContext() {

  return cachedContext;

}
