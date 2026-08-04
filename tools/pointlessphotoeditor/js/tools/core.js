"use strict";

/* =========================================================
   PAINTLESS
   CORE TOOL FOUNDATION — v1.0

   File:
   js/tools/core.js

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
      "Paintless core could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. CORE STATE
  ======================================================= */

  const coreState = {

    initialised:
      false,

    documentReady:
      false,

    pointerDown:
      false,

    pointerId:
      null,

    pointerType:
      null,

    startPoint:
      null,

    previousPoint:
      null,

    currentPoint:
      null,

    actionChangedCanvas:
      false,

    activePointerOwner:
      null,

    activeTransactionReason:
      null

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    paintlessApp:
      null,

    editorCanvas:
      null,

    overlayCanvas:
      null,

    canvasStage:
      null,

    canvasViewport:
      null,

    canvasTextEditor:
      null,

    activeToolName:
      null,

    saveStatus:
      null,

    primaryColourInput:
      null,

    panelColourPicker:
      null,

    hexColourInput:
      null,

    primaryColourChip:
      null,

    secondaryColourChip:
      null,

    swapColoursButton:
      null,

    recentColours:
      null,

    brushOptions:
      null,

    opacityOptions:
      null,

    hardnessOptions:
      null,

    shapeOptions:
      null,

    selectionOptions:
      null,

    textOptions:
      null,

    brushSizeInput:
      null,

    brushSizeOutput:
      null,

    brushSizeDecreaseButton:
      null,

    brushSizeIncreaseButton:
      null,

    brushSizeNumberInput:
      null,

    toolOpacityInput:
      null,

    toolOpacityOutput:
      null,

    brushHardnessInput:
      null,

    brushHardnessOutput:
      null,

    shapeTypeInput:
      null,

    shapeFillEnabledInput:
      null,

    shapeStrokeEnabledInput:
      null,

    shapeCornerRadiusInput:
      null,

    shapeCornerRadiusOutput:
      null,

    textFontFamilyInput:
      null,

    textFontSizeInput:
      null,

    textBoldInput:
      null,

    textItalicInput:
      null,

    shapeToolFamily:
      null,

    shapeToolButton:
      null,

    shapeToolIcon:
      null,

    shapeToolLabel:
      null,

    shapeToolMenu:
      null

  };


  let overlayContext =
    null;


  /* =======================================================
     4. BASIC HELPERS
  ======================================================= */

  function byId(
    id
  ) {

    return document.getElementById(
      id
    );

  }


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


  function lerp(
    start,
    end,
    amount
  ) {

    return (
      start +
      (
        end -
        start
      ) *
      amount
    );

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


  function getNormalisedRectangle(
    firstPoint,
    secondPoint
  ) {

    return {

      x:
        Math.min(
          firstPoint.x,
          secondPoint.x
        ),

      y:
        Math.min(
          firstPoint.y,
          secondPoint.y
        ),

      width:
        Math.abs(
          secondPoint.x -
          firstPoint.x
        ),

      height:
        Math.abs(
          secondPoint.y -
          firstPoint.y
        )

    };

  }


  function normaliseHexColour(
    value
  ) {

    const colour =
      String(
        value ||
        ""
      )
        .trim()
        .toLowerCase();


    if (
      /^#[0-9a-f]{6}$/.test(
        colour
      )
    ) {

      return colour;

    }


    if (
      /^#[0-9a-f]{3}$/.test(
        colour
      )
    ) {

      return (
        "#" +
        colour[1] +
        colour[1] +
        colour[2] +
        colour[2] +
        colour[3] +
        colour[3]
      );

    }


    return null;

  }


  function hexToRgb(
    hexColour
  ) {

    const safeColour =
      normaliseHexColour(
        hexColour
      ) ||
      "#000000";


    return {

      red:
        parseInt(
          safeColour.slice(
            1,
            3
          ),
          16
        ),

      green:
        parseInt(
          safeColour.slice(
            3,
            5
          ),
          16
        ),

      blue:
        parseInt(
          safeColour.slice(
            5,
            7
          ),
          16
        )

    };

  }


  function rgbToHex(
    red,
    green,
    blue
  ) {

    const convertPart =
      (value) =>
        clamp(
          Math.round(
            value
          ),
          0,
          255
        )
          .toString(
            16
          )
          .padStart(
            2,
            "0"
          );


    return (
      "#" +
      convertPart(
        red
      ) +
      convertPart(
        green
      ) +
      convertPart(
        blue
      )
    );

  }


  function rgbaString(
    colour,
    alpha = 1
  ) {

    const rgb =
      hexToRgb(
        colour
      );


    return (
      `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ` +
      `${clamp(alpha, 0, 1)})`
    );

  }


  function isTypingElement(
    element =
      document.activeElement
  ) {

    if (!element) {

      return false;

    }


    return (
      element.tagName ===
        "INPUT" ||
      element.tagName ===
        "TEXTAREA" ||
      element.tagName ===
        "SELECT" ||
      element.isContentEditable
    );

  }


  /* =======================================================
     5. DOM COLLECTION
  ======================================================= */

  function collectDomReferences() {

    dom.paintlessApp =
      byId(
        "paintless-app"
      );

    dom.editorCanvas =
      byId(
        "editor-canvas"
      );

    dom.overlayCanvas =
      byId(
        "overlay-canvas"
      );

    dom.canvasStage =
      byId(
        "canvas-stage"
      );

    dom.canvasViewport =
      byId(
        "canvas-viewport"
      );

    dom.canvasTextEditor =
      byId(
        "canvas-text-editor"
      );

    dom.activeToolName =
      byId(
        "active-tool-name"
      );

    dom.saveStatus =
      byId(
        "save-status"
      );

    dom.primaryColourInput =
      byId(
        "primary-colour"
      );

    dom.panelColourPicker =
      byId(
        "panel-colour-picker"
      );

    dom.hexColourInput =
      byId(
        "hex-colour-input"
      );

    dom.primaryColourChip =
      byId(
        "primary-colour-chip"
      );

    dom.secondaryColourChip =
      byId(
        "secondary-colour-chip"
      );

    dom.swapColoursButton =
      byId(
        "swap-colours-button"
      );

    dom.recentColours =
      byId(
        "recent-colours"
      );

    dom.brushOptions =
      byId(
        "brush-options"
      );

    dom.opacityOptions =
      byId(
        "opacity-options"
      );

    dom.hardnessOptions =
      byId(
        "hardness-options"
      );

    dom.shapeOptions =
      byId(
        "shape-options"
      );

    dom.selectionOptions =
      byId(
        "selection-options"
      );

    dom.textOptions =
      byId(
        "text-options"
      );

    dom.brushSizeInput =
      byId(
        "brush-size"
      );

    dom.brushSizeOutput =
      byId(
        "brush-size-output"
      );

    dom.toolOpacityInput =
      byId(
        "tool-opacity"
      );

    dom.toolOpacityOutput =
      byId(
        "tool-opacity-output"
      );

    dom.brushHardnessInput =
      byId(
        "brush-hardness"
      );

    dom.brushHardnessOutput =
      byId(
        "brush-hardness-output"
      );

    dom.shapeTypeInput =
      byId(
        "shape-type"
      );

    dom.shapeFillEnabledInput =
      byId(
        "shape-fill-enabled"
      );

    dom.shapeStrokeEnabledInput =
      byId(
        "shape-stroke-enabled"
      );

    dom.shapeCornerRadiusInput =
      byId(
        "shape-corner-radius"
      );

    dom.shapeCornerRadiusOutput =
      byId(
        "shape-corner-radius-output"
      );

    dom.textFontFamilyInput =
      byId(
        "text-font-family"
      );

    dom.textFontSizeInput =
      byId(
        "text-font-size"
      );

    dom.textBoldInput =
      byId(
        "text-bold"
      );

    dom.textItalicInput =
      byId(
        "text-italic"
      );

    dom.shapeToolFamily =
      byId(
        "shape-tool-family"
      );

    dom.shapeToolButton =
      byId(
        "shape-tool-button"
      );

    dom.shapeToolIcon =
      byId(
        "shape-tool-icon"
      );

    dom.shapeToolLabel =
      byId(
        "shape-tool-label"
      );

    dom.shapeToolMenu =
      byId(
        "shape-tool-menu"
      );


    overlayContext =
      dom.overlayCanvas
        ?.getContext(
          "2d"
        ) ||
      null;


    return dom;

  }


  /* =======================================================
     6. PAINTLESS API ACCESS
  ======================================================= */

  function getCanvasApi() {

    return (
      window.PaintlessCanvas ||
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


  function getFilesApi() {

    return (
      window.PaintlessFiles ||
      null
    );

  }


  function getActiveLayer() {

    return (
      getLayersApi()
        ?.getActiveLayer?.() ||
      null
    );

  }


  function getDocumentSize() {

    const layersApi =
      getLayersApi();


    if (
      typeof layersApi
        ?.getDocumentSize ===
      "function"
    ) {

      return layersApi.getDocumentSize();

    }


    return {

      width:
        dom.editorCanvas?.width ||
        0,

      height:
        dom.editorCanvas?.height ||
        0

    };

  }


  function isDocumentOpen() {

    return Boolean(
      getCanvasApi()
        ?.isDocumentOpen?.()
    );

  }


  function canEditActiveLayer({
    showMessage = true
  } = {}) {

    const layer =
      getActiveLayer();


    if (!layer) {

      if (showMessage) {

        sendStatusMessage(
          "There is no active layer."
        );

      }


      return false;

    }


    if (!layer.locked) {

      return true;

    }


    if (showMessage) {

      sendStatusMessage(
        "That layer is locked."
      );

    }


    return false;

  }


  /* =======================================================
     7. EVENTS AND STATUS
  ======================================================= */

  function dispatchEvent(
    eventName,
    detail = {}
  ) {

    document.dispatchEvent(
      new CustomEvent(
        eventName,
        {
          detail
        }
      )
    );

  }


  function sendStatusMessage(
    message
  ) {

    const safeMessage =
      String(
        message ||
        ""
      );


    if (dom.saveStatus) {

      dom.saveStatus.textContent =
        safeMessage;

    }


    dispatchEvent(
      "paintless:status-message",
      {
        message:
          safeMessage
      }
    );

  }


  function requestHistorySave(
    reason =
      "Edit image"
  ) {

    const historyApi =
      getHistoryApi();


    if (
      typeof historyApi
        ?.saveHistory ===
      "function"
    ) {

      return historyApi.saveHistory(
        reason
      );

    }


    dispatchEvent(
      "paintless:history-requested",
      {
        reason
      }
    );


    return true;

  }


  function queueHistorySave(
    reason =
      "Edit image",
    delay =
      0
  ) {

    const historyApi =
      getHistoryApi();


    if (
      typeof historyApi
        ?.queueHistorySave ===
      "function"
    ) {

      return historyApi.queueHistorySave(
        reason,
        delay
      );

    }


    dispatchEvent(
      "paintless:history-requested",
      {
        reason,
        delay
      }
    );


    return true;

  }


  function beginHistoryTransaction(
    reason =
      "Edit image"
  ) {

    coreState.activeTransactionReason =
      reason;


    const historyApi =
      getHistoryApi();


    if (
      typeof historyApi
        ?.beginTransaction ===
      "function"
    ) {

      return historyApi.beginTransaction(
        reason
      );

    }


    dispatchEvent(
      "paintless:history-transaction-begin",
      {
        reason
      }
    );


    return true;

  }


  function markHistoryTransactionChanged(
    reason =
      null
  ) {

    const historyApi =
      getHistoryApi();


    if (
      typeof historyApi
        ?.markTransactionChanged ===
      "function"
    ) {

      return historyApi.markTransactionChanged(
        reason
      );

    }


    dispatchEvent(
      "paintless:history-transaction-change",
      {
        reason
      }
    );


    return true;

  }


  function endHistoryTransaction(
    reason =
      null
  ) {

    const finalReason =
      reason ||
      coreState.activeTransactionReason ||
      "Edit image";


    coreState.activeTransactionReason =
      null;


    const historyApi =
      getHistoryApi();


    if (
      typeof historyApi
        ?.endTransaction ===
      "function"
    ) {

      return historyApi.endTransaction(
        finalReason
      );

    }


    dispatchEvent(
      "paintless:history-transaction-end",
      {
        reason:
          finalReason
      }
    );


    return true;

  }


  function cancelHistoryTransaction() {

    coreState.activeTransactionReason =
      null;


    const historyApi =
      getHistoryApi();


    if (
      typeof historyApi
        ?.cancelTransaction ===
      "function"
    ) {

      return historyApi.cancelTransaction();

    }


    return false;

  }


  /* =======================================================
     8. CANVAS AND LAYER RENDERING
  ======================================================= */

  function renderLayers() {

    getLayersApi()
      ?.renderLayers?.();

  }


  function renderLayerList() {

    getLayersApi()
      ?.renderLayerList?.();

  }


  function refreshCanvas() {

    renderLayers();

    getCanvasApi()
      ?.updateStageDimensions?.();

    getCanvasApi()
      ?.updateDocumentInformation?.();

  }


  function clearOverlay() {

    if (
      !dom.overlayCanvas ||
      !overlayContext
    ) {

      return;

    }


    overlayContext.setTransform(
      1,
      0,
      0,
      1,
      0,
      0
    );

    overlayContext.globalAlpha =
      1;

    overlayContext.globalCompositeOperation =
      "source-over";

    overlayContext.setLineDash(
      []
    );

    overlayContext.clearRect(
      0,
      0,
      dom.overlayCanvas.width,
      dom.overlayCanvas.height
    );

  }


  function resetContext(
    context
  ) {

    if (!context) {

      return;

    }


    context.setTransform(
      1,
      0,
      0,
      1,
      0,
      0
    );

    context.globalAlpha =
      1;

    context.globalCompositeOperation =
      "source-over";

    context.lineWidth =
      1;

    context.lineCap =
      "butt";

    context.lineJoin =
      "miter";

    context.miterLimit =
      10;

    context.shadowBlur =
      0;

    context.shadowOffsetX =
      0;

    context.shadowOffsetY =
      0;

    context.shadowColor =
      "rgba(0, 0, 0, 0)";

    context.setLineDash(
      []
    );

  }


  /* =======================================================
     9. COORDINATE HELPERS
  ======================================================= */

  function getCanvasPoint(
    eventOrCoordinates
  ) {

    if (
      !eventOrCoordinates
    ) {

      return {

        x:
          0,

        y:
          0,

        inside:
          false

      };

    }


    const clientX =
      Number(
        eventOrCoordinates.clientX
      );

    const clientY =
      Number(
        eventOrCoordinates.clientY
      );


    if (
      !Number.isFinite(
        clientX
      ) ||
      !Number.isFinite(
        clientY
      )
    ) {

      return {

        x:
          0,

        y:
          0,

        inside:
          false

      };

    }


    const canvasApi =
      getCanvasApi();


    if (
      typeof canvasApi
        ?.clientToCanvas ===
      "function"
    ) {

      return canvasApi.clientToCanvas(
        clientX,
        clientY
      );

    }


    if (!dom.editorCanvas) {

      return {

        x:
          0,

        y:
          0,

        inside:
          false

      };

    }


    const rectangle =
      dom.editorCanvas
        .getBoundingClientRect();


    const scaleX =
      dom.editorCanvas.width /
      rectangle.width;


    const scaleY =
      dom.editorCanvas.height /
      rectangle.height;


    const x =
      (
        clientX -
        rectangle.left
      ) *
      scaleX;


    const y =
      (
        clientY -
        rectangle.top
      ) *
      scaleY;


    return {

      x,

      y,

      inside:
        x >= 0 &&
        y >= 0 &&
        x <=
          dom.editorCanvas.width &&
        y <=
          dom.editorCanvas.height

    };

  }


  function canvasToClient(
    canvasX,
    canvasY
  ) {

    const canvasApi =
      getCanvasApi();


    if (
      typeof canvasApi
        ?.canvasToClient ===
      "function"
    ) {

      return canvasApi.canvasToClient(
        canvasX,
        canvasY
      );

    }


    if (!dom.editorCanvas) {

      return {

        x:
          0,

        y:
          0

      };

    }


    const rectangle =
      dom.editorCanvas
        .getBoundingClientRect();


    return {

      x:
        rectangle.left +
        (
          canvasX /
          dom.editorCanvas.width
        ) *
        rectangle.width,

      y:
        rectangle.top +
        (
          canvasY /
          dom.editorCanvas.height
        ) *
        rectangle.height

    };

  }


  function constrainPointToCanvas(
    point
  ) {

    const size =
      getDocumentSize();


    return {

      x:
        clamp(
          point.x,
          0,
          size.width
        ),

      y:
        clamp(
          point.y,
          0,
          size.height
        ),

      inside:
        point.inside

    };

  }


  /* =======================================================
     10. POINTER STATE
  ======================================================= */

  function beginPointerAction(
    event,
    owner =
      null
  ) {

    if (
      coreState.pointerDown
    ) {

      return null;

    }


    const point =
      getCanvasPoint(
        event
      );


    if (!point.inside) {

      return null;

    }


    coreState.pointerDown =
      true;

    coreState.pointerId =
      event.pointerId;

    coreState.pointerType =
      event.pointerType ||
      "mouse";

    coreState.activePointerOwner =
      owner;

    coreState.startPoint =
      copyPoint(
        point
      );

    coreState.previousPoint =
      copyPoint(
        point
      );

    coreState.currentPoint =
      copyPoint(
        point
      );

    coreState.actionChangedCanvas =
      false;


    dom.editorCanvas
      ?.setPointerCapture?.(
        event.pointerId
      );


    return copyPoint(
      point
    );

  }


  function updatePointerAction(
    event
  ) {

    if (
      !coreState.pointerDown ||
      event.pointerId !==
        coreState.pointerId
    ) {

      return null;

    }


    const point =
      constrainPointToCanvas(
        getCanvasPoint(
          event
        )
      );


    coreState.currentPoint =
      copyPoint(
        point
      );


    return copyPoint(
      point
    );

  }


  function advancePointerPoint() {

    coreState.previousPoint =
      copyPoint(
        coreState.currentPoint
      );

  }


  function markCanvasChanged(
    changed =
      true
  ) {

    coreState.actionChangedCanvas =
      Boolean(
        changed
      );


    return coreState.actionChangedCanvas;

  }


  function endPointerAction(
    event =
      null
  ) {

    if (
      event &&
      coreState.pointerId !==
        null &&
      event.pointerId !==
        coreState.pointerId
    ) {

      return null;

    }


    const completedAction = {

      owner:
        coreState.activePointerOwner,

      pointerId:
        coreState.pointerId,

      pointerType:
        coreState.pointerType,

      startPoint:
        copyPoint(
          coreState.startPoint
        ),

      previousPoint:
        copyPoint(
          coreState.previousPoint
        ),

      currentPoint:
        copyPoint(
          coreState.currentPoint
        ),

      changed:
        coreState.actionChangedCanvas

    };


    if (
      event &&
      coreState.pointerId !==
        null
    ) {

      dom.editorCanvas
        ?.releasePointerCapture?.(
          coreState.pointerId
        );

    }


    resetPointerState();


    return completedAction;

  }


  function resetPointerState() {

    coreState.pointerDown =
      false;

    coreState.pointerId =
      null;

    coreState.pointerType =
      null;

    coreState.startPoint =
      null;

    coreState.previousPoint =
      null;

    coreState.currentPoint =
      null;

    coreState.actionChangedCanvas =
      false;

    coreState.activePointerOwner =
      null;

  }


  function cancelPointerAction() {

    clearOverlay();

    cancelHistoryTransaction();

    resetPointerState();


    dispatchEvent(
      "paintless:pointer-action-cancelled"
    );

  }


  function getPointerState() {

    return {

      pointerDown:
        coreState.pointerDown,

      pointerId:
        coreState.pointerId,

      pointerType:
        coreState.pointerType,

      owner:
        coreState.activePointerOwner,

      startPoint:
        copyPoint(
          coreState.startPoint
        ),

      previousPoint:
        copyPoint(
          coreState.previousPoint
        ),

      currentPoint:
        copyPoint(
          coreState.currentPoint
        ),

      changed:
        coreState.actionChangedCanvas

    };

  }


  /* =======================================================
     11. PRECISE BRUSH SIZE CONTROLS
  ======================================================= */

  function installPreciseBrushSizeControls() {

    if (
      !dom.brushSizeInput ||
      document.getElementById(
        "paintless-brush-size-stepper"
      )
    ) {

      return false;

    }


    const wrapper =
      document.createElement(
        "div"
      );


    wrapper.id =
      "paintless-brush-size-stepper";

    wrapper.className =
      "paintless-brush-size-stepper";


    const decreaseButton =
      document.createElement(
        "button"
      );


    decreaseButton.type =
      "button";

    decreaseButton.className =
      "paintless-brush-size-step-button";

    decreaseButton.textContent =
      "−";

    decreaseButton.title =
      "Decrease brush size by 1";

    decreaseButton.setAttribute(
      "aria-label",
      "Decrease brush size by 1"
    );


    const numberInput =
      document.createElement(
        "input"
      );


    numberInput.type =
      "number";

    numberInput.className =
      "paintless-brush-size-number";

    numberInput.min =
      "1";

    numberInput.max =
      "200";

    numberInput.step =
      "1";

    numberInput.inputMode =
      "numeric";

    numberInput.title =
      "Exact brush size";

    numberInput.setAttribute(
      "aria-label",
      "Exact brush size"
    );


    const increaseButton =
      document.createElement(
        "button"
      );


    increaseButton.type =
      "button";

    increaseButton.className =
      "paintless-brush-size-step-button";

    increaseButton.textContent =
      "+";

    increaseButton.title =
      "Increase brush size by 1";

    increaseButton.setAttribute(
      "aria-label",
      "Increase brush size by 1"
    );


    wrapper.append(
      decreaseButton,
      numberInput,
      increaseButton
    );


    dom.brushSizeInput.insertAdjacentElement(
      "afterend",
      wrapper
    );


    dom.brushSizeDecreaseButton =
      decreaseButton;

    dom.brushSizeIncreaseButton =
      increaseButton;

    dom.brushSizeNumberInput =
      numberInput;


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "paintless-brush-size-stepper-styles";


    style.textContent = `
      .paintless-brush-size-stepper {
        display: grid;
        grid-template-columns: 30px minmax(54px, 72px) 30px;
        align-items: center;
        gap: 6px;
        margin-top: 7px;
      }

      .paintless-brush-size-step-button {
        display: grid;
        place-items: center;
        width: 30px;
        height: 28px;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.92);
        background: rgba(255, 255, 255, 0.055);
        font-size: 18px;
        font-weight: 800;
        line-height: 1;
        cursor: pointer;
      }

      .paintless-brush-size-step-button:hover {
        border-color: rgba(168, 76, 255, 0.78);
        background: rgba(168, 76, 255, 0.16);
      }

      .paintless-brush-size-step-button:active {
        transform: translateY(1px);
      }

      .paintless-brush-size-number {
        width: 100%;
        height: 28px;
        padding: 3px 5px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 6px;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.045);
        font-size: 12px;
        font-weight: 700;
        text-align: center;
        outline: none;
      }

      .paintless-brush-size-number:focus {
        border-color: rgba(168, 76, 255, 0.9);
        box-shadow: 0 0 0 3px rgba(168, 76, 255, 0.12);
      }
    `;


    document.head.appendChild(
      style
    );


    return true;

  }


  function synchronisePreciseBrushSizeControls(
    value
  ) {

    const size =
      Math.round(
        clamp(
          value,
          1,
          200
        )
      );


    if (
      dom.brushSizeNumberInput &&
      dom.brushSizeNumberInput !==
        document.activeElement
    ) {

      dom.brushSizeNumberInput.value =
        String(
          size
        );

    }


    return size;

  }


  function changeBrushSizeBy(
    amount
  ) {

    const currentSize =
      Number(
        tools.getState(
          "brushSize"
        )
      ) ||
      Number(
        dom.brushSizeInput?.value
      ) ||
      20;


    return setBrushSize(
      currentSize +
      amount
    );

  }


  /* =======================================================
     11. TOOL SETTINGS
  ======================================================= */

  function setBrushSize(
    value,
    {
      updateControl = true
    } = {}
  ) {

    const size =
      clamp(
        value,
        1,
        200
      );


    tools.setState(
      "brushSize",
      size
    );


    if (
      updateControl &&
      dom.brushSizeInput
    ) {

      dom.brushSizeInput.value =
        String(
          size
        );

    }


    if (dom.brushSizeOutput) {

      dom.brushSizeOutput.textContent =
        `${Math.round(
          size
        )} px`;

    }


    synchronisePreciseBrushSizeControls(
      size
    );


    return size;

  }


  function setOpacity(
    value,
    {
      valueIsPercentage = false,
      updateControl = true
    } = {}
  ) {

    const opacity =
      valueIsPercentage
        ? clamp(
            value,
            1,
            100
          ) /
          100
        : clamp(
            value,
            0.01,
            1
          );


    tools.setState(
      "opacity",
      opacity
    );


    const percentage =
      Math.round(
        opacity *
        100
      );


    if (
      updateControl &&
      dom.toolOpacityInput
    ) {

      dom.toolOpacityInput.value =
        String(
          percentage
        );

    }


    if (dom.toolOpacityOutput) {

      dom.toolOpacityOutput.textContent =
        `${percentage}%`;

    }


    return opacity;

  }


  function setHardness(
    value,
    {
      valueIsPercentage = false,
      updateControl = true
    } = {}
  ) {

    const hardness =
      valueIsPercentage
        ? clamp(
            value,
            0,
            100
          ) /
          100
        : clamp(
            value,
            0,
            1
          );


    tools.setState(
      "hardness",
      hardness
    );


    const percentage =
      Math.round(
        hardness *
        100
      );


    if (
      updateControl &&
      dom.brushHardnessInput
    ) {

      dom.brushHardnessInput.value =
        String(
          percentage
        );

    }


    if (dom.brushHardnessOutput) {

      dom.brushHardnessOutput.textContent =
        `${percentage}%`;

    }


    return hardness;

  }


  function setPrimaryColour(
    colour,
    {
      updateControls = true
    } = {}
  ) {

    const normalised =
      normaliseHexColour(
        colour
      );


    if (!normalised) {

      return false;

    }


    tools.setState(
      "primaryColour",
      normalised
    );


    if (updateControls) {

      if (dom.primaryColourInput) {

        dom.primaryColourInput.value =
          normalised;

      }


      if (dom.panelColourPicker) {

        dom.panelColourPicker.value =
          normalised;

      }


      if (dom.hexColourInput) {

        dom.hexColourInput.value =
          normalised.toUpperCase();

      }


      if (dom.primaryColourChip) {

        dom.primaryColourChip.style.background =
          normalised;

      }

    }


    dispatchEvent(
      "paintless:primary-colour-changed",
      {
        colour:
          normalised
      }
    );


    return true;

  }


  function setSecondaryColour(
    colour,
    {
      updateControls = true
    } = {}
  ) {

    const normalised =
      normaliseHexColour(
        colour
      );


    if (!normalised) {

      return false;

    }


    tools.setState(
      "secondaryColour",
      normalised
    );


    if (
      updateControls &&
      dom.secondaryColourChip
    ) {

      dom.secondaryColourChip.style.background =
        normalised;

    }


    dispatchEvent(
      "paintless:secondary-colour-changed",
      {
        colour:
          normalised
      }
    );


    return true;

  }


  function swapColours() {

    const primaryColour =
      tools.getState(
        "primaryColour"
      );


    const secondaryColour =
      tools.getState(
        "secondaryColour"
      );


    setPrimaryColour(
      secondaryColour
    );


    setSecondaryColour(
      primaryColour
    );


    return {

      primaryColour:
        tools.getState(
          "primaryColour"
        ),

      secondaryColour:
        tools.getState(
          "secondaryColour"
        )

    };

  }


  function setSelectedShape(
    shapeName
  ) {

    const allowedShapes = [
      "ellipse",
      "rectangle",
      "rounded-rectangle",
      "line"
    ];


    if (
      !allowedShapes.includes(
        shapeName
      )
    ) {

      return false;

    }


    tools.setState(
      "selectedShape",
      shapeName
    );


    if (dom.shapeTypeInput) {

      dom.shapeTypeInput.value =
        shapeName;

    }


    dispatchEvent(
      "paintless:shape-changed",
      {
        shape:
          shapeName
      }
    );


    return true;

  }


  function setShapeFillEnabled(
    enabled
  ) {

    const safeValue =
      Boolean(
        enabled
      );


    tools.setState(
      "shapeFillEnabled",
      safeValue
    );


    if (dom.shapeFillEnabledInput) {

      dom.shapeFillEnabledInput.checked =
        safeValue;

    }


    return safeValue;

  }


  function setShapeStrokeEnabled(
    enabled
  ) {

    const safeValue =
      Boolean(
        enabled
      );


    tools.setState(
      "shapeStrokeEnabled",
      safeValue
    );


    if (dom.shapeStrokeEnabledInput) {

      dom.shapeStrokeEnabledInput.checked =
        safeValue;

    }


    return safeValue;

  }


  function setShapeCornerRadius(
    value
  ) {

    const radius =
      clamp(
        value,
        0,
        100
      );


    tools.setState(
      "shapeCornerRadius",
      radius
    );


    if (dom.shapeCornerRadiusInput) {

      dom.shapeCornerRadiusInput.value =
        String(
          radius
        );

    }


    if (dom.shapeCornerRadiusOutput) {

      dom.shapeCornerRadiusOutput.textContent =
        `${Math.round(
          radius
        )} px`;

    }


    return radius;

  }


  function getTextSettings() {

    return {

      fontFamily:
        dom.textFontFamilyInput?.value ||
        "Segoe UI",

      fontSize:
        clamp(
          dom.textFontSizeInput?.value ||
          32,
          6,
          500
        ),

      bold:
        Boolean(
          dom.textBoldInput?.checked
        ),

      italic:
        Boolean(
          dom.textItalicInput?.checked
        ),

      fontWeight:
        dom.textBoldInput?.checked
          ? "700"
          : "400",

      fontStyle:
        dom.textItalicInput?.checked
          ? "italic"
          : "normal"

    };

  }


  /* =======================================================
     12. TOOL OPTION VISIBILITY
  ======================================================= */

  function hideAllToolOptions() {

    [
      dom.brushOptions,
      dom.opacityOptions,
      dom.hardnessOptions,
      dom.shapeOptions,
      dom.selectionOptions,
      dom.textOptions
    ].forEach(
      (element) => {

        if (element) {

          element.hidden =
            true;

        }

      }
    );

  }


  function showToolOptions(
    optionNames =
      []
  ) {

    hideAllToolOptions();


    const optionMap = {

      brush:
        dom.brushOptions,

      opacity:
        dom.opacityOptions,

      hardness:
        dom.hardnessOptions,

      shape:
        dom.shapeOptions,

      selection:
        dom.selectionOptions,

      text:
        dom.textOptions

    };


    optionNames.forEach(
      (optionName) => {

        const element =
          optionMap[
            optionName
          ];


        if (element) {

          element.hidden =
            false;

        }

      }
    );

  }


  /* =======================================================
     13. CANVAS CURSOR
  ======================================================= */

  function setCanvasCursor(
    cursorName =
      "default"
  ) {

    getCanvasApi()
      ?.setCanvasCursor?.(
        cursorName
      );


    if (dom.editorCanvas) {

      dom.editorCanvas.style.cursor =
        cursorName;

    }

  }


  /* =======================================================
     14. COMMON DRAWING HELPERS
  ======================================================= */

  function createRoundedRectanglePath(
    context,
    rectangle,
    radius
  ) {

    const safeRadius =
      Math.min(
        Math.max(
          0,
          radius
        ),
        rectangle.width /
          2,
        rectangle.height /
          2
      );


    context.beginPath();


    context.moveTo(
      rectangle.x +
        safeRadius,
      rectangle.y
    );


    context.lineTo(
      rectangle.x +
        rectangle.width -
        safeRadius,
      rectangle.y
    );


    context.quadraticCurveTo(
      rectangle.x +
        rectangle.width,
      rectangle.y,
      rectangle.x +
        rectangle.width,
      rectangle.y +
        safeRadius
    );


    context.lineTo(
      rectangle.x +
        rectangle.width,
      rectangle.y +
        rectangle.height -
        safeRadius
    );


    context.quadraticCurveTo(
      rectangle.x +
        rectangle.width,
      rectangle.y +
        rectangle.height,
      rectangle.x +
        rectangle.width -
        safeRadius,
      rectangle.y +
        rectangle.height
    );


    context.lineTo(
      rectangle.x +
        safeRadius,
      rectangle.y +
        rectangle.height
    );


    context.quadraticCurveTo(
      rectangle.x,
      rectangle.y +
        rectangle.height,
      rectangle.x,
      rectangle.y +
        rectangle.height -
        safeRadius
    );


    context.lineTo(
      rectangle.x,
      rectangle.y +
        safeRadius
    );


    context.quadraticCurveTo(
      rectangle.x,
      rectangle.y,
      rectangle.x +
        safeRadius,
      rectangle.y
    );


    context.closePath();

  }


  function stampCircle(
    context,
    x,
    y,
    radius,
    {
      colour =
        "#000000",

      opacity =
        1,

      compositeOperation =
        "source-over"
    } = {}
  ) {

    if (!context) {

      return false;

    }


    context.save();

    context.globalAlpha =
      clamp(
        opacity,
        0,
        1
      );

    context.globalCompositeOperation =
      compositeOperation;

    context.fillStyle =
      colour;

    context.beginPath();

    context.arc(
      x,
      y,
      Math.max(
        0.5,
        radius
      ),
      0,
      Math.PI *
        2
    );

    context.fill();

    context.restore();


    return true;

  }


  /* =======================================================
     15. COMMON EVENT LISTENERS
  ======================================================= */

  function connectCoreControls() {

    installPreciseBrushSizeControls();


    let brushSizeRepeatTimer =
      null;


    const stopBrushSizeRepeat =
      () => {

        if (
          brushSizeRepeatTimer !==
          null
        ) {

          window.clearInterval(
            brushSizeRepeatTimer
          );

        }


        brushSizeRepeatTimer =
          null;

      };


    const beginBrushSizeRepeat =
      (amount) => {

        stopBrushSizeRepeat();


        changeBrushSizeBy(
          amount
        );


        window.setTimeout(
          () => {

            if (
              brushSizeRepeatTimer !==
              null
            ) {

              return;

            }


            brushSizeRepeatTimer =
              window.setInterval(
                () => {

                  changeBrushSizeBy(
                    amount
                  );

                },
                75
              );

          },
          320
        );

      };


    dom.brushSizeDecreaseButton
      ?.addEventListener(
        "pointerdown",
        (event) => {

          event.preventDefault();

          beginBrushSizeRepeat(
            -1
          );

        }
      );


    dom.brushSizeIncreaseButton
      ?.addEventListener(
        "pointerdown",
        (event) => {

          event.preventDefault();

          beginBrushSizeRepeat(
            1
          );

        }
      );


    [
      "pointerup",
      "pointercancel",
      "pointerleave"
    ].forEach(
      (eventName) => {

        dom.brushSizeDecreaseButton
          ?.addEventListener(
            eventName,
            stopBrushSizeRepeat
          );


        dom.brushSizeIncreaseButton
          ?.addEventListener(
            eventName,
            stopBrushSizeRepeat
          );

      }
    );


    dom.brushSizeNumberInput
      ?.addEventListener(
        "input",
        () => {

          setBrushSize(
            dom.brushSizeNumberInput.value
          );

        }
      );


    dom.brushSizeNumberInput
      ?.addEventListener(
        "change",
        () => {

          const size =
            setBrushSize(
              dom.brushSizeNumberInput.value
            );


          dom.brushSizeNumberInput.value =
            String(
              Math.round(
                size
              )
            );

        }
      );


    const handleBrushSizeWheel =
      (event) => {

        event.preventDefault();


        changeBrushSizeBy(
          event.deltaY <
            0
            ? 1
            : -1
        );

      };


    dom.brushSizeInput
      ?.addEventListener(
        "wheel",
        handleBrushSizeWheel,
        {
          passive:
            false
        }
      );


    dom.brushSizeNumberInput
      ?.addEventListener(
        "wheel",
        handleBrushSizeWheel,
        {
          passive:
            false
        }
      );


    dom.brushSizeInput
      ?.addEventListener(
        "input",
        () => {

          setBrushSize(
            dom.brushSizeInput.value
          );

        }
      );


    dom.toolOpacityInput
      ?.addEventListener(
        "input",
        () => {

          setOpacity(
            dom.toolOpacityInput.value,
            {
              valueIsPercentage:
                true
            }
          );

        }
      );


    dom.brushHardnessInput
      ?.addEventListener(
        "input",
        () => {

          setHardness(
            dom.brushHardnessInput.value,
            {
              valueIsPercentage:
                true
            }
          );

        }
      );


    dom.primaryColourInput
      ?.addEventListener(
        "input",
        () => {

          setPrimaryColour(
            dom.primaryColourInput.value
          );

        }
      );


    dom.panelColourPicker
      ?.addEventListener(
        "input",
        () => {

          setPrimaryColour(
            dom.panelColourPicker.value
          );

        }
      );


    dom.hexColourInput
      ?.addEventListener(
        "change",
        () => {

          const changed =
            setPrimaryColour(
              dom.hexColourInput.value
            );


          if (!changed) {

            dom.hexColourInput.value =
              tools
                .getState(
                  "primaryColour"
                )
                .toUpperCase();

          }

        }
      );


    dom.primaryColourChip
      ?.addEventListener(
        "click",
        () => {

          dom.primaryColourInput
            ?.click();

        }
      );


    dom.secondaryColourChip
      ?.addEventListener(
        "click",
        () => {

          const chosenColour =
            window.prompt(
              "Secondary colour:",
              tools.getState(
                "secondaryColour"
              )
            );


          if (
            chosenColour !==
            null
          ) {

            setSecondaryColour(
              chosenColour
            );

          }

        }
      );


    dom.swapColoursButton
      ?.addEventListener(
        "click",
        swapColours
      );


    dom.shapeTypeInput
      ?.addEventListener(
        "change",
        () => {

          setSelectedShape(
            dom.shapeTypeInput.value
          );

        }
      );


    dom.shapeFillEnabledInput
      ?.addEventListener(
        "change",
        () => {

          let fillEnabled =
            Boolean(
              dom.shapeFillEnabledInput
                .checked
            );


          let strokeEnabled =
            Boolean(
              dom.shapeStrokeEnabledInput
                ?.checked
            );


          if (
            !fillEnabled &&
            !strokeEnabled
          ) {

            strokeEnabled =
              true;


            if (
              dom.shapeStrokeEnabledInput
            ) {

              dom.shapeStrokeEnabledInput
                .checked =
                true;

            }

          }


          setShapeFillEnabled(
            fillEnabled
          );


          setShapeStrokeEnabled(
            strokeEnabled
          );

        }
      );


    dom.shapeStrokeEnabledInput
      ?.addEventListener(
        "change",
        () => {

          let fillEnabled =
            Boolean(
              dom.shapeFillEnabledInput
                ?.checked
            );


          let strokeEnabled =
            Boolean(
              dom.shapeStrokeEnabledInput
                .checked
            );


          if (
            !fillEnabled &&
            !strokeEnabled
          ) {

            fillEnabled =
              true;


            if (
              dom.shapeFillEnabledInput
            ) {

              dom.shapeFillEnabledInput
                .checked =
                true;

            }

          }


          setShapeFillEnabled(
            fillEnabled
          );


          setShapeStrokeEnabled(
            strokeEnabled
          );

        }
      );


    dom.shapeCornerRadiusInput
      ?.addEventListener(
        "input",
        () => {

          setShapeCornerRadius(
            dom.shapeCornerRadiusInput
              .value
          );

        }
      );


    window.addEventListener(
      "keydown",
      (event) => {

        if (
          isTypingElement()
        ) {

          return;

        }


        if (
          event.key ===
          "Escape"
        ) {

          cancelPointerAction();

        }


        if (
          event.key.toLowerCase() ===
          "x"
        ) {

          event.preventDefault();

          swapColours();

        }


        if (
          event.key ===
          "["
        ) {

          event.preventDefault();


          setBrushSize(
            tools.getState(
              "brushSize"
            ) -
            2
          );

        }


        if (
          event.key ===
          "]"
        ) {

          event.preventDefault();


          setBrushSize(
            tools.getState(
              "brushSize"
            ) +
            2
          );

        }

      }
    );


    document.addEventListener(
      "paintless:document-reset",
      () => {

        coreState.documentReady =
          true;

        clearOverlay();

      }
    );


    document.addEventListener(
      "paintless:image-layer-created",
      () => {

        coreState.documentReady =
          true;

        clearOverlay();

      }
    );


    document.addEventListener(
      "paintless:document-resized",
      clearOverlay
    );

  }


  /* =======================================================
     16. INITIAL SETTINGS
  ======================================================= */

  function initialiseSettingsFromControls() {

    const startingPrimaryColour =
      normaliseHexColour(
        dom.primaryColourInput?.value
      ) ||
      tools.getState(
        "primaryColour"
      ) ||
      "#a84cff";


    const startingSecondaryColour =
      tools.getState(
        "secondaryColour"
      ) ||
      "#ffffff";


    const startingBrushSize =
      Number(
        dom.brushSizeInput?.value
      ) ||
      tools.getState(
        "brushSize"
      ) ||
      20;


    const startingOpacity =
      Number(
        dom.toolOpacityInput?.value
      ) ||
      100;


    const startingHardness =
      Number(
        dom.brushHardnessInput?.value
      ) ||
      80;


    const startingShape =
      dom.shapeTypeInput?.value ||
      tools.getState(
        "selectedShape"
      ) ||
      "ellipse";


    const startingShapeFill =
      Boolean(
        dom.shapeFillEnabledInput?.checked
      );


    const startingShapeStroke =
      dom.shapeStrokeEnabledInput
        ? Boolean(
            dom.shapeStrokeEnabledInput
              .checked
          )
        : true;


    const startingCornerRadius =
      Number(
        dom.shapeCornerRadiusInput?.value
      ) ||
      24;


    setPrimaryColour(
      startingPrimaryColour
    );


    setSecondaryColour(
      startingSecondaryColour
    );


    setBrushSize(
      startingBrushSize
    );


    setOpacity(
      startingOpacity,
      {
        valueIsPercentage:
          true
      }
    );


    setHardness(
      startingHardness,
      {
        valueIsPercentage:
          true
      }
    );


    setSelectedShape(
      startingShape
    );


    setShapeFillEnabled(
      startingShapeFill
    );


    setShapeStrokeEnabled(
      startingShapeStroke
    );


    setShapeCornerRadius(
      startingCornerRadius
    );

  }


  /* =======================================================
     17. CORE MODULE
  ======================================================= */

  const coreModule = {

    name:
      "Core",

    label:
      "Core",

    initialised:
      false,


    async initialise() {

      if (
        coreState.initialised
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
          "Paintless core could not find the editor canvas."
        );

      }


      connectCoreControls();

      initialiseSettingsFromControls();


      coreState.documentReady =
        isDocumentOpen();


      coreState.initialised =
        true;


      this.initialised =
        true;


      dispatchEvent(
        "paintless:core-ready",
        {
          core:
            publicApi
        }
      );


      console.log(
        "%cPaintless core ready.",
        [
          "color:#35e7ff",
          "font-weight:bold",
          "font-size:13px"
        ].join(";")
      );


      return true;

    }

  };


  /* =======================================================
     18. PUBLIC CORE API
  ======================================================= */

  const publicApi = {

    dom,

    state:
      coreState,


    byId,

    clamp,

    lerp,

    distanceBetween,

    copyPoint,

    getNormalisedRectangle,

    normaliseHexColour,

    hexToRgb,

    rgbToHex,

    rgbaString,

    isTypingElement,


    collectDomReferences,


    getCanvasApi,

    getLayersApi,

    getHistoryApi,

    getFilesApi,

    getActiveLayer,

    getDocumentSize,

    isDocumentOpen,

    canEditActiveLayer,


    dispatchEvent,

    sendStatusMessage,

    requestHistorySave,

    queueHistorySave,

    beginHistoryTransaction,

    markHistoryTransactionChanged,

    endHistoryTransaction,

    cancelHistoryTransaction,


    renderLayers,

    renderLayerList,

    refreshCanvas,

    clearOverlay,

    resetContext,


    getCanvasPoint,

    canvasToClient,

    constrainPointToCanvas,


    beginPointerAction,

    updatePointerAction,

    advancePointerPoint,

    markCanvasChanged,

    endPointerAction,

    resetPointerState,

    cancelPointerAction,

    getPointerState,


    setBrushSize,

    setOpacity,

    setHardness,

    setPrimaryColour,

    setSecondaryColour,

    swapColours,

    setSelectedShape,

    setShapeFillEnabled,

    setShapeStrokeEnabled,

    setShapeCornerRadius,

    getTextSettings,


    hideAllToolOptions,

    showToolOptions,

    setCanvasCursor,


    createRoundedRectanglePath,

    stampCircle,


    getOverlayContext() {

      return overlayContext;

    },


    getEditorCanvas() {

      return dom.editorCanvas;

    },


    getOverlayCanvas() {

      return dom.overlayCanvas;

    },


    getToolState(
      propertyName =
        null
    ) {

      return tools.getState(
        propertyName
      );

    },


    setToolState(
      propertyName,
      value,
      options =
        {}
    ) {

      return tools.setState(
        propertyName,
        value,
        options
      );

    }

  };


  /*
   * Direct access for modules that need the core foundation.
   */

  window.PaintlessToolCore =
    publicApi;


  /* =======================================================
     19. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "core",
    coreModule
  );

})();
