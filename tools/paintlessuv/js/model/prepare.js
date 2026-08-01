import {
  createPaintTexture
}
from "../paint/texture.js";


/* =========================================================
   PAINTLESSUV
   MODEL PREPARATION
========================================================= */


/**
 * Automatically prepare a loaded model for painting.
 *
 * For now this:
 * - creates a blank paint texture when one is missing;
 * - applies it to all paintable materials;
 * - returns the updated preparation state.
 *
 * @param {Object} loadedModel
 * @param {Object} analysis
 * @param {Object} options
 * @returns {Object}
 */
export function prepareModelForPainting(
  loadedModel,
  analysis,
  {
    textureWidth = 2048,
    textureHeight = 2048,
    background = "#ffffff"
  } = {}
) {

  if (
    !loadedModel?.scene
  ) {

    throw new Error(
      "PaintlessUV cannot prepare an empty model."
    );

  }


  const result = {

    changed:
      false,

    textureCreated:
      false,

    paintTexture:
      null,

    actions:
      [],

    warnings:
      [],

    readyToPaint:
      false

  };


  /*
   * Create a blank paint texture automatically when the
   * imported model does not already contain one.
   */

  if (
    !analysis?.hasTexture
  ) {

    result.actions.push(
      "Creating blank paint texture"
    );


    const paintTexture =
      createPaintTexture(
        loadedModel.scene,
        {
          width:
            textureWidth,

          height:
            textureHeight,

          background
        }
      );


    result.paintTexture =
      paintTexture;

    result.textureCreated =
      true;

    result.changed =
      true;


    result.actions.push(
      `Created ${paintTexture.width} × ${paintTexture.height} paint texture`
    );

    result.actions.push(
      `Applied texture to ${paintTexture.materialCount} material${
        paintTexture.materialCount === 1
          ? ""
          : "s"
      }`
    );

  }


  /*
   * UV generation comes later.
   *
   * We do not pretend the model is ready when UVs are missing.
   */

  if (
    !analysis?.hasUV
  ) {

    result.warnings.push(
      "The model still requires a UV map."
    );

  }


  result.readyToPaint =
    Boolean(
      analysis?.hasUV &&
      (
        analysis?.hasTexture ||
        result.textureCreated
      )
    );


  return result;

}
