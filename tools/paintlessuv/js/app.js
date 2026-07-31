import * as THREE from "three";

console.log("PaintlessUV starting...");

const canvas = document.getElementById("model-canvas");

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x14111d);

const camera = new THREE.PerspectiveCamera(
    60,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000
);

camera.position.set(0,1.5,3);

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias:true
});

renderer.setPixelRatio(window.devicePixelRatio);

renderer.setSize(
    canvas.clientWidth,
    canvas.clientHeight,
    false
);

const light=new THREE.HemisphereLight(
    0xffffff,
    0x222233,
    2
);

scene.add(light);

const directional=new THREE.DirectionalLight(
    0xffffff,
    2
);

directional.position.set(
    4,
    5,
    3
);

scene.add(directional);

const grid=new THREE.GridHelper(
    10,
    20,
    0x6b4aff,
    0x333333
);

scene.add(grid);

const cube=new THREE.Mesh(

    new THREE.BoxGeometry(),

    new THREE.MeshStandardMaterial({

        color:0xa84cff,

        metalness:0.25,

        roughness:0.55

    })

);

cube.position.y=0.5;

scene.add(cube);

function resize(){

    const w=canvas.clientWidth;

    const h=canvas.clientHeight;

    renderer.setSize(w,h,false);

    camera.aspect=w/h;

    camera.updateProjectionMatrix();

}

window.addEventListener(
    "resize",
    resize
);

resize();

function animate(){

    requestAnimationFrame(
        animate
    );

    cube.rotation.y+=0.01;

    renderer.render(
        scene,
        camera
    );

}

animate();

document
.getElementById(
"workspace-empty-state"
)
.hidden=true;

document
.getElementById(
"paintlessuv-viewports"
)
.hidden=false;
