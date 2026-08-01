import * as THREE from "three";


/* =========================================================
   PAINTLESSUV
   MODEL ANALYSER
========================================================= */


/**
 * Analyse a loaded PaintlessUV model.
 *
 * @param {Object} loadedModel
 * @returns {Object}
 */
export function analyseModel(
  loadedModel
) {

  if (
    !loadedModel ||
    !loadedModel.scene
  ) {

    throw new Error(
      "PaintlessUV cannot analyse an empty model."
    );

  }


  const result = {

    name:
      loadedModel.name ||
      "Untitled Model",

    format:
      String(
        loadedModel.extension ||
        "unknown"
      ).toUpperCase(),

    objects:
      0,

    meshes:
      0,

    vertices:
      0,

    triangles:
      0,

    materials:
      0,

    textures:
      0,

    uvLayers:
      0,

    meshesWithUV:
      0,

    meshesWithoutUV:
      0,

    hasUV:
      false,

    hasTexture:
      false,

    hasAnimations:
      Array.isArray(
        loadedModel.animations
      ) &&
      loadedModel.animations.length >
        0,

    animationCount:
      Array.isArray(
        loadedModel.animations
      )
        ? loadedModel.animations.length
        : 0,

    materialList:
      [],

    textureList:
      [],

    bounds:
      null,

    readyToPaint:
      false

  };


  const materials =
    new Set();

  const textures =
    new Set();


  loadedModel.scene.traverse(
    (object) => {

      result.objects +=
        1;


      if (
        !object.isMesh
      ) {

        return;

      }


      result.meshes +=
        1;


      const geometry =
        object.geometry;


      if (
        geometry
      ) {

        const positionAttribute =
          geometry.getAttribute(
            "position"
          );


        if (
          positionAttribute
        ) {

          result.vertices +=
            positionAttribute.count;

        }


        const index =
          geometry.getIndex();


        if (
          index
        ) {

          result.triangles +=
            Math.floor(
              index.count / 3
            );

        } else if (
          positionAttribute
        ) {

          result.triangles +=
            Math.floor(
              positionAttribute.count /
              3
            );

        }


        const uvAttribute =
          geometry.getAttribute(
            "uv"
          );


        if (
          uvAttribute
        ) {

          result.meshesWithUV +=
            1;

          result.uvLayers =
            Math.max(
              result.uvLayers,
              1
            );

        } else {

          result.meshesWithoutUV +=
            1;

        }

      }


      collectMaterials(
        object.material,
        materials,
        textures
      );

    }
  );


  result.materials =
    materials.size;


  result.textures =
    textures.size;


  result.materialList =
    Array.from(
      materials
    ).map(
      (material) => {

        return {

          name:
            material.name ||
            "Unnamed Material",

          type:
            material.type ||
            "Material",

          uuid:
            material.uuid

        };

      }
    );


  result.textureList =
    Array.from(
      textures
    ).map(
      (texture) => {

        return {

          name:
            texture.name ||
            texture.image?.src ||
            "Unnamed Texture",

          uuid:
            texture.uuid

        };

      }
    );


  result.hasUV =
    result.meshes >
      0 &&
    result.meshesWithoutUV ===
      0;


  result.hasTexture =
    result.textures >
      0;


  result.bounds =
    calculateBounds(
      loadedModel.scene
    );


  result.readyToPaint =
    result.meshes >
      0 &&
    result.hasUV;


  return result;

}


/* =========================================================
   MATERIAL COLLECTION
========================================================= */

function collectMaterials(
  materialValue,
  materialSet,
  textureSet
) {

  if (
    !materialValue
  ) {

    return;

  }


  const materialList =
    Array.isArray(
      materialValue
    )
      ? materialValue
      : [
          materialValue
        ];


  for (
    const material of
    materialList
  ) {

    if (
      !material
    ) {

      continue;

    }


    materialSet.add(
      material
    );


    collectMaterialTextures(
      material,
      textureSet
    );

  }

}


/* =========================================================
   TEXTURE COLLECTION
========================================================= */

function collectMaterialTextures(
  material,
  textureSet
) {

  for (
    const value of
    Object.values(
      material
    )
  ) {

    if (
      value?.isTexture
    ) {

      textureSet.add(
        value
      );

    }

  }

}


/* =========================================================
   MODEL BOUNDS
========================================================= */

function calculateBounds(
  object
) {

  const box =
    new THREE.Box3()
      .setFromObject(
        object
      );


  if (
    box.isEmpty()
  ) {

    return null;

  }


  const center =
    box.getCenter(
      new THREE.Vector3()
    );


  const size =
    box.getSize(
      new THREE.Vector3()
    );


  return {

    minimum: {

      x:
        box.min.x,

      y:
        box.min.y,

      z:
        box.min.z

    },

    maximum: {

      x:
        box.max.x,

      y:
        box.max.y,

      z:
        box.max.z

    },

    center: {

      x:
        center.x,

      y:
        center.y,

      z:
        center.z

    },

    size: {

      x:
        size.x,

      y:
        size.y,

      z:
        size.z

    }

  };

}
