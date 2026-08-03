/* =========================================================
   PAINTLESSUV
   BRUSH LIBRARY
========================================================= */


/*
 * The brush library describes which brushes are available.
 *
 * It does not:
 *
 * - paint onto the texture;
 * - calculate UV coordinates;
 * - process pointer input;
 * - modify the active brush state.
 *
 * Those responsibilities remain in their existing files.
 */


/* =========================================================
   BRUSH CATEGORIES
========================================================= */

export const BRUSH_CATEGORIES =
  Object.freeze(
    {
      PAINT:
        "paint",

      SHAPE:
        "shape",

      STAMP:
        "stamp"
    }
  );


/* =========================================================
   STAMP TYPES
========================================================= */

export const BRUSH_STAMP_TYPES =
  Object.freeze(
    {
      CIRCLE:
        "circle",

      SQUARE:
        "square",

      DIAMOND:
        "diamond",

      LINE:
        "line",

      IMAGE:
        "image",

      PROCEDURAL:
        "procedural"
    }
  );


/* =========================================================
   BUILT-IN BRUSH PRESETS
========================================================= */

const BUILT_IN_BRUSHES =
  [
    /* =====================================================
       PAINT BRUSHES
    ===================================================== */

    {
      id:
        "hard-brush",

      name:
        "Hard Brush",

      description:
        "A solid round brush with a crisp edge.",

      category:
        BRUSH_CATEGORIES.PAINT,

      stampType:
        BRUSH_STAMP_TYPES.CIRCLE,

      thumbnail:
        "hard-circle",

      defaults:
        {
          size:
            48,

          opacity:
            1,

          hardness:
            1,

          spacing:
            0.12,

          rotation:
            0,

          rotateWithStroke:
            false,

          randomRotation:
            false,

          scaleJitter:
            0
        }
    },


    {
      id:
        "soft-brush",

      name:
        "Soft Brush",

      description:
        "A smooth round brush with a feathered edge.",

      category:
        BRUSH_CATEGORIES.PAINT,

      stampType:
        BRUSH_STAMP_TYPES.CIRCLE,

      thumbnail:
        "soft-circle",

      defaults:
        {
          size:
            72,

          opacity:
            0.65,

          hardness:
            0.18,

          spacing:
            0.08,

          rotation:
            0,

          rotateWithStroke:
            false,

          randomRotation:
            false,

          scaleJitter:
            0
        }
    },


    {
      id:
        "pencil",

      name:
        "Pencil",

      description:
        "A small, precise brush for fine details.",

      category:
        BRUSH_CATEGORIES.PAINT,

      stampType:
        BRUSH_STAMP_TYPES.CIRCLE,

      thumbnail:
        "pencil",

      defaults:
        {
          size:
            8,

          opacity:
            1,

          hardness:
            1,

          spacing:
            0.08,

          rotation:
            0,

          rotateWithStroke:
            false,

          randomRotation:
            false,

          scaleJitter:
            0
        }
    },


    {
      id:
        "marker",

      name:
        "Marker",

      description:
        "A broad paint marker with a firm edge.",

      category:
        BRUSH_CATEGORIES.PAINT,

      stampType:
        BRUSH_STAMP_TYPES.CIRCLE,

      thumbnail:
        "marker",

      defaults:
        {
          size:
            58,

          opacity:
            0.78,

          hardness:
            0.92,

          spacing:
            0.1,

          rotation:
            0,

          rotateWithStroke:
            false,

          randomRotation:
            false,

          scaleJitter:
            0
        }
    },


    {
      id:
        "airbrush",

      name:
        "Airbrush",

      description:
        "A very soft brush for gradual colour buildup.",

      category:
        BRUSH_CATEGORIES.PAINT,

      stampType:
        BRUSH_STAMP_TYPES.CIRCLE,

      thumbnail:
        "airbrush",

      defaults:
        {
          size:
            110,

          opacity:
            0.18,

          hardness:
            0,

          spacing:
            0.06,

          rotation:
            0,

          rotateWithStroke:
            false,

          randomRotation:
            false,

          scaleJitter:
            0
        }
    },


    /* =====================================================
       SHAPE BRUSHES
    ===================================================== */

    {
      id:
        "square-brush",

      name:
        "Square",

      description:
        "A solid square brush with adjustable rotation.",

      category:
        BRUSH_CATEGORIES.SHAPE,

      stampType:
        BRUSH_STAMP_TYPES.SQUARE,

      thumbnail:
        "square",

      defaults:
        {
          size:
            48,

          opacity:
            1,

          hardness:
            1,

          spacing:
            0.18,

          rotation:
            0,

          rotateWithStroke:
            false,

          randomRotation:
            false,

          scaleJitter:
            0
        }
    },


    {
      id:
        "diamond-brush",

      name:
        "Diamond",

      description:
        "A square stamp rotated into a diamond shape.",

      category:
        BRUSH_CATEGORIES.SHAPE,

      stampType:
        BRUSH_STAMP_TYPES.DIAMOND,

      thumbnail:
        "diamond",

      defaults:
        {
          size:
            48,

          opacity:
            1,

          hardness:
            1,

          spacing:
            0.22,

          rotation:
            0,

          rotateWithStroke:
            false,

          randomRotation:
            false,

          scaleJitter:
            0
        }
    },


    {
      id:
        "calligraphy-brush",

      name:
        "Calligraphy",

      description:
        "An angled line-shaped brush that can follow the stroke.",

      category:
        BRUSH_CATEGORIES.SHAPE,

      stampType:
        BRUSH_STAMP_TYPES.LINE,

      thumbnail:
        "calligraphy",

      aspectRatio:
        0.24,

      defaults:
        {
          size:
            54,

          opacity:
            1,

          hardness:
            1,

          spacing:
            0.1,

          rotation:
            35,

          rotateWithStroke:
            false,

          randomRotation:
            false,

          scaleJitter:
            0
        }
    }
  ];


/* =========================================================
   INTERNAL LOOKUP
========================================================= */

const brushLookup =
  new Map(
    BUILT_IN_BRUSHES.map(
      (
        brush
      ) => [
        brush.id,
        freezeBrushDefinition(
          brush
        )
      ]
    )
  );


/* =========================================================
   READ ENTIRE LIBRARY
========================================================= */

/**
 * Return every available brush definition.
 *
 * Fresh copies are returned so callers cannot modify the
 * internal library.
 *
 * @returns {Array<Object>}
 */
export function getBrushLibrary() {

  return Array.from(
    brushLookup.values(),
    cloneBrushDefinition
  );

}


/* =========================================================
   READ ONE BRUSH
========================================================= */

/**
 * Find one brush preset by its identifier.
 *
 * @param {string} presetId
 * @returns {Object|null}
 */
export function getBrushPreset(
  presetId
) {

  const safeId =
    normalisePresetId(
      presetId
    );


  if (
    !safeId
  ) {

    return null;

  }


  const brush =
    brushLookup.get(
      safeId
    );


  return brush
    ? cloneBrushDefinition(
        brush
      )
    : null;

}


/* =========================================================
   READ BY CATEGORY
========================================================= */

/**
 * Return every brush belonging to one category.
 *
 * @param {string} category
 * @returns {Array<Object>}
 */
export function getBrushesByCategory(
  category
) {

  const safeCategory =
    String(
      category ||
      ""
    )
      .trim()
      .toLowerCase();


  if (
    !safeCategory
  ) {

    return [];

  }


  return Array.from(
    brushLookup.values()
  )
    .filter(
      (
        brush
      ) =>
        brush.category ===
        safeCategory
    )
    .map(
      cloneBrushDefinition
    );

}


/* =========================================================
   CHECK PRESET
========================================================= */

/**
 * Check whether a preset exists.
 *
 * @param {string} presetId
 * @returns {boolean}
 */
export function hasBrushPreset(
  presetId
) {

  const safeId =
    normalisePresetId(
      presetId
    );


  return Boolean(
    safeId &&
    brushLookup.has(
      safeId
    )
  );

}


/* =========================================================
   PRESET DEFAULTS
========================================================= */

/**
 * Return the brush-state values belonging to a preset.
 *
 * @param {string} presetId
 * @returns {Object|null}
 */
export function getBrushPresetDefaults(
  presetId
) {

  const brush =
    getBrushPreset(
      presetId
    );


  if (
    !brush
  ) {

    return null;

  }


  return {
    preset:
      brush.id,

    ...brush.defaults
  };

}


/* =========================================================
   DEFAULT PRESET
========================================================= */

export function getDefaultBrushPreset() {

  return getBrushPreset(
    "hard-brush"
  );

}


/* =========================================================
   INTERNAL HELPERS
========================================================= */

function normalisePresetId(
  presetId
) {

  return String(
    presetId ||
    ""
  )
    .trim()
    .toLowerCase();

}


function freezeBrushDefinition(
  brush
) {

  const frozenDefaults =
    Object.freeze(
      {
        ...brush.defaults
      }
    );


  return Object.freeze(
    {
      ...brush,

      defaults:
        frozenDefaults
    }
  );

}


function cloneBrushDefinition(
  brush
) {

  return {
    ...brush,

    defaults:
      {
        ...brush.defaults
      }
  };

}
