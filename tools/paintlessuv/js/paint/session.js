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

  brushCleanup:
    null

};


/* =========================================================
   START SESSION
========================================================= */

/**
 * Prepare a loaded model for painting and initialise the
 * painter and brush systems.
 *
 * @param {Object} options
 * @param {Object} options.loadedModel
 * @param {Object} options.analysis
 * @param {HTMLCanvasElement} options.brushCanvas
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


  const preparation =
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


  if (
    !preparation.paintTexture
  ) {

    return {
      success:
        false,

      preparation,

      paintTexture:
        null,

      message:
        "PaintlessUV could not create a paint texture."
    };

  }


  initialisePainter(
    preparation.paintTexture
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
    preparation.paintTexture;

  paintSession.brushCleanup =
    brushCleanup;


  return {
    success:
      true,

    preparation,

    paintTexture:
      preparation.paintTexture,

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
      paintSession.paintTexture
  };

}
