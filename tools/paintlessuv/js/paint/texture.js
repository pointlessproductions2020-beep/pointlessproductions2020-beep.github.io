import * as THREE from "three";


/* =========================================================
   PAINTLESSUV
   PAINT TEXTURE
========================================================= */


/**
 * Create a blank canvas-backed texture and apply it to every
 * paintable material on the loaded model.
 *
 * @param {THREE.Object3D} modelScene
 * @param {Object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {string} options.background
 * @returns {Object}
 */
export function createPaintTexture(
  modelScene,
  {
    width = 2048,
    height = 2048,
    background = "#ffffff"
  } = {}
) {

  if (
    !modelScene
  ) {

    throw new Error(
      "PaintlessUV cannot create a texture without a model."
    );

  }


  const safeWidth =
    normaliseTextureSize(
      width
    );

  const safeHeight =
    normaliseTextureSize(
      height
    );


  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    safeWidth;

  canvas.height =
    safeHeight;


  const context =
    canvas.getContext(
      "2d",
      {
        alpha:
          true
      }
    );


  if (
    !context
  ) {

    throw new Error(
      "PaintlessUV could not create the paint canvas."
    );

  }


  context.save();

  context.setTransform(
    1,
    0,
    0,
    1,
    0,
    0
  );

  context.clearRect(
    0,
    0,
    safeWidth,
    safeHeight
  );

  context.fillStyle =
    background;

  context.fillRect(
    0,
    0,
    safeWidth,
    safeHeight
  );

  context.restore();


  const texture =
    new THREE.CanvasTexture(
      canvas
    );

  texture.name =
    "PaintlessUV Paint Texture";

  texture.colorSpace =
    THREE.SRGBColorSpace;

  texture.flipY =
    false;

  texture.wrapS =
    THREE.ClampToEdgeWrapping;

  texture.wrapT =
    THREE.ClampToEdgeWrapping;

  texture.minFilter =
    THREE.LinearMipmapLinearFilter;

  texture.magFilter =
    THREE.LinearFilter;

  texture.generateMipmaps =
    true;

  texture.needsUpdate =
    true;


  const updatedMaterials =
    new Set();

  let meshCount =
    0;


  modelScene.traverse(
    (object) => {

      if (
        !object.isMesh
      ) {

        return;

      }


      const materials =
        normaliseMaterials(
          object.material
        );


      if (
        materials.length ===
        0
      ) {

        const material =
          createDefaultMaterial(
            texture
          );

        object.material =
          material;

        updatedMaterials.add(
          material
        );

        meshCount +=
          1;

        return;

      }


      let meshWasUpdated =
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


        applyTextureToMaterial(
          material,
          texture
        );

        updatedMaterials.add(
          material
        );

        meshWasUpdated =
          true;

      }


      if (
        meshWasUpdated
      ) {

        meshCount +=
          1;

      }

    }
  );


  if (
    meshCount ===
    0
  ) {

    texture.dispose();

    throw new Error(
      "PaintlessUV could not find a paintable mesh."
    );

  }


  return {

    canvas,

    context,

    texture,

    width:
      safeWidth,

    height:
      safeHeight,

    meshCount,

    materialCount:
      updatedMaterials.size

  };

}


/* =========================================================
   UPDATE TEXTURE
========================================================= */

/**
 * Tell Three.js that the canvas contents have changed.
 *
 * @param {THREE.CanvasTexture} texture
 */
export function updatePaintTexture(
  texture
) {

  if (
    !texture?.isTexture
  ) {

    return;

  }


  texture.needsUpdate =
    true;

}


/* =========================================================
   CLEAR TEXTURE
========================================================= */

/**
 * Reset a paint texture canvas to a solid colour.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {THREE.CanvasTexture} texture
 * @param {string} colour
 */
export function clearPaintTexture(
  canvas,
  texture,
  colour = "#ffffff"
) {

  if (
    !canvas
  ) {

    return;

  }


  const context =
    canvas.getContext(
      "2d"
    );


  if (
    !context
  ) {

    return;

  }


  context.save();

  context.setTransform(
    1,
    0,
    0,
    1,
    0,
    0
  );

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  context.fillStyle =
    colour;

  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  context.restore();


  updatePaintTexture(
    texture
  );

}


/* =========================================================
   APPLY TEXTURE TO MATERIAL
========================================================= */

function applyTextureToMaterial(
  material,
  texture
) {

  if (
    !material
  ) {

    return;

  }


  material.map =
    texture;


  if (
    "color" in material &&
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
   DEFAULT MATERIAL
========================================================= */

function createDefaultMaterial(
  texture
) {

  return new THREE.MeshStandardMaterial(
    {
      name:
        "PaintlessUV Material",

      map:
        texture,

      color:
        0xffffff,

      roughness:
        0.75,

      metalness:
        0
    }
  );

}


/* =========================================================
   MATERIAL NORMALISATION
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


/* =========================================================
   TEXTURE SIZE
========================================================= */

function normaliseTextureSize(
  value
) {

  const numericValue =
    Number(
      value
    );


  if (
    !Number.isFinite(
      numericValue
    )
  ) {

    return 2048;

  }


  const roundedValue =
    Math.round(
      numericValue
    );


  return Math.min(
    8192,
    Math.max(
      64,
      roundedValue
    )
  );

}
