"use strict";

/* =========================================================
   PAINTLESS
   GRADIENT TOOL — v1.0

   File:
   js/tools/gradient.js

   Features:
   - Primary-to-secondary colour gradient
   - Live drag preview
   - Linear gradient
   - Radial gradient support through public API
   - Adjustable opacity
   - Reverse direction
   - Shift snaps linear gradients to 45-degree angles
   - Alt draws a radial gradient temporarily
   - Mouse, touch and pen support
   - One completed gradient = one Undo step
   - Safe cancellation
   - Active-layer locking protection

   Loaded automatically by:
   js/tools.js
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
      "Paintless Gradient could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. GRADIENT STATE
  ======================================================= */

  const gradientState = {

    initialised:
      false,

    active:
      false,

    drawing:
      false,

    changed:
      false,

    layer:
      null,

    layerBackup:
      null,

    startPoint:
      null,

    currentPoint:
      null,

    type:
      "linear",

    reversed:
      false,

    repeat:
      false,

    previewOpacity:
      0.78,

    minimumDistance:
      2

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    editorCanvas:
      null,

    overlayCanvas:
      null,

    opacityInput:
      null,

    opacityOutput:
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


  function getColours() {

    return (
      window.PaintlessColours ||
      null
    );

  }


  function getLayersApi() {

    return (
      window.PaintlessLayers ||
      null
    );

  }


  function getHistoryApi() {

    return (
      window.PaintlessHistory ||
      null
    );

  }


  /* =======================================================
     5. GENERIC HELPERS
  ======================================================= */

  function clamp(
    value,
    minimum,
    maximum
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

      return minimum;

    }


    return Math.min(
      maximum,
      Math.max(
        minimum,
        numericValue
      )
    );

  }


  function copyPoint(
    point
  ) {

    if (!point) {

      return null;

    }


    return {

      x:
        Number(
          point.x
        ) ||
        0,

      y:
        Number(
          point.y
        ) ||
        0,

      inside:
        Boolean(
          point.inside
        )

    };

  }


  function distanceBetween(
    firstPoint,
    secondPoint
  ) {

    if (
      !firstPoint ||
      !secondPoint
    ) {

      return 0;

    }


    return Math.hypot(
      secondPoint.x -
        firstPoint.x,

      secondPoint.y -
        firstPoint.y
    );

  }


  function sendStatusMessage(
    message
  ) {

    const core =
      getCore();


    if (
      typeof core?.sendStatusMessage ===
      "function"
    ) {

      core.sendStatusMessage(
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


  function clearOverlay() {

    getCore()
      ?.clearOverlay?.();

  }


  function renderLayers() {

    if (
      typeof getLayersApi()
        ?.renderLayers ===
      "function"
    ) {

      getLayersApi()
        .renderLayers();


      return;

    }


    getCore()
      ?.renderLayers?.();

  }


  /* =======================================================
     6. GRADIENT SETTINGS
  ======================================================= */

  function getGradientOpacity() {

    return clamp(
      tools.getState(
        "opacity"
      ) ??
      (
        Number(
          dom.opacityInput?.value
        ) /
        100
      ) ??
      1,
      0.01,
      1
    );

  }


  function getGradientColours() {

    const colourApi =
      getColours();


    const colourPair =
      colourApi
        ?.getGradientColours?.();


    const primaryColour =
      colourPair?.start ||
      colourApi
        ?.getPrimaryColour?.() ||
      tools.getState(
        "primaryColour"
      ) ||
      "#a84cff";


    const secondaryColour =
      colourPair?.end ||
      colourApi
        ?.getSecondaryColour?.() ||
      tools.getState(
        "secondaryColour"
      ) ||
      "#ffffff";


    if (
      gradientState.reversed
    ) {

      return {

        start:
          secondaryColour,

        end:
          primaryColour

      };

    }


    return {

      start:
        primaryColour,

      end:
        secondaryColour

    };

  }


  function getGradientType(
    payload =
      null
  ) {

    /*
     * Holding Alt temporarily switches to radial mode.
     */

    if (
      payload?.altKey
    ) {

      return "radial";

    }


    return gradientState.type;

  }


  function setGradientType(
    type
  ) {

    if (
      ![
        "linear",
        "radial"
      ].includes(
        type
      )
    ) {

      return false;

    }


    gradientState.type =
      type;


    sendStatusMessage(
      `${
        type ===
          "radial"
          ? "Radial"
          : "Linear"
      } gradient selected.`
    );


    document.dispatchEvent(
      new CustomEvent(
        "paintless:gradient-type-changed",
        {
          detail: {
            type
          }
        }
      )
    );


    return true;

  }


  function setReversed(
    reversed
  ) {

    gradientState.reversed =
      Boolean(
        reversed
      );


    document.dispatchEvent(
      new CustomEvent(
        "paintless:gradient-direction-changed",
        {
          detail: {
            reversed:
              gradientState.reversed
          }
        }
      )
    );


    return gradientState.reversed;

  }


  function reverseGradient() {

    setReversed(
      !gradientState.reversed
    );


    sendStatusMessage(
      "Gradient colours reversed."
    );


    redrawCurrentPreview();


    return gradientState.reversed;

  }


  /* =======================================================
     7. LAYER HELPERS
  ======================================================= */

  function getActiveLayer() {

    return (
      getCore()
        ?.getActiveLayer?.() ||
      getLayersApi()
        ?.getActiveLayer?.() ||
      null
    );

  }


  function canEditLayer(
    layer
  ) {

    if (!layer) {

      sendStatusMessage(
        "There is no active layer."
      );


      return false;

    }


    if (layer.locked) {

      sendStatusMessage(
        "That layer is locked."
      );


      return false;

    }


    if (
      !layer.canvas ||
      !layer.context
    ) {

      sendStatusMessage(
        "That layer cannot accept a gradient."
      );


      return false;

    }


    return true;

  }


  function createLayerBackup(
    layer
  ) {

    if (!layer?.canvas) {

      return null;

    }


    const backupCanvas =
      document.createElement(
        "canvas"
      );


    backupCanvas.width =
      layer.canvas.width;


    backupCanvas.height =
      layer.canvas.height;


    const backupContext =
      backupCanvas.getContext(
        "2d"
      );


    backupContext.drawImage(
      layer.canvas,
      0,
      0
    );


    return backupCanvas;

  }


  function restoreLayerBackup() {

    if (
      !gradientState.layer ||
      !gradientState.layerBackup
    ) {

      return false;

    }


    const layer =
      gradientState.layer;


    layer.context.save();


    layer.context.setTransform(
      1,
      0,
      0,
      1,
      0,
      0
    );


    layer.context.globalAlpha =
      1;


    layer.context.globalCompositeOperation =
      "source-over";


    layer.context.clearRect(
      0,
      0,
      layer.canvas.width,
      layer.canvas.height
    );


    layer.context.drawImage(
      gradientState.layerBackup,
      0,
      0
    );


    layer.context.restore();


    renderLayers();


    return true;

  }


  /* =======================================================
     8. POINT CONSTRAINTS
  ======================================================= */

  function getConstrainedEndPoint(
    startPoint,
    endPoint,
    constrained
  ) {

    if (
      !constrained
    ) {

      return copyPoint(
        endPoint
      );

    }


    const deltaX =
      endPoint.x -
      startPoint.x;


    const deltaY =
      endPoint.y -
      startPoint.y;


    const distance =
      Math.hypot(
        deltaX,
        deltaY
      );


    if (
      distance <=
      0.001
    ) {

      return copyPoint(
        endPoint
      );

    }


    const rawAngle =
      Math.atan2(
        deltaY,
        deltaX
      );


    const angleStep =
      Math.PI /
      4;


    const snappedAngle =
      Math.round(
        rawAngle /
        angleStep
      ) *
      angleStep;


    return {

      x:
        startPoint.x +
        Math.cos(
          snappedAngle
        ) *
        distance,

      y:
        startPoint.y +
        Math.sin(
          snappedAngle
        ) *
        distance,

      inside:
        endPoint.inside

    };

  }


  /* =======================================================
     9. GRADIENT CREATION
  ======================================================= */

  function createLinearGradient(
    context,
    startPoint,
    endPoint
  ) {

    return context.createLinearGradient(
      startPoint.x,
      startPoint.y,
      endPoint.x,
      endPoint.y
    );

  }


  function createRadialGradient(
    context,
    startPoint,
    endPoint
  ) {

    const radius =
      Math.max(
        1,
        distanceBetween(
          startPoint,
          endPoint
        )
      );


    return context.createRadialGradient(
      startPoint.x,
      startPoint.y,
      0,
      startPoint.x,
      startPoint.y,
      radius
    );

  }


  function createCanvasGradient(
    context,
    startPoint,
    endPoint,
    type
  ) {

    const gradient =
      type ===
        "radial"
        ? createRadialGradient(
            context,
            startPoint,
            endPoint
          )
        : createLinearGradient(
            context,
            startPoint,
            endPoint
          );


    const colours =
      getGradientColours();


    gradient.addColorStop(
      0,
      colours.start
    );


    gradient.addColorStop(
      1,
      colours.end
    );


    return gradient;

  }


  /* =======================================================
     10. APPLY GRADIENT
  ======================================================= */

  function drawGradient(
    context,
    canvas,
    startPoint,
    endPoint,
    {
      type =
        "linear",

      opacity =
        1
    } = {}
  ) {

    if (
      !context ||
      !canvas ||
      !startPoint ||
      !endPoint
    ) {

      return false;

    }


    if (
      distanceBetween(
        startPoint,
        endPoint
      ) <
      gradientState.minimumDistance
    ) {

      return false;

    }


    const gradient =
      createCanvasGradient(
        context,
        startPoint,
        endPoint,
        type
      );


    context.save();


    context.setTransform(
      1,
      0,
      0,
      1,
      0,
      0
    );


    context.globalAlpha =
      clamp(
        opacity,
        0.01,
        1
      );


    context.globalCompositeOperation =
      "source-over";


    context.fillStyle =
      gradient;


    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );


    context.restore();


    return true;

  }


  function applyGradient(
    layer,
    startPoint,
    endPoint,
    payload =
      {}
  ) {

    if (
      !canEditLayer(
        layer
      )
    ) {

      return false;

    }


    const constrainedEndPoint =
      getConstrainedEndPoint(
        startPoint,
        endPoint,
        Boolean(
          payload.shiftKey
        )
      );


    const type =
      getGradientType(
        payload
      );


    const changed =
      drawGradient(
        layer.context,
        layer.canvas,
        startPoint,
        constrainedEndPoint,
        {
          type,

          opacity:
            getGradientOpacity()
        }
      );


    if (!changed) {

      sendStatusMessage(
        "Drag a little further to create the gradient."
      );


      return false;

    }


    renderLayers();


    document.dispatchEvent(
      new CustomEvent(
        "paintless:gradient-applied",
        {
          detail: {
            type,

            startPoint:
              copyPoint(
                startPoint
              ),

            endPoint:
              copyPoint(
                constrainedEndPoint
              ),

            reversed:
              gradientState.reversed,

            colours:
              getGradientColours(),

            opacity:
              getGradientOpacity()
          }
        }
      )
    );


    return true;

  }


  /* =======================================================
     11. LIVE PREVIEW
  ======================================================= */

  function drawDirectionGuide(
    startPoint,
    endPoint,
    type
  ) {

    if (
      !overlayContext
    ) {

      return;

    }


    overlayContext.save();


    overlayContext.globalAlpha =
      1;


    overlayContext.globalCompositeOperation =
      "source-over";


    overlayContext.lineWidth =
      1.5;


    overlayContext.strokeStyle =
      "rgba(255, 255, 255, 0.9)";


    overlayContext.fillStyle =
      "rgba(168, 76, 255, 0.95)";


    overlayContext.setLineDash(
      [
        7,
        5
      ]
    );


    if (
      type ===
      "radial"
    ) {

      const radius =
        distanceBetween(
          startPoint,
          endPoint
        );


      overlayContext.beginPath();


      overlayContext.arc(
        startPoint.x,
        startPoint.y,
        radius,
        0,
        Math.PI *
          2
      );


      overlayContext.stroke();

    }


    overlayContext.beginPath();


    overlayContext.moveTo(
      startPoint.x,
      startPoint.y
    );


    overlayContext.lineTo(
      endPoint.x,
      endPoint.y
    );


    overlayContext.stroke();


    overlayContext.setLineDash(
      []
    );


    overlayContext.beginPath();


    overlayContext.arc(
      startPoint.x,
      startPoint.y,
      4,
      0,
      Math.PI *
        2
    );


    overlayContext.fill();


    overlayContext.fillStyle =
      "rgba(53, 231, 255, 0.95)";


    overlayContext.beginPath();


    overlayContext.arc(
      endPoint.x,
      endPoint.y,
      4,
      0,
      Math.PI *
        2
    );


    overlayContext.fill();


    overlayContext.restore();

  }


  function drawPreview(
    startPoint,
    endPoint,
    payload =
      {}
  ) {

    if (
      !overlayContext ||
      !dom.overlayCanvas ||
      !startPoint ||
      !endPoint
    ) {

      return false;

    }


    clearOverlay();


    const constrainedEndPoint =
      getConstrainedEndPoint(
        startPoint,
        endPoint,
        Boolean(
          payload.shiftKey
        )
      );


    const type =
      getGradientType(
        payload
      );


    const changed =
      drawGradient(
        overlayContext,
        dom.overlayCanvas,
        startPoint,
        constrainedEndPoint,
        {
          type,

          opacity:
            Math.min(
              gradientState.previewOpacity,
              getGradientOpacity()
            )
        }
      );


    drawDirectionGuide(
      startPoint,
      constrainedEndPoint,
      type
    );


    return changed;

  }


  function redrawCurrentPreview() {

    if (
      !gradientState.drawing ||
      !gradientState.startPoint ||
      !gradientState.currentPoint
    ) {

      return false;

    }


    return drawPreview(
      gradientState.startPoint,
      gradientState.currentPoint
    );

  }


  /* =======================================================
     12. HISTORY
  ======================================================= */

  function getHistoryReason(
    type
  ) {

    return type ===
      "radial"
      ? "Apply radial gradient"
      : "Apply linear gradient";

  }


  function saveGradientHistory(
    type
  ) {

    const reason =
      getHistoryReason(
        type
      );


    if (
      typeof getHistoryApi()
        ?.saveHistory ===
      "function"
    ) {

      return getHistoryApi()
        .saveHistory(
          reason
        );

    }


    if (
      typeof getCore()
        ?.requestHistorySave ===
      "function"
    ) {

      return getCore()
        .requestHistorySave(
          reason
        );

    }


    document.dispatchEvent(
      new CustomEvent(
        "paintless:history-requested",
        {
          detail: {
            reason
          }
        }
      )
    );


    return true;

  }


  /* =======================================================
     13. GRADIENT LIFECYCLE
  ======================================================= */

  function beginGradient(
    payload
  ) {

    const layer =
      payload.layer ||
      getActiveLayer();


    if (
      !canEditLayer(
        layer
      )
    ) {

      return false;

    }


    gradientState.drawing =
      true;


    gradientState.changed =
      false;


    gradientState.layer =
      layer;


    gradientState.layerBackup =
      createLayerBackup(
        layer
      );


    gradientState.startPoint =
      copyPoint(
        payload.point
      );


    gradientState.currentPoint =
      copyPoint(
        payload.point
      );


    clearOverlay();


    return true;

  }


  function updateGradient(
    payload
  ) {

    if (
      !gradientState.drawing ||
      !gradientState.startPoint
    ) {

      return false;

    }


    gradientState.currentPoint =
      copyPoint(
        payload.point
      );


    return drawPreview(
      gradientState.startPoint,
      gradientState.currentPoint,
      payload
    );

  }


  function finishGradient(
    payload
  ) {

    if (
      !gradientState.drawing ||
      !gradientState.layer ||
      !gradientState.startPoint
    ) {

      return false;

    }


    gradientState.currentPoint =
      copyPoint(
        payload.point
      );


    clearOverlay();


    const type =
      getGradientType(
        payload
      );


    const changed =
      applyGradient(
        gradientState.layer,
        gradientState.startPoint,
        gradientState.currentPoint,
        payload
      );


    if (changed) {

      gradientState.changed =
        true;


      payload.markChanged?.(
        true
      );


      saveGradientHistory(
        type
      );


      sendStatusMessage(
        `${
          type ===
            "radial"
            ? "Radial"
            : "Linear"
        } gradient saved.`
      );

    }


    resetGradientState();


    return changed;

  }


  function cancelGradient() {

    if (
      !gradientState.drawing
    ) {

      clearOverlay();


      return false;

    }


    restoreLayerBackup();


    clearOverlay();


    resetGradientState();


    sendStatusMessage(
      "Gradient cancelled."
    );


    return true;

  }


  function resetGradientState() {

    gradientState.drawing =
      false;


    gradientState.changed =
      false;


    gradientState.layer =
      null;


    gradientState.layerBackup =
      null;


    gradientState.startPoint =
      null;


    gradientState.currentPoint =
      null;

  }


  /* =======================================================
     14. POINTER HANDLERS
  ======================================================= */

  function pointerDown(
    payload
  ) {

    if (
      !gradientState.active
    ) {

      return false;

    }


    const started =
      beginGradient(
        payload
      );


    return {

      changed:
        false,

      preventDefault:
        true,

      capturePointer:
        started,

      clearOverlay:
        true

    };

  }


  function pointerMove(
    payload
  ) {

    if (
      !gradientState.active ||
      !gradientState.drawing
    ) {

      return false;

    }


    updateGradient(
      payload
    );


    return {

      changed:
        false,

      preventDefault:
        true

    };

  }


  function pointerUp(
    payload
  ) {

    if (
      !gradientState.drawing
    ) {

      return false;

    }


    const changed =
      finishGradient(
        payload
      );


    return {

      changed,

      preventDefault:
        true,

      releasePointer:
        true,

      clearOverlay:
        true

    };

  }


  function pointerCancel() {

    cancelGradient();


    return {

      changed:
        false,

      releasePointer:
        true,

      clearOverlay:
        true

    };

  }


  function pointerLeave() {

    if (
      !gradientState.drawing
    ) {

      clearOverlay();

    }


    return false;

  }


  /* =======================================================
     15. TOOL ACTIVATION
  ======================================================= */

  function activate() {

    gradientState.active =
      true;


    getCore()
      ?.showToolOptions?.(
        [
          "opacity"
        ]
      );


    getCore()
      ?.setCanvasCursor?.(
        "crosshair"
      );


    sendStatusMessage(
      `${
        gradientState.type ===
          "radial"
          ? "Radial"
          : "Linear"
      } gradient ready. Drag across the canvas.`
    );


    return true;

  }


  function deactivate() {

    if (
      gradientState.drawing
    ) {

      cancelGradient();

    }


    gradientState.active =
      false;


    clearOverlay();


    return true;

  }


  /* =======================================================
     16. DOM AND EVENTS
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


    dom.opacityInput =
      document.getElementById(
        "tool-opacity"
      );


    dom.opacityOutput =
      document.getElementById(
        "tool-opacity-output"
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
      "paintless:primary-colour-changed",
      redrawCurrentPreview
    );


    document.addEventListener(
      "paintless:secondary-colour-changed",
      redrawCurrentPreview
    );


    document.addEventListener(
      "paintless:colours-swapped",
      redrawCurrentPreview
    );


    document.addEventListener(
      "paintless:tool-state-changed",
      (event) => {

        if (
          event.detail?.property ===
          "opacity"
        ) {

          redrawCurrentPreview();

        }

      }
    );


    dom.opacityInput
      ?.addEventListener(
        "input",
        redrawCurrentPreview
      );


    document.addEventListener(
      "paintless:history-restored",
      cancelGradient
    );


    document.addEventListener(
      "paintless:document-reset",
      cancelGradient
    );


    document.addEventListener(
      "paintless:document-resized",
      cancelGradient
    );


    window.addEventListener(
      "keydown",
      (event) => {

        if (
          getCore()
            ?.isTypingElement?.()
        ) {

          return;

        }


        if (
          tools.getActiveTool() !==
          "gradient"
        ) {

          return;

        }


        if (
          event.key.toLowerCase() ===
          "r"
        ) {

          event.preventDefault();


          reverseGradient();

        }

      }
    );

  }


  /* =======================================================
     17. GRADIENT MODULE
  ======================================================= */

  const gradientModule = {

    name:
      "Gradient",

    label:
      "Gradient",

    initialised:
      false,


    async initialise() {

      if (
        gradientState.initialised
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
          "Paintless Gradient could not find the editor canvases."
        );

      }


      connectEvents();


      gradientState.initialised =
        true;


      this.initialised =
        true;


      if (
        tools.getActiveTool() ===
        "gradient"
      ) {

        activate();

      }


      document.dispatchEvent(
        new CustomEvent(
          "paintless:gradient-ready",
          {
            detail: {
              gradient:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless Gradient ready.",
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
     18. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      gradientState,


    activate,

    deactivate,


    beginGradient,

    updateGradient,

    finishGradient,

    cancelGradient,


    applyGradient,

    drawGradient,

    drawPreview,

    createCanvasGradient,

    createLinearGradient,

    createRadialGradient,


    getGradientColours,

    getGradientOpacity,

    getGradientType,

    setGradientType,

    reverseGradient,

    setReversed,


    isReversed() {

      return gradientState.reversed;

    },


    setPreviewOpacity(
      opacity
    ) {

      gradientState.previewOpacity =
        clamp(
          opacity,
          0.05,
          1
        );


      redrawCurrentPreview();


      return gradientState.previewOpacity;

    },


    isDrawing() {

      return gradientState.drawing;

    }

  };


  window.PaintlessGradient =
    publicApi;


  gradientModule.api =
    publicApi;


  /* =======================================================
     19. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "gradient",
    gradientModule
  );

})();
