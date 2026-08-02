import {
  updatePaintTexture
}
from "./texture.js";


/* =========================================================
   PAINTLESSUV
   TEXTURE PAINTER
========================================================= */


/* =========================================================
   PAINTER STATE
========================================================= */

const painterState = {

  canvas:
    null,

  context:
    null,

  texture:
    null,

  painting:
    false,

  lastX:
    0,

  lastY:
    0,

  colour:
    "#a84cff",

  size:
    24,

  opacity:
    1,

  hardness:
    0.85

};


/* =========================================================
   INITIALISE PAINTER
========================================================= */

/**
 * Connect the painter to a canvas-backed Three.js texture.
 *
 * @param {Object} paintTexture
 * @param {HTMLCanvasElement} paintTexture.canvas
 * @param {CanvasRenderingContext2D} paintTexture.context
 * @param {THREE.CanvasTexture} paintTexture.texture
 */
export function initialisePainter(
  paintTexture
) {

  if (
    !paintTexture?.canvas ||
    !paintTexture?.context ||
    !paintTexture?.texture
  ) {

    throw new Error(
      "PaintlessUV could not initialise the texture painter."
    );

  }


  painterState.canvas =
    paintTexture.canvas;

  painterState.context =
    paintTexture.context;

  painterState.texture =
    paintTexture.texture;

  painterState.painting =
    false;


  return getPainterState();

}


/* =========================================================
   PAINT STROKE
========================================================= */

/**
 * Begin a paint stroke at texture coordinates.
 *
 * @param {number} x
 * @param {number} y
 */
export function beginPaintStroke(
  x,
  y
) {

  if (
    !isPainterReady()
  ) {

    return false;

  }


  painterState.painting =
    true;

  painterState.lastX =
    x;

  painterState.lastY =
    y;


  paintDot(
    x,
    y
  );


  return true;

}


/**
 * Continue the active paint stroke.
 *
 * @param {number} x
 * @param {number} y
 */
export function continuePaintStroke(
  x,
  y
) {

  if (
    !isPainterReady() ||
    !painterState.painting
  ) {

    return false;

  }


  paintLine(
    painterState.lastX,
    painterState.lastY,
    x,
    y
  );


  painterState.lastX =
    x;

  painterState.lastY =
    y;


  return true;

}


/**
 * Finish the active paint stroke.
 */
export function endPaintStroke() {

  painterState.painting =
    false;


  if (
    painterState.texture
  ) {

    updatePaintTexture(
      painterState.texture
    );

  }

}


/* =========================================================
   DRAWING
========================================================= */

function paintDot(
  x,
  y
) {

  const context =
    painterState.context;


  context.save();

  configureContext(
    context
  );


  context.beginPath();

  context.arc(
    x,
    y,
    painterState.size / 2,
    0,
    Math.PI * 2
  );

  context.fill();


  context.restore();


  updatePaintTexture(
    painterState.texture
  );

}


function paintLine(
  startX,
  startY,
  endX,
  endY
) {

  const context =
    painterState.context;


  context.save();

  configureContext(
    context
  );


  context.beginPath();

  context.moveTo(
    startX,
    startY
  );

  context.lineTo(
    endX,
    endY
  );

  context.stroke();


  context.restore();


  updatePaintTexture(
    painterState.texture
  );

}


function configureContext(
  context
) {

  context.globalAlpha =
    painterState.opacity;

  context.globalCompositeOperation =
    "source-over";

  context.fillStyle =
    painterState.colour;

  context.strokeStyle =
    painterState.colour;

  context.lineWidth =
    painterState.size;

  context.lineCap =
    "round";

  context.lineJoin =
    "round";

}


/* =========================================================
   PAINTER SETTINGS
========================================================= */

export function setPainterColour(
  colour
) {

  if (
    typeof colour !==
      "string"
  ) {

    return;

  }


  painterState.colour =
    colour;

}


export function setPainterSize(
  size
) {

  const numericSize =
    Number(
      size
    );


  if (
    !Number.isFinite(
      numericSize
    )
  ) {

    return;

  }


  painterState.size =
    Math.min(
      512,
      Math.max(
        1,
        numericSize
      )
    );

}


export function setPainterOpacity(
  opacity
) {

  const numericOpacity =
    Number(
      opacity
    );


  if (
    !Number.isFinite(
      numericOpacity
    )
  ) {

    return;

  }


  painterState.opacity =
    Math.min(
      1,
      Math.max(
        0.01,
        numericOpacity
      )
    );

}


/* =========================================================
   PAINTER STATUS
========================================================= */

export function isPainterReady() {

  return Boolean(
    painterState.canvas &&
    painterState.context &&
    painterState.texture
  );

}


export function getPainterState() {

  return {
    canvas:
      painterState.canvas,

    context:
      painterState.context,

    texture:
      painterState.texture,

    painting:
      painterState.painting,

    colour:
      painterState.colour,

    size:
      painterState.size,

    opacity:
      painterState.opacity,

    hardness:
      painterState.hardness
  };

}
