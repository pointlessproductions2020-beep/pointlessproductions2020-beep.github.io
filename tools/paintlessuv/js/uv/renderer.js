import {
  prepareUVCache,
  getUVCacheCanvas
}
from "./cache.js";


/* =========================================================
   PAINTLESSUV
   UV LAYOUT RENDERER
========================================================= */


/**
 * Build the UV layout once inside an off-screen cache,
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


  const width =
    Math.max(
      1,
      Math.round(
        canvas.clientWidth
      )
    );

  const height =
    Math.max(
      1,
      Math.round(
        canvas.clientHeight
      )
    );


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
    (object) => {

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
        "rgba(125, 30, 225, 0.95)";

      cacheContext.fillStyle =
        "rgba(168, 76, 255, 0.055)";

      cacheContext.lineWidth =
        1.15;

      cacheContext.lineJoin =
        "round";

      cacheContext.lineCap =
        "round";


      /*
       * Draw all triangles as one combined path.
       *
       * This is considerably faster than calling fill()
       * and stroke() separately for every triangle.
       */

      cacheContext.beginPath();


      if (
        index
      ) {

        for (
          let position = 0;
          position + 2 <
            index.count;
          position += 3
        ) {

          addTriangleToPath(
            cacheContext,
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

        }

      } else {

        for (
          let position = 0;
          position + 2 <
            uv.count;
          position += 3
        ) {

          addTriangleToPath(
            cacheContext,
            uv,
            position,
            position + 1,
            position + 2,
            width,
            height
          );


          triangleCount +=
            1;

        }

      }


      cacheContext.fill();

      cacheContext.stroke();

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
   DISPLAY CACHED UV
========================================================= */

/**
 * Copy the already-rendered cache onto the visible canvas.
 *
 * This function does not inspect the model or rebuild any
 * triangles, so it will later be safe for zooming and panning.
 *
 * @param {HTMLCanvasElement} canvas
 */
export function drawCachedUV(
  canvas,
  view = {
    zoom: 1,
    offsetX: 0,
    offsetY: 0
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
      u * width,

    y:
      (1 - v) *
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
    y < height;
    y += squareSize
  ) {

    for (
      let x = 0;
      x < width;
      x += squareSize
    ) {

      const isLight =
        (
          x / squareSize +
          y / squareSize
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
