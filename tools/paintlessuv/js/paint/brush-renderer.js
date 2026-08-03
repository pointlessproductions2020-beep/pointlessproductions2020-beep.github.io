import {
  BRUSH_STAMP_TYPES,
  getBrushPreset
}
from "./brush-library.js";


/* =========================================================
   PAINTLESSUV
   BRUSH RENDERER
========================================================= */


/*
 * Draw one brush stamp at an already calculated texture
 * position.
 *
 * This module does not:
 *
 * - calculate UV coordinates;
 * - raycast against the model;
 * - interpolate a stroke;
 * - update the Three.js texture;
 * - process pointer events.
 *
 * It only draws the requested stamp.
 */


/* =========================================================
   DRAW BRUSH STAMP
========================================================= */

/**
 * Draw one brush stamp.
 *
 * @param {CanvasRenderingContext2D} context
 * @param {number} x
 * @param {number} y
 * @param {Object} brush
 * @param {Object} options
 * @param {number} options.strokeAngle
 * @returns {boolean}
 */
export function drawBrushStamp(
  context,
  x,
  y,
  brush,
  {
    strokeAngle =
      0
  } = {}
) {

  if (
    !context ||
    !isFiniteNumber(
      x
    ) ||
    !isFiniteNumber(
      y
    ) ||
    !brush
  ) {

    return false;

  }


  const preset =
    resolveBrushPreset(
      brush
    );


  const stampType =
    preset?.stampType ||
    BRUSH_STAMP_TYPES.CIRCLE;


  const size =
    Math.max(
      1,
      normaliseNumber(
        brush.size,
        preset?.defaults?.size ||
        48
      )
    );


  const opacity =
    clamp(
      normaliseNumber(
        brush.opacity,
        preset?.defaults?.opacity ||
        1
      ),
      0,
      1
    );


  const hardness =
    clamp(
      normaliseNumber(
        brush.hardness,
        preset?.defaults?.hardness ??
        1
      ),
      0,
      1
    );


  const colour =
    normaliseColour(
      brush.colour,
      "#a84cff"
    );


  const rotation =
    calculateStampRotation(
      brush,
      strokeAngle
    );


  const scale =
    calculateStampScale(
      brush
    );


  const finalSize =
    Math.max(
      1,
      size *
      scale
    );


  const aspectRatio =
    clamp(
      normaliseNumber(
        preset?.aspectRatio,
        1
      ),
      0.01,
      10
    );


  context.save();


  context.globalAlpha =
    opacity;

  context.globalCompositeOperation =
    "source-over";


  context.translate(
    x,
    y
  );


  context.rotate(
    degreesToRadians(
      rotation
    )
  );


  drawStampByType(
    context,
    stampType,
    {
      size:
        finalSize,

      hardness,

      colour,

      aspectRatio,

      preset,

      brush
    }
  );


  context.restore();


  return true;

}


/* =========================================================
   STAMP ROUTER
========================================================= */

function drawStampByType(
  context,
  stampType,
  options
) {

  switch (
    stampType
  ) {

    case BRUSH_STAMP_TYPES.SQUARE:

      drawSquareStamp(
        context,
        options
      );

      break;


    case BRUSH_STAMP_TYPES.DIAMOND:

      drawDiamondStamp(
        context,
        options
      );

      break;


    case BRUSH_STAMP_TYPES.LINE:

      drawLineStamp(
        context,
        options
      );

      break;


    case BRUSH_STAMP_TYPES.IMAGE:

      drawUnavailableStamp(
        context,
        options
      );

      break;


    case BRUSH_STAMP_TYPES.PROCEDURAL:

      drawUnavailableStamp(
        context,
        options
      );

      break;


    case BRUSH_STAMP_TYPES.CIRCLE:
    default:

      drawCircleStamp(
        context,
        options
      );

      break;

  }

}


/* =========================================================
   CIRCLE STAMP
========================================================= */

function drawCircleStamp(
  context,
  {
    size,
    hardness,
    colour
  }
) {

  const radius =
    Math.max(
      0.5,
      size /
      2
    );


  if (
    hardness >=
      0.999
  ) {

    context.fillStyle =
      colour;


    context.beginPath();

    context.arc(
      0,
      0,
      radius,
      0,
      Math.PI *
      2
    );

    context.fill();


    return;

  }


  drawSoftCircle(
    context,
    radius,
    colour,
    hardness
  );

}


/* =========================================================
   SOFT CIRCLE
========================================================= */

function drawSoftCircle(
  context,
  radius,
  colour,
  hardness
) {

  const safeHardness =
    clamp(
      hardness,
      0,
      1
    );


  const innerRadius =
    radius *
    safeHardness;


  const gradient =
    context.createRadialGradient(
      0,
      0,
      innerRadius,
      0,
      0,
      radius
    );


  gradient.addColorStop(
    0,
    colour
  );


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
    0,
    0,
    radius,
    0,
    Math.PI *
    2
  );

  context.fill();

}


/* =========================================================
   SQUARE STAMP
========================================================= */

function drawSquareStamp(
  context,
  {
    size,
    colour
  }
) {

  const halfSize =
    size /
    2;


  context.fillStyle =
    colour;


  context.fillRect(
    -halfSize,
    -halfSize,
    size,
    size
  );

}


/* =========================================================
   DIAMOND STAMP
========================================================= */

function drawDiamondStamp(
  context,
  options
) {

  /*
   * A diamond is a square with an additional fixed
   * 45-degree rotation. Manual brush rotation still applies
   * because the parent transform has already been applied.
   */

  context.save();


  context.rotate(
    Math.PI /
    4
  );


  drawSquareStamp(
    context,
    options
  );


  context.restore();

}


/* =========================================================
   LINE / CALLIGRAPHY STAMP
========================================================= */

function drawLineStamp(
  context,
  {
    size,
    colour,
    aspectRatio
  }
) {

  const width =
    size;

  const height =
    Math.max(
      1,
      size *
      aspectRatio
    );


  const halfWidth =
    width /
    2;

  const halfHeight =
    height /
    2;


  context.fillStyle =
    colour;


  drawRoundedRectangle(
    context,
    -halfWidth,
    -halfHeight,
    width,
    height,
    Math.min(
      halfHeight,
      width *
      0.08
    )
  );


  context.fill();

}


/* =========================================================
   UNAVAILABLE STAMP FALLBACK
========================================================= */

function drawUnavailableStamp(
  context,
  options
) {

  /*
   * Image and procedural stamps will receive their own
   * renderers next.
   *
   * Until then, fall back safely to a circular stamp rather
   * than failing or affecting the paint pipeline.
   */

  drawCircleStamp(
    context,
    options
  );

}


/* =========================================================
   ROTATION
========================================================= */

function calculateStampRotation(
  brush,
  strokeAngle
) {

  let rotation =
    normaliseDegrees(
      normaliseNumber(
        brush.rotation,
        0
      )
    );


  /*
   * strokeAngle is supplied in degrees by the painter.
   */

  if (
    brush.rotateWithStroke
  ) {

    rotation +=
      normaliseNumber(
        strokeAngle,
        0
      );

  }


  if (
    brush.randomRotation
  ) {

    rotation +=
      Math.random() *
      360;

  }


  return normaliseDegrees(
    rotation
  );

}


/* =========================================================
   SCALE JITTER
========================================================= */

function calculateStampScale(
  brush
) {

  const jitter =
    clamp(
      normaliseNumber(
        brush.scaleJitter,
        0
      ),
      0,
      1
    );


  if (
    jitter <=
      0
  ) {

    return 1;

  }


  /*
   * A jitter of 0.25 produces a scale between:
   *
   * 0.75 and 1.25.
   */

  const minimumScale =
    Math.max(
      0.05,
      1 -
      jitter
    );

  const maximumScale =
    1 +
    jitter;


  return (
    minimumScale +
    Math.random() *
    (
      maximumScale -
      minimumScale
    )
  );

}


/* =========================================================
   PRESET RESOLUTION
========================================================= */

function resolveBrushPreset(
  brush
) {

  const presetId =
    String(
      brush.preset ||
      "hard-brush"
    )
      .trim()
      .toLowerCase();


  return (
    getBrushPreset(
      presetId
    ) ||
    getBrushPreset(
      "hard-brush"
    )
  );

}


/* =========================================================
   ROUNDED RECTANGLE
========================================================= */

function drawRoundedRectangle(
  context,
  x,
  y,
  width,
  height,
  radius
) {

  const safeRadius =
    Math.max(
      0,
      Math.min(
        radius,
        Math.abs(
          width
        ) /
        2,
        Math.abs(
          height
        ) /
        2
      )
    );


  context.beginPath();

  context.roundRect(
    x,
    y,
    width,
    height,
    safeRadius
  );

}


/* =========================================================
   COLOUR HELPERS
========================================================= */

function normaliseColour(
  colour,
  fallback
) {

  const value =
    String(
      colour ||
      ""
    )
      .trim()
      .toLowerCase();


  if (
    /^#[0-9a-f]{6}$/i.test(
      value
    )
  ) {

    return value;

  }


  if (
    /^#[0-9a-f]{3}$/i.test(
      value
    )
  ) {

    return `#${
      value[1]
    }${
      value[1]
    }${
      value[2]
    }${
      value[2]
    }${
      value[3]
    }${
      value[3]
    }`;

  }


  return fallback;

}


function colourToTransparent(
  colour
) {

  const normalisedColour =
    normaliseColour(
      colour,
      "#000000"
    );


  return `${normalisedColour}00`;

}


/* =========================================================
   NUMBER HELPERS
========================================================= */

function normaliseNumber(
  value,
  fallback
) {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : fallback;

}


function isFiniteNumber(
  value
) {

  return Number.isFinite(
    Number(
      value
    )
  );

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


function normaliseDegrees(
  degrees
) {

  return (
    (
      degrees %
      360
    ) +
    360
  ) %
  360;

}


function degreesToRadians(
  degrees
) {

  return (
    degrees *
    Math.PI
  ) /
  180;

}
