/* =========================================================
   PAINTLESSUV
   BRUSH STATE
========================================================= */


/* =========================================================
   DEFAULT SETTINGS
========================================================= */

const DEFAULT_BRUSH_STATE = {

  preset:
    "hard-brush",

  colour:
    "#a84cff",

  size:
    48,

  opacity:
    1,

  hardness:
    0.85,

  spacing:
    0.2,

  rotation:
    0,

  rotateWithStroke:
    false,

  randomRotation:
    false,

  scaleJitter:
    0

};


/* =========================================================
   ACTIVE STATE
========================================================= */

const brushState =
  {
    ...DEFAULT_BRUSH_STATE
  };


/* =========================================================
   READ STATE
========================================================= */

export function getBrushState() {

  return {
    ...brushState
  };

}


/* =========================================================
   UPDATE MULTIPLE SETTINGS
========================================================= */

export function updateBrushState(
  updates = {}
) {

  if (
    !updates ||
    typeof updates !==
      "object"
  ) {

    return getBrushState();

  }


  if (
    "preset" in updates
  ) {

    setBrushPreset(
      updates.preset
    );

  }


  if (
    "colour" in updates
  ) {

    setBrushColour(
      updates.colour
    );

  }


  if (
    "size" in updates
  ) {

    setBrushSize(
      updates.size
    );

  }


  if (
    "opacity" in updates
  ) {

    setBrushOpacity(
      updates.opacity
    );

  }


  if (
    "hardness" in updates
  ) {

    setBrushHardness(
      updates.hardness
    );

  }


  if (
    "spacing" in updates
  ) {

    setBrushSpacing(
      updates.spacing
    );

  }


  if (
    "rotation" in updates
  ) {

    setBrushRotation(
      updates.rotation
    );

  }


  if (
    "rotateWithStroke" in updates
  ) {

    setRotateWithStroke(
      updates.rotateWithStroke
    );

  }


  if (
    "randomRotation" in updates
  ) {

    setRandomRotation(
      updates.randomRotation
    );

  }


  if (
    "scaleJitter" in updates
  ) {

    setScaleJitter(
      updates.scaleJitter
    );

  }


  dispatchBrushStateChange();


  return getBrushState();

}


/* =========================================================
   PRESET
========================================================= */

export function setBrushPreset(
  preset
) {

  const safePreset =
    String(
      preset ||
      ""
    )
      .trim()
      .toLowerCase();


  if (
    !safePreset
  ) {

    return;

  }


  brushState.preset =
    safePreset;

}


/* =========================================================
   COLOUR
========================================================= */

export function setBrushColour(
  colour
) {

  if (
    typeof colour !==
      "string" ||
    !colour.trim()
  ) {

    return;

  }


  brushState.colour =
    colour.trim();

}


/* =========================================================
   SIZE
========================================================= */

export function setBrushSize(
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


  brushState.size =
    Math.min(
      1024,
      Math.max(
        1,
        numericSize
      )
    );

}


/* =========================================================
   OPACITY
========================================================= */

export function setBrushOpacity(
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


  brushState.opacity =
    Math.min(
      1,
      Math.max(
        0.01,
        numericOpacity
      )
    );

}


/* =========================================================
   HARDNESS
========================================================= */

export function setBrushHardness(
  hardness
) {

  const numericHardness =
    Number(
      hardness
    );


  if (
    !Number.isFinite(
      numericHardness
    )
  ) {

    return;

  }


  brushState.hardness =
    Math.min(
      1,
      Math.max(
        0,
        numericHardness
      )
    );

}


/* =========================================================
   SPACING
========================================================= */

export function setBrushSpacing(
  spacing
) {

  const numericSpacing =
    Number(
      spacing
    );


  if (
    !Number.isFinite(
      numericSpacing
    )
  ) {

    return;

  }


  brushState.spacing =
    Math.min(
      4,
      Math.max(
        0.01,
        numericSpacing
      )
    );

}


/* =========================================================
   ROTATION
========================================================= */

export function setBrushRotation(
  rotation
) {

  const numericRotation =
    Number(
      rotation
    );


  if (
    !Number.isFinite(
      numericRotation
    )
  ) {

    return;

  }


  brushState.rotation =
    normaliseDegrees(
      numericRotation
    );

}


/* =========================================================
   BOOLEAN OPTIONS
========================================================= */

export function setRotateWithStroke(
  enabled
) {

  brushState.rotateWithStroke =
    Boolean(
      enabled
    );

}


export function setRandomRotation(
  enabled
) {

  brushState.randomRotation =
    Boolean(
      enabled
    );

}


/* =========================================================
   SCALE JITTER
========================================================= */

export function setScaleJitter(
  amount
) {

  const numericAmount =
    Number(
      amount
    );


  if (
    !Number.isFinite(
      numericAmount
    )
  ) {

    return;

  }


  brushState.scaleJitter =
    Math.min(
      1,
      Math.max(
        0,
        numericAmount
      )
    );

}


/* =========================================================
   RESET
========================================================= */

export function resetBrushState() {

  Object.assign(
    brushState,
    DEFAULT_BRUSH_STATE
  );


  dispatchBrushStateChange();


  return getBrushState();

}


/* =========================================================
   CHANGE EVENT
========================================================= */

export function notifyBrushStateChanged() {

  dispatchBrushStateChange();

}


function dispatchBrushStateChange() {

  document.dispatchEvent(
    new CustomEvent(
      "paintlessuv:brushchange",
      {
        detail:
          getBrushState()
      }
    )
  );

}


/* =========================================================
   HELPERS
========================================================= */

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
