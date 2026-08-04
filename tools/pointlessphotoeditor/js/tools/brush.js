"use strict";

/* =========================================================
   PAINTLESS
   BRUSH TOOL — v1.0

   File:
   js/tools/brush.js

   Features:
   - Smooth interpolated strokes
   - Adjustable size
   - Adjustable opacity
   - Adjustable hardness
   - Mouse, touch and pen support
   - Pen-pressure support
   - Live brush cursor preview
   - One completed stroke = one Undo step
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
      "Paintless Brush could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. BRUSH STATE
  ======================================================= */

  const brushState = {

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

    previousPoint:
      null,

    lastRenderedPoint:
      null,

    accumulatedDistance:
      0,

    cursorVisible:
      false,

    cursorPoint:
      null,

    cursorPressure:
      1,

    smoothing:
      0.38,

    spacing:
      0.11,

    minimumSpacing:
      0.75,

    pressureEnabled:
      true,

    pressureSizeMinimum:
      0.22,

    pressureOpacityMinimum:
      0.28,

    strokeCounter:
      0

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    editorCanvas:
      null,

    overlayCanvas:
      null,

    brushSizeInput:
      null,

    brushSizeOutput:
      null,

    opacityInput:
      null,

    opacityOutput:
      null,

    hardnessInput:
      null,

    hardnessOutput:
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


  function getCanvasApi() {

    return (
      window.PaintlessCanvas ||
      null
    );

  }


  function getHistoryApi() {

    return (
      window.PaintlessHistory ||
      null
    );

  }


  function getSelectionApi() {

    return (
      window.PaintlessSelection ||
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

      pressure:
        clamp(
          point.pressure ??
          1,
          0,
          1
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


  function interpolatePoint(
    firstPoint,
    secondPoint,
    amount
  ) {

    return {

      x:
        firstPoint.x +
        (
          secondPoint.x -
          firstPoint.x
        ) *
        amount,

      y:
        firstPoint.y +
        (
          secondPoint.y -
          firstPoint.y
        ) *
        amount,

      pressure:
        firstPoint.pressure +
        (
          secondPoint.pressure -
          firstPoint.pressure
        ) *
        amount

    };

  }


  function normalisePressure(
    payload
  ) {

    if (
      !brushState.pressureEnabled
    ) {

      return 1;

    }


    if (
      payload.pointerType !==
      "pen"
    ) {

      return 1;

    }


    const pressure =
      Number(
        payload.pressure
      );


    if (
      !Number.isFinite(
        pressure
      ) ||
      pressure <= 0
    ) {

      return 0.5;

    }


    return clamp(
      pressure,
      0.01,
      1
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


  /* =======================================================
     6. BRUSH SETTINGS
  ======================================================= */

  function getBrushSize() {

    return clamp(
      tools.getState(
        "brushSize"
      ) ??
      dom.brushSizeInput?.value ??
      20,
      1,
      200
    );

  }


  function getBrushOpacity() {

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


  function getBrushHardness() {

    return clamp(
      tools.getState(
        "hardness"
      ) ??
      (
        Number(
          dom.hardnessInput?.value
        ) /
        100
      ) ??
      0.8,
      0,
      1
    );

  }


  function getBrushColour() {

    return (
      getColours()
        ?.getPrimaryColour?.() ||
      tools.getState(
        "primaryColour"
      ) ||
      "#a84cff"
    );

  }


  function getEffectiveSize(
    pressure
  ) {

    const pressureScale =
      brushState.pressureSizeMinimum +
      (
        1 -
        brushState.pressureSizeMinimum
      ) *
      pressure;


    return Math.max(
      1,
      getBrushSize() *
      pressureScale
    );

  }


  function getEffectiveOpacity(
    pressure
  ) {

    const pressureScale =
      brushState.pressureOpacityMinimum +
      (
        1 -
        brushState.pressureOpacityMinimum
      ) *
      pressure;


    return clamp(
      getBrushOpacity() *
      pressureScale,
      0.01,
      1
    );

  }


  function getStampSpacing(
    pressure
  ) {

    const effectiveSize =
      getEffectiveSize(
        pressure
      );


    return Math.max(
      brushState.minimumSpacing,
      effectiveSize *
      brushState.spacing
    );

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
        "That layer cannot be painted."
      );


      return false;

    }


    return true;

  }


  function createLayerBackup(
    layer
  ) {

    if (
      !layer?.canvas
    ) {

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

    const layer =
      brushState.layer;


    const backup =
      brushState.layerBackup;


    if (
      !layer ||
      !backup
    ) {

      return false;

    }


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
      backup,
      0,
      0
    );


    layer.context.restore();


    renderLayers();


    return true;

  }


  function renderLayers() {

    const layersApi =
      getLayersApi();


    if (
      typeof layersApi?.renderLayers ===
      "function"
    ) {

      layersApi.renderLayers();


      return;

    }


    getCore()
      ?.renderLayers?.();

  }


  /* =======================================================
     8. COLOUR HELPERS
  ======================================================= */

  function hexToRgb(
    colour
  ) {

    const colourApi =
      getColours();


    if (
      typeof colourApi?.hexToRgb ===
      "function"
    ) {

      return colourApi.hexToRgb(
        colour
      );

    }


    const normalised =
      String(
        colour ||
        "#000000"
      )
        .replace(
          "#",
          ""
        )
        .padEnd(
          6,
          "0"
        )
        .slice(
          0,
          6
        );


    return {

      red:
        parseInt(
          normalised.slice(
            0,
            2
          ),
          16
        ),

      green:
        parseInt(
          normalised.slice(
            2,
            4
          ),
          16
        ),

      blue:
        parseInt(
          normalised.slice(
            4,
            6
          ),
          16
        )

    };

  }


  /* =======================================================
     9. BRUSH STAMP
  ======================================================= */

  function stampBrush(
    context,
    point
  ) {

    const selection=getSelectionApi();
    const hasSelection=typeof selection?.hasSelection==="function" && selection.hasSelection();

    if(hasSelection && typeof selection.clipContext==="function"){
      context.save();
      selection.clipContext(context);
    }

    if (
      !context ||
      !point
    ) {

      return false;

    }


    const pressure =
      clamp(
        point.pressure,
        0.01,
        1
      );


    const size =
      getEffectiveSize(
        pressure
      );


    const radius =
      Math.max(
        0.5,
        size /
        2
      );


    const opacity =
      getEffectiveOpacity(
        pressure
      );


    const hardness =
      getBrushHardness();


    const colour =
      getBrushColour();


    context.save();


    context.globalAlpha =
      opacity;


    context.globalCompositeOperation =
      "source-over";


    /*
     * A fully hard brush can use a simple circle.
     */

    if (
      hardness >=
      0.985
    ) {

      context.fillStyle =
        colour;


      context.beginPath();


      context.arc(
        point.x,
        point.y,
        radius,
        0,
        Math.PI *
        2
      );


      context.fill();


      context.restore();
      if(hasSelection && typeof selection?.clipContext==="function") context.restore();

      return true;

    }


    const rgb =
      hexToRgb(
        colour
      );


    const solidRadius =
      radius *
      Math.pow(
        hardness,
        1.55
      );


    const gradient =
      context.createRadialGradient(
        point.x,
        point.y,
        solidRadius,
        point.x,
        point.y,
        radius
      );


    gradient.addColorStop(
      0,
      `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, 1)`
    );


    /*
     * A small intermediate stop produces a smoother transition
     * without making low-hardness brushes appear hollow.
     */

    const middleStop =
      clamp(
        hardness +
        0.18,
        0.05,
        0.92
      );


    gradient.addColorStop(
      middleStop,
      `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${
        Math.max(
          0.12,
          hardness *
          0.72
        )
      })`
    );


    gradient.addColorStop(
      1,
      `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, 0)`
    );


    context.fillStyle =
      gradient;


    context.beginPath();


    context.arc(
      point.x,
      point.y,
      radius,
      0,
      Math.PI *
      2
    );


    context.fill();


    context.restore();
    if(hasSelection && typeof selection?.clipContext==="function") context.restore();


    return true;

  }


  /* =======================================================
     10. STROKE INTERPOLATION
  ======================================================= */

  function smoothIncomingPoint(
    previousPoint,
    incomingPoint
  ) {

    if (!previousPoint) {

      return copyPoint(
        incomingPoint
      );

    }


    const smoothing =
      clamp(
        brushState.smoothing,
        0,
        0.92
      );


    const following =
      1 -
      smoothing;


    return {

      x:
        previousPoint.x +
        (
          incomingPoint.x -
          previousPoint.x
        ) *
        following,

      y:
        previousPoint.y +
        (
          incomingPoint.y -
          previousPoint.y
        ) *
        following,

      pressure:
        previousPoint.pressure +
        (
          incomingPoint.pressure -
          previousPoint.pressure
        ) *
        following

    };

  }


  function drawInterpolatedSegment(
    context,
    firstPoint,
    secondPoint
  ) {

    if (
      !context ||
      !firstPoint ||
      !secondPoint
    ) {

      return false;

    }


    const distance =
      distanceBetween(
        firstPoint,
        secondPoint
      );


    if (
      distance <=
      0.001
    ) {

      return stampBrush(
        context,
        secondPoint
      );

    }


    const averagePressure =
      (
        firstPoint.pressure +
        secondPoint.pressure
      ) /
      2;


    const spacing =
      getStampSpacing(
        averagePressure
      );


    /*
     * Carry unused distance from the previous pointer event.
     * This keeps spacing consistent even when events arrive
     * at uneven intervals.
     */

    let travelled =
      spacing -
      brushState.accumulatedDistance;


    let stamped =
      false;


    while (
      travelled <=
      distance
    ) {

      const amount =
        travelled /
        distance;


      const stampPoint =
        interpolatePoint(
          firstPoint,
          secondPoint,
          amount
        );


      stampBrush(
        context,
        stampPoint
      );


      brushState.lastRenderedPoint =
        copyPoint(
          stampPoint
        );


      stamped =
        true;


      travelled +=
        spacing;

    }


    const usedDistance =
      distance -
      (
        travelled -
        spacing
      );


    brushState.accumulatedDistance =
      usedDistance;


    if (
      brushState.accumulatedDistance >=
      spacing
    ) {

      brushState.accumulatedDistance %=
        spacing;

    }


    return stamped;

  }


  /* =======================================================
     11. CURSOR PREVIEW
  ======================================================= */

  function clearBrushCursor() {

    if (
      !overlayContext ||
      !dom.overlayCanvas
    ) {

      return;

    }


    getCore()
      ?.clearOverlay?.();


    brushState.cursorVisible =
      false;

  }


  function drawBrushCursor(
    point,
    pressure =
      1
  ) {

    if (
      !brushState.active ||
      brushState.drawing ||
      !overlayContext ||
      !dom.overlayCanvas ||
      !point
    ) {

      return;

    }


    getCore()
      ?.clearOverlay?.();


    const size =
      getEffectiveSize(
        pressure
      );


    const radius =
      Math.max(
        0.5,
        size /
        2
      );


    const colour =
      getBrushColour();


    overlayContext.save();


    overlayContext.globalAlpha =
      1;


    overlayContext.globalCompositeOperation =
      "source-over";


    overlayContext.setLineDash(
      []
    );


    /*
     * Dark outer ring.
     */

    overlayContext.strokeStyle =
      "rgba(0, 0, 0, 0.82)";


    overlayContext.lineWidth =
      2;


    overlayContext.beginPath();


    overlayContext.arc(
      point.x,
      point.y,
      radius +
        1,
      0,
      Math.PI *
        2
    );


    overlayContext.stroke();


    /*
     * Light inner ring.
     */

    overlayContext.strokeStyle =
      "rgba(255, 255, 255, 0.92)";


    overlayContext.lineWidth =
      1;


    overlayContext.beginPath();


    overlayContext.arc(
      point.x,
      point.y,
      radius,
      0,
      Math.PI *
        2
    );


    overlayContext.stroke();


    /*
     * Small centre point using the active colour.
     */

    overlayContext.fillStyle =
      colour;


    overlayContext.beginPath();


    overlayContext.arc(
      point.x,
      point.y,
      Math.min(
        2,
        Math.max(
          1,
          radius *
          0.08
        )
      ),
      0,
      Math.PI *
        2
    );


    overlayContext.fill();


    overlayContext.restore();


    brushState.cursorPoint =
      copyPoint(
        point
      );


    brushState.cursorPressure =
      pressure;


    brushState.cursorVisible =
      true;

  }


  function redrawBrushCursor() {

    if (
      !brushState.cursorVisible ||
      !brushState.cursorPoint
    ) {

      return;

    }


    drawBrushCursor(
      brushState.cursorPoint,
      brushState.cursorPressure
    );

  }


  /* =======================================================
     12. HISTORY
  ======================================================= */

  function saveBrushHistory() {

    const reason =
      "Brush stroke";


    const historyApi =
      getHistoryApi();


    if (
      typeof historyApi?.saveHistory ===
      "function"
    ) {

      return historyApi.saveHistory(
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
     13. STROKE LIFECYCLE
  ======================================================= */

  function beginStroke(
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


    const pressure =
      normalisePressure(
        payload
      );


    const point = {

      x:
        payload.point.x,

      y:
        payload.point.y,

      pressure

    };


    brushState.drawing =
      true;


    brushState.changed =
      false;


    brushState.layer =
      layer;


    brushState.layerBackup =
      createLayerBackup(
        layer
      );


    brushState.previousPoint =
      copyPoint(
        point
      );


    brushState.lastRenderedPoint =
      copyPoint(
        point
      );


    brushState.accumulatedDistance =
      0;


    brushState.strokeCounter +=
      1;


    clearBrushCursor();


    stampBrush(
      layer.context,
      point
    );


    brushState.changed =
      true;


    payload.markChanged?.(
      true
    );


    renderLayers();


    return true;

  }


  function continueStroke(
    payload
  ) {

    if (
      !brushState.drawing ||
      !brushState.layer
    ) {

      return false;

    }


    const pressure =
      normalisePressure(
        payload
      );


    const incomingPoint = {

      x:
        payload.point.x,

      y:
        payload.point.y,

      pressure

    };


    const smoothedPoint =
      smoothIncomingPoint(
        brushState.previousPoint,
        incomingPoint
      );


    const changed =
      drawInterpolatedSegment(
        brushState.layer.context,
        brushState.previousPoint,
        smoothedPoint
      );


    brushState.previousPoint =
      copyPoint(
        smoothedPoint
      );


    if (changed) {

      brushState.changed =
        true;


      payload.markChanged?.(
        true
      );


      renderLayers();

    }


    return changed;

  }


  function finishStroke(
    payload
  ) {

    if (
      !brushState.drawing
    ) {

      return false;

    }


    const pressure =
      normalisePressure(
        payload
      );


    const finalPoint = {

      x:
        payload.point.x,

      y:
        payload.point.y,

      pressure

    };


    /*
     * Finish the last partial gap so the stroke reaches the
     * pointer-up position instead of ending slightly short.
     */

    if (
      brushState.layer &&
      brushState.previousPoint
    ) {

      drawInterpolatedSegment(
        brushState.layer.context,
        brushState.previousPoint,
        finalPoint
      );


      stampBrush(
        brushState.layer.context,
        finalPoint
      );


      brushState.changed =
        true;


      renderLayers();

    }


    const changed =
      brushState.changed;


    brushState.drawing =
      false;


    brushState.layerBackup =
      null;


    brushState.layer =
      null;


    brushState.previousPoint =
      null;


    brushState.lastRenderedPoint =
      null;


    brushState.accumulatedDistance =
      0;


    if (changed) {

      payload.markChanged?.(
        true
      );


      saveBrushHistory();


      sendStatusMessage(
        "Brush stroke saved."
      );

    }


    brushState.changed =
      false;


    return changed;

  }


  function cancelStroke() {

    if (
      !brushState.drawing
    ) {

      clearBrushCursor();


      return false;

    }


    restoreLayerBackup();


    brushState.drawing =
      false;


    brushState.changed =
      false;


    brushState.layer =
      null;


    brushState.layerBackup =
      null;


    brushState.previousPoint =
      null;


    brushState.lastRenderedPoint =
      null;


    brushState.accumulatedDistance =
      0;


    clearBrushCursor();


    sendStatusMessage(
      "Brush stroke cancelled."
    );


    return true;

  }


  /* =======================================================
     14. POINTER HANDLERS
  ======================================================= */

  function pointerDown(
    payload
  ) {

    if (
      !brushState.active
    ) {

      return false;

    }


    const started =
      beginStroke(
        payload
      );


    return {

      changed:
        started,

      preventDefault:
        true,

      capturePointer:
        true,

      clearOverlay:
        true

    };

  }


  function pointerMove(
    payload
  ) {

    if (
      !brushState.active ||
      !brushState.drawing
    ) {

      return false;

    }


    const changed =
      continueStroke(
        payload
      );


    return {

      changed,

      preventDefault:
        true

    };

  }


  function pointerUp(
    payload
  ) {

    if (
      !brushState.drawing
    ) {

      return false;

    }


    const changed =
      finishStroke(
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

    cancelStroke();


    return {

      changed:
        false,

      clearOverlay:
        true,

      releasePointer:
        true

    };

  }


  function hover(
    payload
  ) {

    if (
      !brushState.active ||
      brushState.drawing ||
      !payload.point?.inside
    ) {

      return false;

    }


    const pressure =
      normalisePressure(
        payload
      );


    drawBrushCursor(
      payload.point,
      pressure
    );


    return false;

  }


  function pointerEnter(
    payload
  ) {

    if (
      !brushState.active ||
      brushState.drawing
    ) {

      return false;

    }


    const pressure =
      normalisePressure(
        payload
      );


    drawBrushCursor(
      payload.point,
      pressure
    );


    return false;

  }


  function pointerLeave() {

    if (
      !brushState.drawing
    ) {

      clearBrushCursor();

    }


    return false;

  }


  /* =======================================================
     15. TOOL ACTIVATION
  ======================================================= */

  function activate() {

    brushState.active =
      true;


    getCore()
      ?.showToolOptions?.(
        [
          "brush",
          "opacity",
          "hardness"
        ]
      );


    getCore()
      ?.setCanvasCursor?.(
        "none"
      );


    sendStatusMessage(
      "Brush ready."
    );


    return true;

  }


  function deactivate() {

    if (
      brushState.drawing
    ) {

      cancelStroke();

    }


    brushState.active =
      false;


    clearBrushCursor();


    return true;

  }


  /* =======================================================
     16. SETTINGS EVENTS
  ======================================================= */

  function connectSettingEvents() {

    document.addEventListener(
      "paintless:tool-state-changed",
      (event) => {

        const property =
          event.detail?.property;


        if (
          property ===
            "brushSize" ||
          property ===
            "hardness" ||
          property ===
            "primaryColour"
        ) {

          redrawBrushCursor();

        }

      }
    );


    document.addEventListener(
      "paintless:primary-colour-changed",
      redrawBrushCursor
    );


    dom.brushSizeInput
      ?.addEventListener(
        "input",
        redrawBrushCursor
      );


    dom.hardnessInput
      ?.addEventListener(
        "input",
        redrawBrushCursor
      );


    document.addEventListener(
      "paintless:history-restored",
      () => {

        cancelStroke();

      }
    );


    document.addEventListener(
      "paintless:document-reset",
      () => {

        cancelStroke();

      }
    );


    document.addEventListener(
      "paintless:document-resized",
      () => {

        cancelStroke();

      }
    );

  }


  /* =======================================================
     17. DOM COLLECTION
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


    dom.brushSizeInput =
      document.getElementById(
        "brush-size"
      );


    dom.brushSizeOutput =
      document.getElementById(
        "brush-size-output"
      );


    dom.opacityInput =
      document.getElementById(
        "tool-opacity"
      );


    dom.opacityOutput =
      document.getElementById(
        "tool-opacity-output"
      );


    dom.hardnessInput =
      document.getElementById(
        "brush-hardness"
      );


    dom.hardnessOutput =
      document.getElementById(
        "brush-hardness-output"
      );


    overlayContext =
      dom.overlayCanvas
        ?.getContext(
          "2d"
        ) ||
      null;

  }


  /* =======================================================
     18. BRUSH MODULE
  ======================================================= */

  const brushModule = {

    name:
      "Brush",

    label:
      "Brush",

    initialised:
      false,


    async initialise() {

      if (
        brushState.initialised
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
          "Paintless Brush could not find the editor canvases."
        );

      }


      connectSettingEvents();


      brushState.initialised =
        true;


      this.initialised =
        true;


      /*
       * tools.js starts with Brush selected. Activate it after
       * initialisation so cursor and options are immediately
       * correct.
       */

      if (
        tools.getActiveTool() ===
        "brush"
      ) {

        activate();

      }


      document.dispatchEvent(
        new CustomEvent(
          "paintless:brush-ready",
          {
            detail: {
              brush:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless Brush ready.",
        [
          "color:#69f59c",
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

    pointerEnter,

    pointerLeave,

    hover

  };


  /* =======================================================
     19. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      brushState,


    activate,

    deactivate,


    beginStroke,

    continueStroke,

    finishStroke,

    cancelStroke,


    stampBrush,

    drawInterpolatedSegment,

    drawBrushCursor,

    clearBrushCursor,


    getBrushSize,

    getBrushOpacity,

    getBrushHardness,

    getBrushColour,


    setSmoothing(
      value
    ) {

      brushState.smoothing =
        clamp(
          value,
          0,
          0.92
        );


      return brushState.smoothing;

    },


    getSmoothing() {

      return brushState.smoothing;

    },


    setSpacing(
      value
    ) {

      brushState.spacing =
        clamp(
          value,
          0.02,
          1
        );


      return brushState.spacing;

    },


    getSpacing() {

      return brushState.spacing;

    },


    setPressureEnabled(
      enabled
    ) {

      brushState.pressureEnabled =
        Boolean(
          enabled
        );


      return brushState.pressureEnabled;

    },


    isPressureEnabled() {

      return brushState.pressureEnabled;

    },


    isDrawing() {

      return brushState.drawing;

    }

  };


  window.PaintlessBrush =
    publicApi;


  brushModule.api =
    publicApi;


  /* =======================================================
     20. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "brush",
    brushModule
  );

})();
