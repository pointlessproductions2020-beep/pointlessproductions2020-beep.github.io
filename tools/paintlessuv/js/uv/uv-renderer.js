/* =========================================================
   PAINTLESSUV
   UV RENDERER
========================================================= */


/**
 * Draw all UV triangles from a loaded Three.js model.
 *
 * @param {THREE.Object3D} modelScene
 * @param {HTMLCanvasElement} canvas
 * @returns {Object}
 */
export function renderUVLayout(
  modelScene,
  canvas
) {

  if (
    !modelScene ||
    !canvas
  ) {

    return {
      meshes:
        0,

      triangles:
        0,

      hasUV:
        false
    };

  }


  const context =
    canvas.getContext(
      "2d"
    );


  if (
    !context
  ) {

    throw new Error(
      "PaintlessUV could not open the UV canvas."
    );

  }


  const width =
    canvas.width;

  const height =
    canvas.height;


  context.clearRect(
    0,
    0,
    width,
    height
  );


  drawCheckerboard(
    context,
    width,
    height
  );


  let meshCount =
    0;

  let triangleCount =
    0;

  let hasUV =
    false;


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


      context.save();

      context.lineWidth =
        1.2;

      context.strokeStyle =
        "rgba(168, 76, 255, 0.95)";

      context.fillStyle =
        "rgba(168, 76, 255, 0.055)";

      context.shadowColor =
        "rgba(168, 76, 255, 0.38)";

      context.shadowBlur =
        3;


      if (
        index
      ) {

        for (
          let indexPosition = 0;
          indexPosition <
          index.count;
          indexPosition += 3
        ) {

          const a =
            index.getX(
              indexPosition
            );

          const b =
            index.getX(
              indexPosition + 1
            );

          const c =
            index.getX(
              indexPosition + 2
            );


          drawUVTriangle(
            context,
            uv,
            a,
            b,
            c,
            width,
            height
          );


          triangleCount +=
            1;

        }

      } else {

        for (
          let vertexPosition = 0;
          vertexPosition + 2 <
          uv.count;
          vertexPosition += 3
        ) {

          drawUVTriangle(
            context,
            uv,
            vertexPosition,
            vertexPosition + 1,
            vertexPosition + 2,
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


  if (
    !hasUV
  ) {

    drawNoUVMessage(
      context,
      width,
      height
    );

  }


  return {

    meshes:
      meshCount,

    triangles:
      triangleCount,

    hasUV

  };

}


/* =========================================================
   DRAW TRIANGLE
========================================================= */

function drawUVTriangle(
  context,
  uv,
  indexA,
  indexB,
  indexC,
  width,
  height
) {

  const pointA =
    uvToCanvasPoint(
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
    uvToCanvasPoint(
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
    uvToCanvasPoint(
      uv.getX(
        indexC
      ),
      uv.getY(
        indexC
      ),
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
   UV TO CANVAS
========================================================= */

function uvToCanvasPoint(
  u,
  v,
  width,
  height
) {

  return {

    x:
      u * width,

    y:
      (1 - v) * height

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

      const alternate =
        (
          x / squareSize +
          y / squareSize
        ) %
        2 ===
        0;


      context.fillStyle =
        alternate
          ? "#d6d6d6"
          : "#eeeeee";


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
    "rgba(12, 8, 18, 0.78)";

  context.fillRect(
    0,
    0,
    width,
    height
  );


  context.fillStyle =
    "#ffffff";

  context.textAlign =
    "center";

  context.textBaseline =
    "middle";

  context.font =
    "700 34px Segoe UI, sans-serif";


  context.fillText(
    "No UV map found",
    width / 2,
    height / 2 - 18
  );


  context.fillStyle =
    "#cbb7da";

  context.font =
    "500 20px Segoe UI, sans-serif";


  context.fillText(
    "PaintlessUV will generate one during preparation.",
    width / 2,
    height / 2 + 24
  );


  context.restore();

}
