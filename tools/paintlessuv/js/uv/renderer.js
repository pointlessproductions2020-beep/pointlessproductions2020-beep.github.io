import * as THREE from "three";

let canvas = null;
let context = null;

export function initialiseUVRenderer() {

    canvas =
        document.getElementById(
            "uv-canvas"
        );

    if (!canvas) {

        console.warn(
            "UV canvas not found."
        );

        return;

    }

    context =
        canvas.getContext(
            "2d"
        );

}

export function drawUVLayout(model) {

    if (!canvas || !context) {

        return;

    }

    context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    context.fillStyle =
        "#d9d9d9";

    context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

}
