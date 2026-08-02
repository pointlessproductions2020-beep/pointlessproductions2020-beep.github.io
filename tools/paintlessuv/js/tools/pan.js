import * as THREE from "three";


/* =========================================================
   PAINTLESSUV
   PAN TOOL
========================================================= */


/* =========================================================
   CREATE PAN TOOL
========================================================= */

/**
 * PaintlessUV Pan Tool.
 *
 * Uses the left mouse button to pan the camera while keeping
 * wheel zoom available.
 *
 * @param {OrbitControls} controls
 * @returns {Object}
 */
export function createPanTool(
  controls
) {

  if (
    !controls
  ) {

    throw new Error(
      "PaintlessUV Pan Tool requires OrbitControls."
    );

  }


  let previousMouseButtons =
    null;

  let previousEnableRotate =
    true;

  let previousEnablePan =
    true;

  let previousEnableZoom =
    true;


  return {

    activate() {

      previousMouseButtons =
        {
          ...controls.mouseButtons
        };

      previousEnableRotate =
        controls.enableRotate;

      previousEnablePan =
        controls.enablePan;

      previousEnableZoom =
        controls.enableZoom;


      controls.enabled =
        true;

      controls.enableRotate =
        false;

      controls.enablePan =
        true;

      controls.enableZoom =
        true;


      controls.mouseButtons.LEFT =
        THREE.MOUSE.PAN;

      controls.mouseButtons.MIDDLE =
        THREE.MOUSE.DOLLY;

      controls.mouseButtons.RIGHT =
        THREE.MOUSE.PAN;


      console.log(
        "Pan Tool Activated"
      );

    },


    deactivate() {

      controls.enableRotate =
        previousEnableRotate;

      controls.enablePan =
        previousEnablePan;

      controls.enableZoom =
        previousEnableZoom;


      if (
        previousMouseButtons
      ) {

        controls.mouseButtons.LEFT =
          previousMouseButtons.LEFT;

        controls.mouseButtons.MIDDLE =
          previousMouseButtons.MIDDLE;

        controls.mouseButtons.RIGHT =
          previousMouseButtons.RIGHT;

      }


      console.log(
        "Pan Tool Deactivated"
      );

    }

  };

}
