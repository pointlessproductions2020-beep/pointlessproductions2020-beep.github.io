import * as THREE from "three";


/* =========================================================
   PAINTLESSUV
   PAINT MATERIALS
========================================================= */


/**
 * Apply a paint texture to every mesh material in a model.
 *
 * Existing materials are preserved wherever possible.
 *
 * @param {THREE.Object3D} modelScene
 * @param {THREE.Texture} texture
 * @returns {{
 *   meshCount: number,
 *   materialCount: number,
 *   materials: THREE.Material[]
 * }}
 */
export function applyPaintTextureToModel(
  modelScene,
  texture
) {

  if (
    !modelScene
  ) {

    throw new Error(
      "PaintlessUV cannot apply a material without a model."
    );

  }


  if (
    !texture?.isTexture
  ) {

    throw new Error(
      "PaintlessUV cannot apply an invalid paint texture."
    );

  }


  const updatedMaterials =
    new Set();

  let meshCount =
    0;


  modelScene.traverse(
    (
      object
    ) => {

      if (
        !object.isMesh
      ) {

        return;

      }


      let materials =
        normaliseMaterials(
          object.material
        );


      if (
        materials.length ===
        0
      ) {

        const material =
          createPaintMaterial(
            texture
          );


        object.material =
          material;


        materials =
          [
            material
          ];

      }


      let meshUpdated =
        false;


      for (
        const material of
        materials
      ) {

        if (
          !material
        ) {

          continue;

        }


        configureMaterialForPainting(
          material,
          texture
        );


        updatedMaterials.add(
          material
        );


        meshUpdated =
          true;

      }


      if (
        meshUpdated
      ) {

        meshCount +=
          1;

      }

    }
  );


  return {
    meshCount,

    materialCount:
      updatedMaterials.size,

    materials:
      Array.from(
        updatedMaterials
      )
  };

}


/* =========================================================
   CREATE PAINT MATERIAL
========================================================= */

/**
 * Create a standard material ready for texture painting.
 *
 * @param {THREE.Texture} texture
 * @returns {THREE.MeshStandardMaterial}
 */
export function createPaintMaterial(
  texture
) {

  const material =
    new THREE.MeshStandardMaterial(
      {
        name:
          "PaintlessUV Paint Material",

        color:
          0xffffff,

        map:
          texture,

        roughness:
          0.72,

        metalness:
          0,

        side:
          THREE.FrontSide
      }
    );


  material.needsUpdate =
    true;


  return material;

}


/* =========================================================
   CONFIGURE EXISTING MATERIAL
========================================================= */

/**
 * Prepare an existing Three.js material for painting.
 *
 * @param {THREE.Material} material
 * @param {THREE.Texture} texture
 */
export function configureMaterialForPainting(
  material,
  texture
) {

  if (
    !material ||
    !texture?.isTexture
  ) {

    return;

  }


  if (
    "map" in material
  ) {

    material.map =
      texture;

  }


  if (
    material.color?.set
  ) {

    material.color.set(
      0xffffff
    );

  }


  material.needsUpdate =
    true;

}


/* =========================================================
   MATERIAL HELPERS
========================================================= */

function normaliseMaterials(
  material
) {

  if (
    !material
  ) {

    return [];

  }


  return Array.isArray(
    material
  )
    ? material
    : [
        material
      ];

}
