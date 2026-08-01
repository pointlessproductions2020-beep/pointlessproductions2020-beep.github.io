/* =========================================================
   PAINTLESSUV
   UV CACHE
========================================================= */

let cachedCanvas =
  null;

let cachedContext =
  null;


/* =========================================================
   PREPARE CACHE
========================================================= */

export function prepareUVCache(
  width,
  height
) {

  const safeWidth =
    Math.max(
      1,
      Math.round(
        width
      )
    );

  const safeHeight =
    Math.max(
      1,
      Math.round(
        height
      )
    );


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
    !cachedContext
  ) {

    throw new Error(
      "PaintlessUV could not create the UV cache."
    );

  }


  if (
    cachedCanvas.width !==
      safeWidth ||
    cachedCanvas.height !==
      safeHeight
  ) {

    cachedCanvas.width =
      safeWidth;

    cachedCanvas.height =
      safeHeight;

  }


  cachedContext.setTransform(
    1,
    0,
    0,
    1,
    0,
    0
  );

  cachedContext.clearRect(
    0,
    0,
    safeWidth,
    safeHeight
  );


  return {
    canvas:
      cachedCanvas,

    context:
      cachedContext
  };

}


/* =========================================================
   READ CACHE
========================================================= */

export function getUVCacheCanvas() {

  return cachedCanvas;

}


export function getUVCacheContext() {

  return cachedContext;

}


/* =========================================================
   CACHE STATUS
========================================================= */

export function hasUVCache() {

  return Boolean(
    cachedCanvas &&
    cachedCanvas.width >
      0 &&
    cachedCanvas.height >
      0
  );

}


/* =========================================================
   CLEAR CACHE
========================================================= */

export function clearUVCache() {

  if (
    !cachedCanvas ||
    !cachedContext
  ) {

    return;

  }


  cachedContext.setTransform(
    1,
    0,
    0,
    1,
    0,
    0
  );

  cachedContext.clearRect(
    0,
    0,
    cachedCanvas.width,
    cachedCanvas.height
  );

}
