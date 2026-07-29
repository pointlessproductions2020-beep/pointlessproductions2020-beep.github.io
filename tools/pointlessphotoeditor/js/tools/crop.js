"use strict";

/* =========================================================
   PAINTLESS
   CROP TOOL — v1.0

   File:
   js/tools/crop.js

   Features:
   - Drag to define a crop area
   - Uses an existing rectangular selection when available
   - Darkened outside-area preview
   - Visible crop border and dimensions
   - Enter or double-click applies the crop
   - Escape cancels
   - Crops every layer together
   - Preserves layer names, visibility, opacity and blend modes
   - One completed crop = one Undo step
   - Mouse, touch and pen support
   - Safe cancellation

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
      "Paintless Crop could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. CROP STATE
  ======================================================= */

  const cropState = {

    initialised:
      false,

    active:
      false,

    drawing:
      false,

    ready:
      false,

    startPoint:
      null,

    currentPoint:
      null,

    rectangle:
      null,

    minimumSize:
      2,

    useSelectionOnActivate:
      true,

    awaitingConfirmation:
      false

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    editorCanvas:
      null,

    overlayCanvas:
      null,

    canvasStage:
      null,

    canvasViewport:
      null,

    canvasSizeStatus:
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

      inside:
        Boolean(
          point.inside
        )

    };

  }


  function copyRectangle(
    rectangle
  ) {

    if (!rectangle) {

      return null;

    }


    return {

      x:
        Number(
          rectangle.x
        ) ||
        0,

      y:
        Number(
          rectangle.y
        ) ||
        0,

      width:
        Number(
          rectangle.width
        ) ||
        0,

      height:
        Number(
          rectangle.height
        ) ||
        0

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


  function renderLayerList() {

    if (
      typeof getLayersApi()
        ?.renderLayerList ===
      "function"
    ) {

      getLayersApi()
        .renderLayerList();


      return;

    }


    getCore()
      ?.renderLayerList?.();

  }


  function getDocumentSize() {

    return (
      getLayersApi()
        ?.getDocumentSize?.() ||
      getCore()
        ?.getDocumentSize?.() ||
      {
        width:
          dom.editorCanvas?.width ||
          0,

        height:
          dom.editorCanvas?.height ||
          0
      }
    );

  }


  function isTypingElement() {

    return Boolean(
      getCore()
        ?.isTypingElement?.()
    );

  }


  /* =======================================================
     6. RECTANGLE CONTROL
  ======================================================= */

  function constrainRectangleToDocument(
    rectangle
  ) {

    const size =
      getDocumentSize();


    const left =
      clamp(
        Math.floor(
          rectangle.x
        ),
        0,
        Math.max(
          0,
          size.width -
          1
        )
      );


    const top =
      clamp(
        Math.floor(
          rectangle.y
        ),
        0,
        Math.max(
          0,
          size.height -
          1
        )
      );


    const right =
      clamp(
        Math.ceil(
          rectangle.x +
          rectangle.width
        ),
        left +
          1,
        size.width
      );


    const bottom =
      clamp(
        Math.ceil(
          rectangle.y +
          rectangle.height
        ),
        top +
          1,
        size.height
      );


    return {

      x:
        left,

      y:
        top,

      width:
        right -
        left,

      height:
        bottom -
        top

    };

  }


  function rectangleIsValid(
    rectangle
  ) {

    return Boolean(
      rectangle &&
      rectangle.width >=
        cropState.minimumSize &&
      rectangle.height >=
        cropState.minimumSize
    );

  }


  function setCropRectangle(
    rectangle,
    {
      preview =
        true,

      announce =
        false
    } = {}
  ) {

    if (!rectangle) {

      return false;

    }


    const constrainedRectangle =
      constrainRectangleToDocument(
        rectangle
      );


    if (
      !rectangleIsValid(
        constrainedRectangle
      )
    ) {

      return false;

    }


    cropState.rectangle =
      constrainedRectangle;


    cropState.ready =
      true;


    cropState.awaitingConfirmation =
      true;


    if (preview) {

      drawCropPreview(
        constrainedRectangle
      );

    }


    if (announce) {

      sendStatusMessage(
        `${constrainedRectangle.width} × ${constrainedRectangle.height} crop ready. Press Enter to apply.`
      );

    }


    document.dispatchEvent(
      new CustomEvent(
        "paintless:crop-area-changed",
        {
          detail: {
            rectangle:
              copyRectangle(
                constrainedRectangle
              )
          }
        }
      )
    );


    return true;

  }


  function clearCropRectangle() {

    cropState.rectangle =
      null;


    cropState.ready =
      false;


    cropState.awaitingConfirmation =
      false;


    clearOverlay();

  }


  /* =======================================================
     7. SELECTION INTEGRATION
  ======================================================= */

  function getRectangleSelection() {

    const selectionApi =
      getSelectionApi();


    if (
      !selectionApi?.hasSelection?.()
    ) {

      return null;

    }


    const information =
      selectionApi
        .getSelectionInformation?.();


    const rectangle =
      information?.rectangle;


    if (
      !rectangle ||
      !rectangleIsValid(
        rectangle
      )
    ) {

      return null;

    }


    return constrainRectangleToDocument(
      rectangle
    );

  }


  function useCurrentSelection() {

    const rectangle =
      getRectangleSelection();


    if (!rectangle) {

      return false;

    }


    setCropRectangle(
      rectangle,
      {
        preview:
          true,

        announce:
          true
      }
    );


    return true;

  }


  /* =======================================================
     8. PREVIEW
  ======================================================= */

  function drawCropPreview(
    rectangle
  ) {

    if (
      !overlayContext ||
      !dom.overlayCanvas ||
      !rectangle
    ) {

      return false;

    }


    clearOverlay();


    const canvasWidth =
      dom.overlayCanvas.width;


    const canvasHeight =
      dom.overlayCanvas.height;


    overlayContext.save();


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


    /*
     * Darken the entire canvas.
     */

    overlayContext.fillStyle =
      "rgba(0, 0, 0, 0.62)";


    overlayContext.fillRect(
      0,
      0,
      canvasWidth,
      canvasHeight
    );


    /*
     * Reveal the crop area.
     */

    overlayContext.globalCompositeOperation =
      "destination-out";


    overlayContext.fillStyle =
      "#000000";


    overlayContext.fillRect(
      rectangle.x,
      rectangle.y,
      rectangle.width,
      rectangle.height
    );


    overlayContext.globalCompositeOperation =
      "source-over";


    /*
     * Crop border.
     */

    overlayContext.lineWidth =
      1.5;


    overlayContext.strokeStyle =
      "rgba(255, 255, 255, 0.98)";


    overlayContext.setLineDash(
      [
        8,
        5
      ]
    );


    overlayContext.strokeRect(
      rectangle.x +
        0.5,
      rectangle.y +
        0.5,
      rectangle.width,
      rectangle.height
    );


    overlayContext.setLineDash(
      []
    );


    /*
     * Corner handles.
     */

    const handleSize =
      7;


    const handles = [

      {
        x:
          rectangle.x,

        y:
          rectangle.y
      },

      {
        x:
          rectangle.x +
          rectangle.width,

        y:
          rectangle.y
      },

      {
        x:
          rectangle.x,

        y:
          rectangle.y +
          rectangle.height
      },

      {
        x:
          rectangle.x +
          rectangle.width,

        y:
          rectangle.y +
          rectangle.height
      }

    ];


    handles.forEach(
      (handle) => {

        overlayContext.fillStyle =
          "#a84cff";


        overlayContext.fillRect(
          handle.x -
            handleSize /
            2,
          handle.y -
            handleSize /
            2,
          handleSize,
          handleSize
        );


        overlayContext.strokeStyle =
          "#ffffff";


        overlayContext.lineWidth =
          1;


        overlayContext.strokeRect(
          handle.x -
            handleSize /
            2,
          handle.y -
            handleSize /
            2,
          handleSize,
          handleSize
        );

      }
    );


    /*
     * Dimensions label.
     */

    const labelText =
      `${rectangle.width} × ${rectangle.height}`;


    overlayContext.font =
      "600 13px Segoe UI, Arial, sans-serif";


    overlayContext.textBaseline =
      "middle";


    const labelWidth =
      overlayContext.measureText(
        labelText
      ).width +
      18;


    const labelHeight =
      26;


    let labelX =
      rectangle.x +
      rectangle.width /
      2 -
      labelWidth /
      2;


    let labelY =
      rectangle.y -
      labelHeight -
      8;


    if (
      labelY <
      4
    ) {

      labelY =
        rectangle.y +
        8;

    }


    labelX =
      clamp(
        labelX,
        4,
        canvasWidth -
        labelWidth -
        4
      );


    overlayContext.fillStyle =
      "rgba(10, 7, 18, 0.94)";


    overlayContext.fillRect(
      labelX,
      labelY,
      labelWidth,
      labelHeight
    );


    overlayContext.strokeStyle =
      "rgba(168, 76, 255, 0.95)";


    overlayContext.strokeRect(
      labelX +
        0.5,
      labelY +
        0.5,
      labelWidth -
        1,
      labelHeight -
        1
    );


    overlayContext.fillStyle =
      "#ffffff";


    overlayContext.fillText(
      labelText,
      labelX +
        9,
      labelY +
        labelHeight /
        2
    );


    overlayContext.restore();


    return true;

  }


  /* =======================================================
     9. LAYER SNAPSHOT HELPERS
  ======================================================= */

  function getLayersCollection() {

    const layersApi =
      getLayersApi();


    if (
      Array.isArray(
        layersApi?.layers
      )
    ) {

      return layersApi.layers;

    }


    if (
      typeof layersApi?.getLayers ===
      "function"
    ) {

      const layers =
        layersApi.getLayers();


      if (
        Array.isArray(
          layers
        )
      ) {

        return layers;

      }

    }


    return [];

  }


  function cropLayerCanvas(
    layer,
    rectangle
  ) {

    if (
      !layer?.canvas ||
      !layer?.context
    ) {

      return false;

    }


    const croppedCanvas =
      document.createElement(
        "canvas"
      );


    croppedCanvas.width =
      rectangle.width;


    croppedCanvas.height =
      rectangle.height;


    const croppedContext =
      croppedCanvas.getContext(
        "2d",
        {
          alpha:
            true
        }
      );


    croppedContext.drawImage(
      layer.canvas,
      rectangle.x,
      rectangle.y,
      rectangle.width,
      rectangle.height,
      0,
      0,
      rectangle.width,
      rectangle.height
    );


    layer.canvas.width =
      rectangle.width;


    layer.canvas.height =
      rectangle.height;


    /*
     * Resizing a canvas resets its context state.
     */

    layer.context =
      layer.canvas.getContext(
        "2d",
        {
          alpha:
            true,
          willReadFrequently:
            true
        }
      );


    layer.context.drawImage(
      croppedCanvas,
      0,
      0
    );


    if (
      Object.prototype.hasOwnProperty.call(
        layer,
        "width"
      )
    ) {

      layer.width =
        rectangle.width;

    }


    if (
      Object.prototype.hasOwnProperty.call(
        layer,
        "height"
      )
    ) {

      layer.height =
        rectangle.height;

    }


    return true;

  }


  /* =======================================================
     10. DOCUMENT SIZE SYNCHRONISATION
  ======================================================= */

  function updateLayersDocumentSize(
    width,
    height
  ) {

    const layersApi =
      getLayersApi();


    const sizeFunctions = [
      "setDocumentSize",
      "updateDocumentSize",
      "resizeDocument"
    ];


    for (
      const functionName of
      sizeFunctions
    ) {

      if (
        typeof layersApi?.[
          functionName
        ] !==
        "function"
      ) {

        continue;

      }


      try {

        const result =
          layersApi[
            functionName
          ](
            width,
            height,
            {
              preserveLayers:
                true,

              render:
                false
            }
          );


        if (
          result !==
          false
        ) {

          return true;

        }

      } catch (error) {

        /*
         * Some APIs may expect an object instead.
         */

        try {

          const result =
            layersApi[
              functionName
            ]({
              width,
              height,
              preserveLayers:
                true,
              render:
                false
            });


          if (
            result !==
            false
          ) {

            return true;

          }

        } catch (secondaryError) {

          /*
           * Continue to direct-property fallback.
           */

        }

      }

    }


    if (
      Object.prototype.hasOwnProperty.call(
        layersApi ||
          {},
        "documentWidth"
      )
    ) {

      layersApi.documentWidth =
        width;

    }


    if (
      Object.prototype.hasOwnProperty.call(
        layersApi ||
          {},
        "documentHeight"
      )
    ) {

      layersApi.documentHeight =
        height;

    }


    return true;

  }


  function updateVisibleCanvases(
    width,
    height
  ) {

    if (dom.editorCanvas) {

      dom.editorCanvas.width =
        width;


      dom.editorCanvas.height =
        height;

    }


    if (dom.overlayCanvas) {

      dom.overlayCanvas.width =
        width;


      dom.overlayCanvas.height =
        height;


      overlayContext =
        dom.overlayCanvas.getContext(
          "2d"
        );

    }


    if (dom.canvasSizeStatus) {

      dom.canvasSizeStatus.textContent =
        `${width} × ${height} px`;

    }

  }


  function refreshDocumentDisplay() {

    const canvasApi =
      getCanvasApi();


    renderLayerList();

    renderLayers();


    canvasApi
      ?.updateStageDimensions?.();


    canvasApi
      ?.updateDocumentInformation?.();


    canvasApi
      ?.fitCanvasToScreen?.();


    requestAnimationFrame(
      () => {

        canvasApi
          ?.updateStageDimensions?.();


        renderLayers();

      }
    );

  }


  /* =======================================================
     11. APPLY CROP
  ======================================================= */

  function applyCrop(
    rectangle =
      cropState.rectangle
  ) {

    if (
      !cropState.active ||
      !rectangle
    ) {

      return false;

    }


    const safeRectangle =
      constrainRectangleToDocument(
        rectangle
      );


    if (
      !rectangleIsValid(
        safeRectangle
      )
    ) {

      sendStatusMessage(
        "The crop area is too small."
      );


      return false;

    }


    const documentSize =
      getDocumentSize();


    if (
      safeRectangle.x ===
        0 &&
      safeRectangle.y ===
        0 &&
      safeRectangle.width ===
        documentSize.width &&
      safeRectangle.height ===
        documentSize.height
    ) {

      sendStatusMessage(
        "That crop already covers the entire canvas."
      );


      return false;

    }


    const layers =
      getLayersCollection();


    if (
      layers.length ===
      0
    ) {

      sendStatusMessage(
        "There are no layers to crop."
      );


      return false;

    }


    try {

      let croppedLayers =
        0;


      layers.forEach(
        (layer) => {

          if (
            cropLayerCanvas(
              layer,
              safeRectangle
            )
          ) {

            croppedLayers +=
              1;

          }

        }
      );


      if (
        croppedLayers ===
        0
      ) {

        throw new Error(
          "No layer canvases could be cropped."
        );

      }


      updateLayersDocumentSize(
        safeRectangle.width,
        safeRectangle.height
      );


      updateVisibleCanvases(
        safeRectangle.width,
        safeRectangle.height
      );


      refreshDocumentDisplay();


      getSelectionApi()
        ?.deselect?.({
          announce:
            false
        });


      saveCropHistory();


      document.dispatchEvent(
        new CustomEvent(
          "paintless:document-resized",
          {
            detail: {

              reason:
                "crop",

              width:
                safeRectangle.width,

              height:
                safeRectangle.height,

              previousWidth:
                documentSize.width,

              previousHeight:
                documentSize.height,

              cropRectangle:
                copyRectangle(
                  safeRectangle
                )

            }
          }
        )
      );


      document.dispatchEvent(
        new CustomEvent(
          "paintless:crop-applied",
          {
            detail: {

              rectangle:
                copyRectangle(
                  safeRectangle
                ),

              width:
                safeRectangle.width,

              height:
                safeRectangle.height,

              croppedLayers

            }
          }
        )
      );


      clearCropRectangle();


      sendStatusMessage(
        `Canvas cropped to ${safeRectangle.width} × ${safeRectangle.height} px.`
      );


      return true;

    } catch (error) {

      console.error(
        "Paintless Crop failed:",
        error
      );


      sendStatusMessage(
        "Crop failed. The canvas refused to shrink."
      );


      return false;

    }

  }


  /* =======================================================
     12. HISTORY
  ======================================================= */

  function saveCropHistory() {

    if (
      typeof getHistoryApi()
        ?.saveHistory ===
      "function"
    ) {

      return getHistoryApi()
        .saveHistory(
          "Crop canvas"
        );

    }


    if (
      typeof getCore()
        ?.requestHistorySave ===
      "function"
    ) {

      return getCore()
        .requestHistorySave(
          "Crop canvas"
        );

    }


    document.dispatchEvent(
      new CustomEvent(
        "paintless:history-requested",
        {
          detail: {
            reason:
              "Crop canvas"
          }
        }
      )
    );


    return true;

  }


  /* =======================================================
     13. CROP LIFECYCLE
  ======================================================= */

  function beginCrop(
    payload
  ) {

    cropState.drawing =
      true;


    cropState.ready =
      false;


    cropState.awaitingConfirmation =
      false;


    cropState.startPoint =
      copyPoint(
        payload.point
      );


    cropState.currentPoint =
      copyPoint(
        payload.point
      );


    cropState.rectangle =
      null;


    clearOverlay();


    return true;

  }


  function updateCrop(
    payload
  ) {

    if (
      !cropState.drawing ||
      !cropState.startPoint
    ) {

      return false;

    }


    cropState.currentPoint =
      copyPoint(
        payload.point
      );


    let rectangle =
      getNormalisedRectangle(
        cropState.startPoint,
        cropState.currentPoint
      );


    /*
     * Hold Shift for a square crop.
     */

    if (
      payload.shiftKey
    ) {

      const size =
        Math.max(
          rectangle.width,
          rectangle.height
        );


      const directionX =
        cropState.currentPoint.x >=
          cropState.startPoint.x
          ? 1
          : -1;


      const directionY =
        cropState.currentPoint.y >=
          cropState.startPoint.y
          ? 1
          : -1;


      rectangle =
        getNormalisedRectangle(
          cropState.startPoint,
          {
            x:
              cropState.startPoint.x +
              directionX *
              size,

            y:
              cropState.startPoint.y +
              directionY *
              size
          }
        );

    }


    rectangle =
      constrainRectangleToDocument(
        rectangle
      );


    cropState.rectangle =
      rectangle;


    drawCropPreview(
      rectangle
    );


    return true;

  }


  function finishCrop(
    payload
  ) {

    if (
      !cropState.drawing
    ) {

      return false;

    }


    updateCrop(
      payload
    );


    cropState.drawing =
      false;


    if (
      !rectangleIsValid(
        cropState.rectangle
      )
    ) {

      clearCropRectangle();


      sendStatusMessage(
        "Crop cancelled because the area was too small."
      );


      return false;

    }


    cropState.ready =
      true;


    cropState.awaitingConfirmation =
      true;


    drawCropPreview(
      cropState.rectangle
    );


    sendStatusMessage(
      `${cropState.rectangle.width} × ${cropState.rectangle.height} crop ready. Press Enter or double-click to apply.`
    );


    return true;

  }


  function cancelCrop({
    announce =
      true
  } = {}) {

    cropState.drawing =
      false;


    cropState.startPoint =
      null;


    cropState.currentPoint =
      null;


    clearCropRectangle();


    if (announce) {

      sendStatusMessage(
        "Crop cancelled."
      );

    }


    return true;

  }


  /* =======================================================
     14. POINTER HANDLERS
  ======================================================= */

  function pointerDown(
    payload
  ) {

    if (
      !cropState.active
    ) {

      return false;

    }


    beginCrop(
      payload
    );


    return {

      changed:
        false,

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
      !cropState.active ||
      !cropState.drawing
    ) {

      return false;

    }


    updateCrop(
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
      !cropState.drawing
    ) {

      return {

        changed:
          false,

        releasePointer:
          true
      };

    }


    finishCrop(
      payload
    );


    return {

      changed:
        false,

      preventDefault:
        true,

      releasePointer:
        true

    };

  }


  function pointerCancel() {

    cancelCrop();


    return {

      changed:
        false,

      releasePointer:
        true,

      clearOverlay:
        true

    };

  }


  /* =======================================================
     15. TOOL ACTIVATION
  ======================================================= */

  function activate() {

    cropState.active =
      true;


    getCore()
      ?.showToolOptions?.(
        []
      );


    getCore()
      ?.setCanvasCursor?.(
        "crosshair"
      );


    if (
      cropState.useSelectionOnActivate &&
      useCurrentSelection()
    ) {

      return true;

    }


    sendStatusMessage(
      "Crop ready. Drag an area, then press Enter."
    );


    return true;

  }


  function deactivate() {

    cropState.active =
      false;


    cancelCrop({
      announce:
        false
    });


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


    dom.canvasStage =
      document.getElementById(
        "canvas-stage"
      );


    dom.canvasViewport =
      document.getElementById(
        "canvas-viewport"
      );


    dom.canvasSizeStatus =
      document.getElementById(
        "canvas-size-status"
      );


    overlayContext =
      dom.overlayCanvas
        ?.getContext(
          "2d"
        ) ||
      null;

  }


  function connectEvents() {

    window.addEventListener(
      "keydown",
      (event) => {

        if (
          !cropState.active ||
          isTypingElement()
        ) {

          return;

        }


        if (
          event.key ===
          "Escape"
        ) {

          event.preventDefault();


          cancelCrop();


          return;

        }


        if (
          event.key ===
            "Enter" &&
          cropState.ready
        ) {

          event.preventDefault();


          applyCrop();

        }

      }
    );


    dom.editorCanvas
      ?.addEventListener(
        "dblclick",
        (event) => {

          if (
            !cropState.active ||
            !cropState.ready
          ) {

            return;

          }


          event.preventDefault();


          applyCrop();

        }
      );


    document.addEventListener(
      "paintless:selection-changed",
      () => {

        if (
          !cropState.active ||
          cropState.drawing
        ) {

          return;

        }


        if (
          cropState.useSelectionOnActivate
        ) {

          useCurrentSelection();

        }

      }
    );


    document.addEventListener(
      "paintless:history-restored",
      () => {

        cancelCrop({
          announce:
            false
        });

      }
    );


    document.addEventListener(
      "paintless:document-reset",
      () => {

        cancelCrop({
          announce:
            false
        });

      }
    );


    document.addEventListener(
      "paintless:document-resized",
      (event) => {

        if (
          event.detail?.reason ===
          "crop"
        ) {

          return;

        }


        cancelCrop({
          announce:
            false
        });

      }
    );

  }


  /* =======================================================
     17. CROP MODULE
  ======================================================= */

  const cropModule = {

    name:
      "Crop",

    label:
      "Crop",

    initialised:
      false,


    async initialise() {

      if (
        cropState.initialised
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
          "Paintless Crop could not find the editor canvases."
        );

      }


      connectEvents();


      cropState.initialised =
        true;


      this.initialised =
        true;


      if (
        tools.getActiveTool() ===
        "crop"
      ) {

        activate();

      }


      document.dispatchEvent(
        new CustomEvent(
          "paintless:crop-ready",
          {
            detail: {
              crop:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless Crop ready.",
        [
          "color:#ff5fb7",
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

    pointerCancel

  };


  /* =======================================================
     18. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      cropState,


    activate,

    deactivate,


    beginCrop,

    updateCrop,

    finishCrop,

    cancelCrop,


    applyCrop,

    setCropRectangle,

    clearCropRectangle,

    drawCropPreview,

    useCurrentSelection,


    getCropRectangle() {

      return copyRectangle(
        cropState.rectangle
      );

    },


    isCropReady() {

      return cropState.ready;

    },


    isDrawing() {

      return cropState.drawing;

    },


    setUseSelectionOnActivate(
      enabled
    ) {

      cropState.useSelectionOnActivate =
        Boolean(
          enabled
        );


      return cropState
        .useSelectionOnActivate;

    }

  };


  window.PaintlessCrop =
    publicApi;


  cropModule.api =
    publicApi;


  /* =======================================================
     19. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "crop",
    cropModule
  );

})();
