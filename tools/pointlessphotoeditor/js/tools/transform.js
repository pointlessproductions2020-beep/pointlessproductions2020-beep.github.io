"use strict";

/* =========================================================
   PAINTLESS
   TRANSFORM LAYER TOOL — v0.1

   File:
   js/tools/transform.js

   First stage:
   - Registers the Transform tool
   - Uses the overlay canvas
   - Draws a transform boundary around the active layer
   - Prepares pointer handling for resize and rotation
========================================================= */

(() => {

  /* =======================================================
     1. LOADER CHECK
  ======================================================= */

  const tools =
    window.PaintlessTools;


  if (
    !tools ||
    typeof tools.registerModule !==
      "function"
  ) {

    console.error(
      "Paintless Transform could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. TRANSFORM STATE
  ======================================================= */

  const transformState = {

    initialised:
      false,

    active:
      false,

    transforming:
      false,

    layer:
      null,

    activeHandle:
      null,

    startPoint:
      null,

    startTransformX:
      0,

    startTransformY:
      0,

    startScaleX:
      1,

    startScaleY:
      1,

    startRotation:
      0

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    editorCanvas:
      null,

    overlayCanvas:
      null

  };


  let overlayContext =
    null;


  /* =======================================================
     4. SHARED APIS
  ======================================================= */

  function getCore() {

    return (
      window.PaintlessToolCore ||
      null
    );

  }


  function getLayersApi() {

    return (
      window.PaintlessLayers ||
      null
    );

  }


  function getActiveLayer() {

    return (
      getCore()
        ?.getActiveLayer?.() ||

      getLayersApi()
        ?.getActiveLayer?.() ||

      null
    );

  }


  function clearOverlay() {

    getCore()
      ?.clearOverlay?.();

  }


  function sendStatusMessage(
    message
  ) {

    if (
      typeof getCore()
        ?.sendStatusMessage ===
        "function"
    ) {

      getCore()
        .sendStatusMessage(
          message
        );

      return;

    }


    document.dispatchEvent(
      new CustomEvent(
        "paintless:status-message",
        {
          detail: {
            message
          }
        }
      )
    );

  }


  /* =======================================================
     5. TRANSFORM GEOMETRY
  ======================================================= */

  function getLayerBounds(
    layer =
      getActiveLayer()
  ) {

    if (!layer?.canvas) {

      return null;

    }


    const width =
      layer.canvas.width *
      Math.abs(
        Number(layer.scaleX) ||
        1
      );


    const height =
      layer.canvas.height *
      Math.abs(
        Number(layer.scaleY) ||
        1
      );


    const centreX =
      (
        Number(layer.transformX) ||
        0
      ) +
      layer.canvas.width / 2;


    const centreY =
      (
        Number(layer.transformY) ||
        0
      ) +
      layer.canvas.height / 2;


    return {

      centreX,

      centreY,

      width,

      height,

      left:
        centreX -
        width / 2,

      top:
        centreY -
        height / 2,

      right:
        centreX +
        width / 2,

      bottom:
        centreY +
        height / 2,

      rotation:
        Number(
          layer.rotation
        ) || 0

    };

  }


  /* =======================================================
     6. DRAW TRANSFORM BOUNDARY
  ======================================================= */

  function drawHandle(
    x,
    y
  ) {

    overlayContext.beginPath();

    overlayContext.rect(
      x - 5,
      y - 5,
      10,
      10
    );

    overlayContext.fill();

    overlayContext.stroke();

  }


  function drawTransformBoundary() {

    if (
      !transformState.active ||
      !overlayContext
    ) {

      return false;

    }


    const layer =
      getActiveLayer();


    const bounds =
      getLayerBounds(
        layer
      );


    clearOverlay();


    if (
      !layer ||
      !bounds ||
      layer.visible ===
        false
    ) {

      return false;

    }


    overlayContext.save();


    overlayContext.globalAlpha =
      1;


    overlayContext.globalCompositeOperation =
      "source-over";


    overlayContext.translate(
      bounds.centreX,
      bounds.centreY
    );


    overlayContext.rotate(
      bounds.rotation *
      Math.PI /
      180
    );


    overlayContext.strokeStyle =
      "rgba(168, 76, 255, 0.98)";


    overlayContext.fillStyle =
      "#ffffff";


    overlayContext.lineWidth =
      2;


    overlayContext.setLineDash(
      [
        7,
        4
      ]
    );


    overlayContext.strokeRect(
      -bounds.width / 2,
      -bounds.height / 2,
      bounds.width,
      bounds.height
    );


    overlayContext.setLineDash(
      []
    );


    drawHandle(
      -bounds.width / 2,
      -bounds.height / 2
    );


    drawHandle(
      bounds.width / 2,
      -bounds.height / 2
    );


    drawHandle(
      -bounds.width / 2,
      bounds.height / 2
    );


    drawHandle(
      bounds.width / 2,
      bounds.height / 2
    );


    overlayContext.restore();


    return true;

  }


  /* =======================================================
     7. POINTER HANDLERS
  ======================================================= */

  function pointerDown() {

    if (!transformState.active) {

      return false;

    }


    /*
     * Handle detection and scaling come next.
     */

    return {

      changed:
        false,

      preventDefault:
        true

    };

  }


  function pointerMove() {

    if (!transformState.active) {

      return false;

    }


    return false;

  }


  function pointerUp() {

    if (
      !transformState.active
    ) {

      return false;

    }


    return {

      changed:
        false,

      preventDefault:
        true

    };

  }


  function pointerCancel() {

    transformState.transforming =
      false;


    transformState.activeHandle =
      null;


    drawTransformBoundary();


    return {

      changed:
        false,

      releasePointer:
        true

    };

  }


  function pointerLeave() {

    return false;

  }


  /* =======================================================
     8. TOOL ACTIVATION
  ======================================================= */

  function activate() {

    transformState.active =
      true;


    transformState.layer =
      getActiveLayer();


    getCore()
      ?.showToolOptions?.(
        []
      );


    getCore()
      ?.setCanvasCursor?.(
        "default"
      );


    drawTransformBoundary();


    sendStatusMessage(
      "Transform ready. Select a layer to resize or rotate it."
    );


    return true;

  }


  function deactivate() {

    transformState.active =
      false;


    transformState.transforming =
      false;


    transformState.layer =
      null;


    transformState.activeHandle =
      null;


    clearOverlay();


    return true;

  }


  /* =======================================================
     9. DOM AND EVENTS
  ======================================================= */

  function collectDomReferences() {

    dom.editorCanvas =
      document.getElementById(
        "editor-canvas"
      );


    dom.overlayCanvas =
      document.getElementById(
        "overlay-canvas"
      );


    overlayContext =
      dom.overlayCanvas
        ?.getContext(
          "2d"
        ) ||
      null;

  }


  function connectEvents() {

    document.addEventListener(
      "paintless:active-layer-changed",
      () => {

        transformState.layer =
          getActiveLayer();


        if (transformState.active) {

          drawTransformBoundary();

        }

      }
    );


    document.addEventListener(
      "paintless:layers-rendered",
      () => {

        if (
          transformState.active &&
          !transformState.transforming
        ) {

          drawTransformBoundary();

        }

      }
    );


    document.addEventListener(
      "paintless:history-restored",
      drawTransformBoundary
    );


    document.addEventListener(
      "paintless:document-reset",
      clearOverlay
    );


    window.addEventListener(
      "keydown",
      (event) => {

        if (
          event.ctrlKey &&
          !event.shiftKey &&
          event.key.toLowerCase() ===
            "t"
        ) {

          event.preventDefault();


          tools.setActiveTool(
            "transform"
          );

        }

      }
    );

  }


  /* =======================================================
     10. TRANSFORM MODULE
  ======================================================= */

  const transformModule = {

    name:
      "Transform",

    label:
      "Transform",

    initialised:
      false,


    async initialise() {

      if (
        transformState.initialised
      ) {

        return true;

      }


      collectDomReferences();


      if (
        !dom.editorCanvas ||
        !dom.overlayCanvas ||
        !overlayContext
      ) {

        throw new Error(
          "Paintless Transform could not find the editor canvases."
        );

      }


      connectEvents();


      transformState.initialised =
        true;


      this.initialised =
        true;


      if (
        tools.getActiveTool() ===
          "transform"
      ) {

        activate();

      }


      console.log(
        "%cPaintless Transform ready.",
        [
          "color:#d49aff",
          "font-weight:bold",
          "font-size:13px"
        ].join(";")
      );


      return true;

    },


    activate,

    deactivate,

    pointerDown,

    pointerMove,

    pointerUp,

    pointerCancel,

    pointerLeave

  };


  /* =======================================================
     11. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      transformState,

    activate,

    deactivate,

    drawTransformBoundary,

    getLayerBounds

  };


  window.PaintlessTransform =
    publicApi;


  transformModule.api =
    publicApi;


  /* =======================================================
     12. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "transform",
    transformModule
  );

})();
