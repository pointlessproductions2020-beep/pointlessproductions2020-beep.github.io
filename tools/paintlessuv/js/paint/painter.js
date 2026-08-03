import {
  updatePaintTexture
}
from "./texture.js";

import {
  getBrushState,
  setBrushColour,
  setBrushSize,
  setBrushOpacity,
  setBrushHardness,
  setBrushSpacing
}
from "./brush-state.js";


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

  strokeDistance:
    0

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
 * @returns {Object}
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

  painterState.lastX =
    0;

  painterState.lastY =
    0;

  painterState.strokeDistance =
    0;


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
 * @returns {boolean}
 */
export function beginPaintStroke(
  x,
  y
) {

  if (
    !isPainterReady() ||
    !isValidCoordinate(
      x
    ) ||
    !isValidCoordinate(
      y
    )
  ) {

    return false;

  }


  painterState.painting =
    true;

  painterState.lastX =
    x;

  painterState.lastY =
    y;

  painterState.strokeDistance =
    0;


  paintStamp(
    x,
    y
  );


  updatePaintTexture(
    painterState.texture
  );


  return true;

}


/**
 * Continue the active paint stroke.
 *
 * The stroke is made from repeated brush stamps rather than
 * one canvas line. This allows hardness, spacing and future
 * shape brushes to use the same painting pipeline.
 *
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
export function continuePaintStroke(
  x,
  y
) {

  if (
    !isPainterReady() ||
    !painterState.painting ||
    !isValidCoordinate(
      x
    ) ||
    !isValidCoordinate(
      y
    )
  ) {

    return false;

  }


  paintStampLine(
    painterState.lastX,
    painterState.lastY,
    x,
    y
  );


  painterState.lastX =
    x;

  painterState.lastY =
    y;


  updatePaintTexture(
    painterState.texture
  );


  return true;

}


/**
 * Finish the active paint stroke.
 */
export function endPaintStroke() {

  painterState.painting =
    false;

  painterState.strokeDistance =
    0;


  if (
    painterState.texture
  ) {

    updatePaintTexture(
      painterState.texture
    );

  }

}


/* =========================================================
   STAMP LINE
========================================================= */

function paintStampLine(
  startX,
  startY,
  endX,
  endY
) {

  const brush =
    getBrushState();

  const deltaX =
    endX -
    startX;

  const deltaY =
    endY -
    startY;

  const segmentDistance =
    Math.hypot(
      deltaX,
      deltaY
    );


  if (
    segmentDistance <=
      Number.EPSILON
  ) {

    return;

  }


  /*
   * Spacing is stored as a proportion of brush size.
   *
   * Example:
   * size 100 and spacing 0.2 = one stamp every 20 pixels.
   */

  const stampSpacing =
    Math.max(
      1,
      brush.size *
      brush.spacing
    );


  const directionX =
    deltaX /
    segmentDistance;

  const directionY =
    deltaY /
    segmentDistance;


  let distanceAlongSegment =
    stampSpacing -
    painterState.strokeDistance;


  while (
    distanceAlongSegment <=
    segmentDistance
  ) {

    const stampX =
      startX +
      directionX *
      distanceAlongSegment;

    const stampY =
      startY +
      directionY *
      distanceAlongSegment;


    paintStamp(
      stampX,
      stampY
    );


    distanceAlongSegment +=
      stampSpacing;

  }


  painterState.strokeDistance =
    (
      painterState.strokeDistance +
      segmentDistance
    ) %
    stampSpacing;

}


/* =========================================================
   PAINT STAMP
========================================================= */

function paintStamp(
  x,
  y
) {

  const context =
    painterState.context;

  const brush =
    getBrushState();


  if (
    !context
  ) {

    return;

  }


  const radius =
    Math.max(
      0.5,
      brush.size /
      2
    );


  context.save();

  context.globalAlpha =
    brush.opacity;

  context.globalCompositeOperation =
    "source-over";


  /*
   * A hardness of 1 produces a solid circular brush.
   * Lower hardness values produce a radial fade.
   */

  if (
    brush.hardness >=
      0.999
  ) {

    paintHardCircle(
      context,
      x,
      y,
      radius,
      brush.colour
    );

  } else {

    paintSoftCircle(
      context,
      x,
      y,
      radius,
      brush.colour,
      brush.hardness
    );

  }


  context.restore();

}


/* =========================================================
   HARD CIRCLE
========================================================= */

function paintHardCircle(
  context,
  x,
  y,
  radius,
  colour
) {

  context.fillStyle =
    colour;


  context.beginPath();

  context.arc(
    x,
    y,
    radius,
    0,
    Math.PI *
    2
  );

  context.fill();

}


/* =========================================================
   SOFT CIRCLE
========================================================= */

function paintSoftCircle(
  context,
  x,
  y,
  radius,
  colour,
  hardness
) {

  const safeHardness =
    Math.min(
      1,
      Math.max(
        0,
        hardness
      )
    );


  /*
   * The inner radius remains fully coloured.
   * The outer region fades smoothly to transparency.
   */

  const innerRadius =
    radius *
    safeHardness;


  const gradient =
    context.createRadialGradient(
      x,
      y,
      innerRadius,
      x,
      y,
      radius
    );


  gradient.addColorStop(
    0,
    colour
  );


  /*
   * Keep the solid centre stable before beginning the fade.
   */

  if (
    safeHardness >
      0
  ) {

    gradient.addColorStop(
      Math.min(
        0.999,
        safeHardness
      ),
      colour
    );

  }


  gradient.addColorStop(
    1,
    colourToTransparent(
      colour
    )
  );


  context.fillStyle =
    gradient;


  context.beginPath();

  context.arc(
    x,
    y,
    radius,
    0,
    Math.PI *
    2
  );

  context.fill();

}


/* =========================================================
   PAINTER SETTINGS
========================================================= */

/**
 * Preserve the existing painter API while routing all settings
 * into the new shared brush state.
 */

export function setPainterColour(
  colour
) {

  setBrushColour(
    colour
  );

}


export function setPainterSize(
  size
) {

  setBrushSize(
    size
  );

}


export function setPainterOpacity(
  opacity
) {

  setBrushOpacity(
    opacity
  );

}


export function setPainterHardness(
  hardness
) {

  setBrushHardness(
    hardness
  );

}


export function setPainterSpacing(
  spacing
) {

  setBrushSpacing(
    spacing
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

  const brush =
    getBrushState();


  return {

    canvas:
      painterState.canvas,

    context:
      painterState.context,

    texture:
      painterState.texture,

    painting:
      painterState.painting,

    lastX:
      painterState.lastX,

    lastY:
      painterState.lastY,

    strokeDistance:
      painterState.strokeDistance,

    preset:
      brush.preset,

    colour:
      brush.colour,

    size:
      brush.size,

    opacity:
      brush.opacity,

    hardness:
      brush.hardness,

    spacing:
      brush.spacing,

    rotation:
      brush.rotation,

    rotateWithStroke:
      brush.rotateWithStroke,

    randomRotation:
      brush.randomRotation,

    scaleJitter:
      brush.scaleJitter

  };

}


/* =========================================================
   COLOUR HELPERS
========================================================= */

function colourToTransparent(
  colour
) {

  const normalisedColour =
    String(
      colour ||
      ""
    ).trim();


  if (
    /^#[0-9a-f]{6}$/i.test(
      normalisedColour
    )
  ) {

    return `${normalisedColour}00`;

  }


  if (
    /^#[0-9a-f]{3}$/i.test(
      normalisedColour
    )
  ) {

    const red =
      normalisedColour[1];

    const green =
      normalisedColour[2];

    const blue =
      normalisedColour[3];


    return `#${red}${red}${green}${green}${blue}${blue}00`;

  }


  /*
   * The PaintlessUV colour picker will supply hexadecimal
   * colours. Use transparent black only as a safe fallback.
   */

  return "rgba(0, 0, 0, 0)";

}

/* =========================================================
   VALIDATION
========================================================= */

function isValidCoordinate(
  value
) {

  return Number.isFinite(
    Number(
      value
    )
  );

}
