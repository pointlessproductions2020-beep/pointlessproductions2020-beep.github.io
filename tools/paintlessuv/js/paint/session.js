import {
  prepareModelForPainting
}
from "../model/prepare.js";

import {
  initialisePainter
}
from "./painter.js";

import {
  initialiseBrush
}
from "./brush.js";


/* =========================================================
   PAINTLESSUV
   PAINT SESSION
========================================================= */


/* =========================================================
   SESSION STATE
========================================================= */

const paintSession = {

  active:
    false,

  loadedModel:
    null,

  analysis:
    null,

  paintTexture:
    null,

  brushCanvas:
    null,

  brushCleanup:
    null

};


/* =========================================================
   START SESSION
========================================================= */

/**
 * Start painting with either:
 *
 * - an existing PaintlessUV paint texture; or
 * - a newly prepared texture when one has not been created yet.
 *
 * @param {Object} options
 * @param {Object} options.loadedModel
 * @param {Object} options.analysis
 * @param {HTMLCanvasElement} options.brushCanvas
 * @param {Object|null} options.paintTexture
 * @param {number} options.textureWidth
 * @param {number} options.textureHeight
 * @param {string} options.background
 * @returns {Object}
 */
export function startPaintSession(
  {
    loadedModel,
    analysis,
    brushCanvas,
    paintTexture = null,
    textureWidth = 2048,
    textureHeight = 2048,
    background = "#ffffff"
  }
) {

  if (
    !loadedModel?.scene
  ) {

    throw new Error(
      "PaintlessUV cannot start painting without a loaded model."
    );

  }


  if (
    !analysis
  ) {

    throw new Error(
      "PaintlessUV cannot start painting before model analysis."
    );

  }


  if (
    !brushCanvas
  ) {

    throw new Error(
      "PaintlessUV cannot start painting without a brush canvas."
    );

  }


  stopPaintSession();


  let preparation =
    null;

  let activePaintTexture =
    paintTexture;


  /*
   * If the Prepare button has already created a texture,
   * reuse it instead of preparing the model a second time.
   */

  if (
    !activePaintTexture
  ) {

    preparation =
      prepareModelForPainting(
        loadedModel,
        analysis,
        {
          textureWidth,
          textureHeight,
          background
        }
      );


    if (
      !preparation.readyToPaint
    ) {

      return {
        success:
          false,

        preparation,

        paintTexture:
          preparation.paintTexture,

        message:
          preparation.warnings?.[0] ||
          "The model is not ready to paint."
      };

    }


    activePaintTexture =
      preparation.paintTexture;

  }


  if (
    !isValidPaintTexture(
      activePaintTexture
    )
  ) {

    return {
      success:
        false,

      preparation,

      paintTexture:
        null,

      message:
        "PaintlessUV could not find a writable paint texture."
    };

  }


  initialisePainter(
    activePaintTexture
  );


  const brushCleanup =
    initialiseBrush(
      brushCanvas
    );


  paintSession.active =
    true;

  paintSession.loadedModel =
    loadedModel;

  paintSession.analysis =
    analysis;

  paintSession.paintTexture =
    activePaintTexture;

  paintSession.brushCanvas =
    brushCanvas;

  paintSession.brushCleanup =
    brushCleanup;


  return {
    success:
      true,

    preparation,

    paintTexture:
      activePaintTexture,

    message:
      "Ready to paint."
  };

}


/* =========================================================
   STOP SESSION
========================================================= */

export function stopPaintSession() {

  if (
    typeof paintSession.brushCleanup ===
      "function"
  ) {

    paintSession.brushCleanup();

  }


  paintSession.active =
    false;

  paintSession.loadedModel =
    null;

  paintSession.analysis =
    null;

  paintSession.paintTexture =
    null;

  paintSession.brushCanvas =
    null;

  paintSession.brushCleanup =
    null;

}


/* =========================================================
   SESSION STATUS
========================================================= */

export function isPaintSessionActive() {

  return paintSession.active;

}


export function getPaintSession() {

  return {
    active:
      paintSession.active,

    loadedModel:
      paintSession.loadedModel,

    analysis:
      paintSession.analysis,

    paintTexture:
      paintSession.paintTexture,

    brushCanvas:
      paintSession.brushCanvas
  };

}


/* =========================================================
   VALIDATE PAINT TEXTURE
========================================================= */

function isValidPaintTexture(
  paintTexture
) {

  return Boolean(
    paintTexture?.canvas &&
    paintTexture?.context &&
    paintTexture?.texture?.isTexture
  );

}
