import { uvView }
from "./viewer.js";

/* =========================================================
   PAINTLESSUV
   UV LAYOUT RENDERER
========================================================= */


/**
 * Draw a model's UV triangles onto the UV canvas.
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
      hasUV: false,
      meshes: 0,
      triangles: 0
    };

  }


  const context =
    canvas.getContext(
      "2d"
    );


  if (!context) {

    throw new Error(
      "PaintlessUV could not access the UV canvas."
    );

  }


const width =
  canvas.width =
  canvas.clientWidth;

const height =
  canvas.height =
  canvas.clientHeight;

  context.clearRect(
    0,
    0,
    width,
    height
  );

   context.save();

context.translate(
  uvView.offsetX,
  uvView.offsetY
);

context.scale(
  uvView.zoom,
  uvView.zoom
);


  drawCheckerboard(
    context,
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


      if (!uv) {

        return;

      }


      hasUV =
        true;

      meshCount +=
        1;


      const index =
        geometry.getIndex();


      context.save();

      context.strokeStyle =
        "rgba(125, 30, 225, 0.95)";

      context.fillStyle =
        "rgba(168, 76, 255, 0.055)";

      context.lineWidth =
        1.15;

      context.lineJoin =
        "round";

      context.lineCap =
        "round";


      if (index) {

        for (
          let position = 0;
          position + 2 < index.count;
          position += 3
        ) {

          drawTriangle(
            context,
            uv,
            index.getX(position),
            index.getX(position + 1),
            index.getX(position + 2),
            width,
            height
          );


          triangleCount +=
            1;

        }

      } else {

        for (
          let position = 0;
          position + 2 < uv.count;
          position += 3
        ) {

          drawTriangle(
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

        }

      }


      context.restore();

    }
  );


  if (!hasUV) {

    drawNoUVMessage(
      context,
      width,
      height
    );

  }

   context.restore();

  return {
    hasUV,
    meshes: meshCount,
    triangles: triangleCount
  };

}


/* =========================================================
   DRAW UV TRIANGLE
========================================================= */

function drawTriangle(
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
      uv.getX(indexA),
      uv.getY(indexA),
      width,
      height
    );

  const pointB =
    convertUVToCanvas(
      uv.getX(indexB),
      uv.getY(indexB),
      width,
      height
    );

  const pointC =
    convertUVToCanvas(
      uv.getX(indexC),
      uv.getY(indexC),
      width,
      height
    );


  context.beginPath();

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

  context.fill();

  context.stroke();

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
    x: u * width,
    y: (1 - v) * height
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
        ) % 2 === 0;


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
