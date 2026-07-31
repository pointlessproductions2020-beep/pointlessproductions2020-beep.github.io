import { GLTFLoader }
from "three/addons/loaders/GLTFLoader.js";

const gltfLoader =
    new GLTFLoader();


export async function loadModel(file) {

    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    switch (extension) {

        case "glb":
        case "gltf":

            return loadGLTF(file);

        default:

            throw new Error(
                `Unsupported model type: ${extension}`
            );

    }

}


function loadGLTF(file) {

    return new Promise(

        (resolve, reject) => {

            const url =
                URL.createObjectURL(file);


            gltfLoader.load(

                url,

                gltf => {

                    URL.revokeObjectURL(url);

                    resolve({

                        name:
                            file.name,

                        extension:
                            "glb",

                        scene:
                            gltf.scene,

                        materials:
                            gltf.scene.children,

                        animations:
                            gltf.animations

                    });

                },

                undefined,

                error => {

                    URL.revokeObjectURL(url);

                    reject(error);

                }

            );

        }

    );

}
