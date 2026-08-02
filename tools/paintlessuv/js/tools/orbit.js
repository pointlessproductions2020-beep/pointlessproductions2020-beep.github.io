/* =========================================================
   PAINTLESSUV
   ORBIT TOOL
========================================================= */


/* =========================================================
   CREATE ORBIT TOOL
========================================================= */

/**
 * PaintlessUV Orbit Tool.
 *
 * Enables normal OrbitControls behaviour.
 *
 * @param {OrbitControls} controls
 * @returns {Object}
 */
export function createOrbitTool(
  controls
) {

  if (
    !controls
  ) {

    throw new Error(
      "PaintlessUV Orbit Tool requires OrbitControls."
    );

  }


  return {

    activate() {

      controls.enabled =
        true;

      controls.enableRotate =
        true;

      controls.enablePan =
        true;

      controls.enableZoom =
        true;


      console.log(
        "Orbit Tool Activated"
      );

    },


    deactivate() {

      console.log(
        "Orbit Tool Deactivated"
      );

    }

  };

}
