"use strict";

/* =========================================================
   PAINTLESS
   BLUR BRUSH TOOL — v1.0

   File:
   js/tools/blur.js

   Features:
   - Paints blur directly onto the active layer
   - Adjustable brush size
   - Opacity control becomes blur strength
   - Hardness controls edge softness
   - Smooth interpolated strokes
   - Mouse, touch and pen support
   - Pen-pressure support
   - Live circular cursor preview
   - One completed blur stroke = one Undo step
   - Escape restores the original layer
   - Locked-layer protection
   - Uses an isolated temporary canvas for each blur stamp
   - Selection-aware when Paintless Selection is active

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
      "Paintless Blur could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. BLUR STATE
  ======================================================= */

  const blurState = {

    initialised:
      false,

    active:
      false,

    blurring:
      false,

    changed:
      false,

    layer:
      null,

    layerBackup:
      null,

    sourceSnapshot:
      null,

    previousPoint:
      null,

    currentPoint:
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
      0.3,

    spacing:
      0.12,

    minimumSpacing:
      1,

    pressureEnabled:
      true,

    pressureSizeMinimum:
      0.3,

    pressureStrengthMinimum:
      0.3,

    minimumBlurRadius:
      0.5,

    maximumBlurRadius:
      24,

    sourceRefresh:
      0.8,

    respectSelection:
      true,

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

    opacityInput:
      null,

    hardnessInput:
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
     5. GENERAL HELPERS
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
        ),

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
      !blurState.pressureEnabled ||
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
      pressure <=
        0
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


    blurState.cursorVisible =
      false;

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
     6. SETTINGS
  ======================================================= */

  function getBlurSize() {

    return clamp(
      tools.getState(
        "brushSize"
      ) ??
      dom.brushSizeInput?.value ??
      40,
      4,
      300
    );

  }


  function getBlurStrength() {

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
      0.5,
      0.01,
      1
    );

  }


  function getBlurHardness() {

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
      0.5,
      0,
      1
    );

  }


  function getEffectiveSize(
    pressure
  ) {

    const pressureScale =
      blurState.pressureSizeMinimum +
      (
        1 -
        blurState.pressureSizeMinimum
      ) *
      pressure;


    return Math.max(
      4,
      getBlurSize() *
      pressureScale
    );

  }


  function getEffectiveStrength(
    pressure
  ) {

    const pressureScale =
      blurState.pressureStrengthMinimum +
      (
        1 -
        blurState.pressureStrengthMinimum
      ) *
      pressure;


    return clamp(
      getBlurStrength() *
      pressureScale,
      0.01,
      1
    );

  }


  function getBlurRadius(
    pressure
  ) {

    const strength =
      getEffectiveStrength(
        pressure
      );


    return clamp(
      blurState.minimumBlurRadius +
      strength *
      blurState.maximumBlurRadius,
      blurState.minimumBlurRadius,
      blurState.maximumBlurRadius
    );

  }


  function getStampSpacing(
    pressure
  ) {

    return Math.max(
      blurState.minimumSpacing,
      getEffectiveSize(
        pressure
      ) *
      blurState.spacing
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
        "That layer cannot be blurred."
      );


      return false;

    }


    return true;

  }


  function createCanvasCopy(
    sourceCanvas
  ) {

    if (!sourceCanvas) {

      return null;

    }


    const copiedCanvas =
      document.createElement(
        "canvas"
      );


    copiedCanvas.width =
      sourceCanvas.width;


    copiedCanvas.height =
      sourceCanvas.height;


    const copiedContext =
      copiedCanvas.getContext(
        "2d",
        {
          alpha:
            true,

          willReadFrequently:
            true
        }
      );


    copiedContext.drawImage(
      sourceCanvas,
      0,
      0
    );


    return copiedCanvas;

  }


  function restoreLayerBackup() {

    if (
      !blurState.layer ||
      !blurState.layerBackup
    ) {

      return false;

    }


    const layer =
      blurState.layer;


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
      blurState.layerBackup,
      0,
      0
    );


    layer.context.restore();


    renderLayers();


    return true;

  }


  /* =======================================================
     8. SELECTION HELPERS
  ======================================================= */

  function selectionIsActive() {

    return Boolean(
      blurState.respectSelection &&
      getSelectionApi()
        ?.hasSelection?.()
    );

  }


  function createSelectionMaskCanvas(
    sourceX,
    sourceY,
    width,
    height
  ) {

    if (
      !selectionIsActive()
    ) {

      return null;

    }


    const selectionApi =
      getSelectionApi();


    const selectionMask =
      selectionApi
        ?.getSelectionMask?.();


    const selectionInformation =
      selectionApi
        ?.getSelectionInformation?.();


    const maskWidth =
      selectionInformation?.width ||
      blurState.layer?.canvas?.width ||
      0;


    const maskHeight =
      selectionInformation?.height ||
      blurState.layer?.canvas?.height ||
      0;


    if (
      !selectionMask ||
      maskWidth <=
        0 ||
      maskHeight <=
        0
    ) {

      return null;

    }


    const maskCanvas =
      document.createElement(
        "canvas"
      );


    maskCanvas.width =
      width;


    maskCanvas.height =
      height;


    const maskContext =
      maskCanvas.getContext(
        "2d"
      );


    const imageData =
      maskContext.createImageData(
        width,
        height
      );


    const pixels =
      imageData.data;


    for (
      let localY = 0;
      localY < height;
      localY += 1
    ) {

      const documentY =
        Math.floor(
          sourceY +
          localY
        );


      if (
        documentY <
          0 ||
        documentY >=
          maskHeight
      ) {

        continue;

      }


      for (
        let localX = 0;
        localX < width;
        localX += 1
      ) {

        const documentX =
          Math.floor(
            sourceX +
            localX
          );


        if (
          documentX <
            0 ||
          documentX >=
            maskWidth
        ) {

          continue;

        }


        const selected =
          selectionMask[
            documentY *
            maskWidth +
            documentX
          ];


        if (!selected) {

          continue;

        }


        const pixelIndex =
          (
            localY *
            width +
            localX
          ) *
          4;


        pixels[
          pixelIndex
        ] =
          255;


        pixels[
          pixelIndex +
          1
        ] =
          255;


        pixels[
          pixelIndex +
          2
        ] =
          255;


        pixels[
          pixelIndex +
          3
        ] =
          255;

      }

    }


    maskContext.putImageData(
      imageData,
      0,
      0
    );


    return maskCanvas;

  }


  /* =======================================================
     9. BRUSH MASK
  ======================================================= */

  function createBrushMask(
    size,
    hardness,
    strength
  ) {

    const safeSize =
      Math.max(
        4,
        Math.ceil(
          size
        )
      );


    const maskCanvas =
      document.createElement(
        "canvas"
      );


    maskCanvas.width =
      safeSize;


    maskCanvas.height =
      safeSize;


    const context =
      maskCanvas.getContext(
        "2d"
      );


    const centre =
      safeSize /
      2;


    const radius =
      safeSize /
      2;


    if (
      hardness >=
      0.985
    ) {

      context.fillStyle =
        `rgba(255, 255, 255, ${strength})`;


      context.beginPath();


      context.arc(
        centre,
        centre,
        radius,
        0,
        Math.PI *
          2
      );


      context.fill();


      return maskCanvas;

    }


    const solidRadius =
      radius *
      Math.pow(
        hardness,
        1.6
      );


    const gradient =
      context.createRadialGradient(
        centre,
        centre,
        solidRadius,
        centre,
        centre,
        radius
      );


    gradient.addColorStop(
      0,
      `rgba(255, 255, 255, ${strength})`
    );


    const middleStop =
      clamp(
        hardness +
        0.16,
        0.04,
        0.92
      );


    gradient.addColorStop(
      middleStop,
      `rgba(255, 255, 255, ${
        strength *
        Math.max(
          0.1,
          hardness *
          0.7
        )
      })`
    );


    gradient.addColorStop(
      1,
      "rgba(255, 255, 255, 0)"
    );


    context.fillStyle =
      gradient;


    context.fillRect(
      0,
      0,
      safeSize,
      safeSize
    );


    return maskCanvas;

  }




  /* =======================================================
     DOCUMENT -> ACTIVE LAYER COORDINATES

     Pointer coordinates are document/canvas coordinates, but
     retouch pixels are written directly into layer.canvas.
     Match Clone's fixed behaviour by applying the inverse of
     the compositor transform first (including Paraluxious).
  ======================================================= */

  function documentPointToLayerPoint(layer, point) {

    if (!layer || !point) {
      return copyPoint(point);
    }

    const layerWidth = layer.canvas?.width || 0;
    const layerHeight = layer.canvas?.height || 0;
    const centreX = layerWidth / 2;
    const centreY = layerHeight / 2;

    const para =
      window.PaintlessParaluxious?.getLayerTransform?.(layer) ||
      { x: 0, y: 0, scale: 1 };

    const tx =
      (Number(layer.transformX) || 0) +
      centreX +
      (Number(para.x) || 0);

    const ty =
      (Number(layer.transformY) || 0) +
      centreY +
      (Number(para.y) || 0);

    const angle =
      (Number(layer.rotation) || 0) * Math.PI / 180;

    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);

    let x = Number(point.x) - tx;
    let y = Number(point.y) - ty;

    const rotatedX = x * cos - y * sin;
    const rotatedY = x * sin + y * cos;

    const paraScale = Number(para.scale) || 1;
    const scaleX = (Number(layer.scaleX) || 1) * paraScale;
    const scaleY = (Number(layer.scaleY) || 1) * paraScale;

    x = rotatedX / (Math.abs(scaleX) > 0.000001 ? scaleX : 1);
    y = rotatedY / (Math.abs(scaleY) > 0.000001 ? scaleY : 1);

    return {
      x: x + centreX,
      y: y + centreY,
      pressure: point.pressure,
      inside: point.inside
    };

  }


  /* =======================================================
     10. BLUR STAMP
  ======================================================= */

  function stampBlur(
    destinationContext,
    point
  ) {

    if (
      !destinationContext ||
      !point ||
      !blurState.sourceSnapshot
    ) {

      return false;

    }


    const layerPoint =
      documentPointToLayerPoint(
        blurState.layer,
        point
      );


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


    const stampSize =
      Math.max(
        4,
        Math.ceil(
          size
        )
      );


    const halfSize =
      stampSize /
      2;


    const strength =
      getEffectiveStrength(
        pressure
      );


    const hardness =
      getBlurHardness();


    const blurRadius =
      getBlurRadius(
        pressure
      );


    /*
     * Extra padding prevents clipped blur around the edge of
     * the temporary stamp.
     */

    const padding =
      Math.ceil(
        blurRadius *
        2
      );


    const workSize =
      stampSize +
      padding *
      2;


    const sourceX =
      layerPoint.x -
      halfSize -
      padding;


    const sourceY =
      layerPoint.y -
      halfSize -
      padding;


    const workCanvas =
      document.createElement(
        "canvas"
      );


    workCanvas.width =
      workSize;


    workCanvas.height =
      workSize;


    const workContext =
      workCanvas.getContext(
        "2d",
        {
          alpha:
            true
        }
      );


    workContext.save();


    workContext.filter =
      `blur(${blurRadius}px)`;


    workContext.drawImage(
      blurState.sourceSnapshot,
      sourceX,
      sourceY,
      workSize,
      workSize,
      0,
      0,
      workSize,
      workSize
    );


    workContext.restore();


    /*
     * Crop the padded blurred result back to the actual brush
     * size.
     */

    const stampCanvas =
      document.createElement(
        "canvas"
      );


    stampCanvas.width =
      stampSize;


    stampCanvas.height =
      stampSize;


    const stampContext =
      stampCanvas.getContext(
        "2d",
        {
          alpha:
            true
        }
      );


    stampContext.drawImage(
      workCanvas,
      padding,
      padding,
      stampSize,
      stampSize,
      0,
      0,
      stampSize,
      stampSize
    );


    /*
     * Apply circular hardness and strength mask.
     */

    const brushMask =
      createBrushMask(
        stampSize,
        hardness,
        strength
      );


    stampContext.globalCompositeOperation =
      "destination-in";


    stampContext.drawImage(
      brushMask,
      0,
      0
    );


    /*
     * Respect the current selection, when present.
     */

    const selectionMask =
      createSelectionMaskCanvas(
        point.x -
          halfSize,
        point.y -
          halfSize,
        stampSize,
        stampSize
      );


    if (selectionMask) {

      stampContext.drawImage(
        selectionMask,
        0,
        0
      );

    }


    stampContext.globalCompositeOperation =
      "source-over";


    destinationContext.save();


    destinationContext.globalAlpha =
      1;


    destinationContext.globalCompositeOperation =
      "source-over";


    destinationContext.drawImage(
      stampCanvas,
      layerPoint.x -
        halfSize,
      layerPoint.y -
        halfSize
    );


    destinationContext.restore();


    /*
     * Feed most of the blurred result back into the frozen
     * source. This allows repeated passes to build stronger
     * blur naturally without producing harsh seams.
     */

    const refreshContext =
      blurState.sourceSnapshot
        .getContext(
          "2d"
        );


    refreshContext.save();


    refreshContext.globalAlpha =
      clamp(
        blurState.sourceRefresh *
        strength,
        0.05,
        0.95
      );


    refreshContext.globalCompositeOperation =
      "source-over";


    refreshContext.drawImage(
      stampCanvas,
      layerPoint.x -
        halfSize,
      layerPoint.y -
        halfSize
    );


    refreshContext.restore();


    return true;

  }


  /* =======================================================
     11. INTERPOLATION
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


    const following =
      1 -
      clamp(
        blurState.smoothing,
        0,
        0.92
      );


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

      return stampBlur(
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


    let travelled =
      spacing -
      blurState.accumulatedDistance;


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


      if (
        stampBlur(
          context,
          stampPoint
        )
      ) {

        stamped =
          true;

      }


      travelled +=
        spacing;

    }


    const usedDistance =
      distance -
      (
        travelled -
        spacing
      );


    blurState.accumulatedDistance =
      usedDistance;


    if (
      blurState.accumulatedDistance >=
      spacing
    ) {

      blurState.accumulatedDistance %=
        spacing;

    }


    return stamped;

  }


  /* =======================================================
     12. CURSOR PREVIEW
  ======================================================= */

  function clearBlurCursor() {

    clearOverlay();

  }


  function drawBlurCursor(
    point,
    pressure =
      1
  ) {

    if (
      !blurState.active ||
      blurState.blurring ||
      !overlayContext ||
      !point
    ) {

      return false;

    }


    clearOverlay();


    const radius =
      getEffectiveSize(
        pressure
      ) /
      2;


    overlayContext.save();


    overlayContext.globalAlpha =
      1;


    overlayContext.globalCompositeOperation =
      "source-over";


    /*
     * Outer dark ring.
     */

    overlayContext.strokeStyle =
      "rgba(0, 0, 0, 0.9)";


    overlayContext.lineWidth =
      3;


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
     * Inner light ring.
     */

    overlayContext.strokeStyle =
      "rgba(255, 255, 255, 0.96)";


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
     * Soft concentric blur rings.
     */

    overlayContext.strokeStyle =
      "rgba(212, 154, 255, 0.9)";


    overlayContext.lineWidth =
      1;


    overlayContext.setLineDash(
      [
        3,
        3
      ]
    );


    overlayContext.beginPath();


    overlayContext.arc(
      point.x,
      point.y,
      radius *
        0.65,
      0,
      Math.PI *
        2
    );


    overlayContext.stroke();


    overlayContext.beginPath();


    overlayContext.arc(
      point.x,
      point.y,
      radius *
        0.32,
      0,
      Math.PI *
        2
    );


    overlayContext.stroke();


    overlayContext.setLineDash(
      []
    );


    overlayContext.restore();


    blurState.cursorVisible =
      true;


    blurState.cursorPoint =
      copyPoint(
        point
      );


    blurState.cursorPressure =
      pressure;


    return true;

  }


  function drawActiveBlurGuide(
    point,
    pressure
  ) {

    if (
      !overlayContext ||
      !point
    ) {

      return false;

    }


    clearOverlay();


    const radius =
      getEffectiveSize(
        pressure
      ) /
      2;


    overlayContext.save();


    overlayContext.globalAlpha =
      1;


    overlayContext.globalCompositeOperation =
      "source-over";


    overlayContext.strokeStyle =
      "rgba(212, 154, 255, 0.95)";


    overlayContext.lineWidth =
      1.5;


    overlayContext.setLineDash(
      [
        5,
        4
      ]
    );


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


    overlayContext.setLineDash(
      []
    );


    overlayContext.restore();


    return true;

  }


  function redrawBlurCursor() {

    if (
      !blurState.cursorVisible ||
      !blurState.cursorPoint ||
      blurState.blurring
    ) {

      return;

    }


    drawBlurCursor(
      blurState.cursorPoint,
      blurState.cursorPressure
    );

  }


  /* =======================================================
     13. HISTORY
  ======================================================= */

  function saveBlurHistory() {

    if (
      typeof getHistoryApi()
        ?.saveHistory ===
      "function"
    ) {

      return getHistoryApi()
        .saveHistory(
          "Blur pixels"
        );

    }


    return getCore()
      ?.requestHistorySave?.(
        "Blur pixels"
      );

  }


  /* =======================================================
     14. STROKE LIFECYCLE
  ======================================================= */

  function beginBlurStroke(
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


    const point = {

      x:
        payload.point.x,

      y:
        payload.point.y,

      pressure:
        normalisePressure(
          payload
        )

    };


    blurState.blurring =
      true;


    blurState.changed =
      false;


    blurState.layer =
      layer;


    blurState.layerBackup =
      createCanvasCopy(
        layer.canvas
      );


    blurState.sourceSnapshot =
      createCanvasCopy(
        layer.canvas
      );


    blurState.previousPoint =
      copyPoint(
        point
      );


    blurState.currentPoint =
      copyPoint(
        point
      );


    blurState.accumulatedDistance =
      0;


    blurState.strokeCounter +=
      1;


    clearBlurCursor();


    const changed =
      stampBlur(
        layer.context,
        point
      );


    if (changed) {

      blurState.changed =
        true;


      payload.markChanged?.(
        true
      );


      renderLayers();

    }


    drawActiveBlurGuide(
      point,
      point.pressure
    );


    return true;

  }


  function continueBlurStroke(
    payload
  ) {

    if (
      !blurState.blurring ||
      !blurState.layer
    ) {

      return false;

    }


    const incomingPoint = {

      x:
        payload.point.x,

      y:
        payload.point.y,

      pressure:
        normalisePressure(
          payload
        )

    };


    const smoothedPoint =
      smoothIncomingPoint(
        blurState.previousPoint,
        incomingPoint
      );


    const changed =
      drawInterpolatedSegment(
        blurState.layer.context,
        blurState.previousPoint,
        smoothedPoint
      );


    blurState.previousPoint =
      copyPoint(
        smoothedPoint
      );


    blurState.currentPoint =
      copyPoint(
        smoothedPoint
      );


    if (changed) {

      blurState.changed =
        true;


      payload.markChanged?.(
        true
      );


      renderLayers();

    }


    drawActiveBlurGuide(
      smoothedPoint,
      smoothedPoint.pressure
    );


    return changed;

  }


  function finishBlurStroke(
    payload
  ) {

    if (
      !blurState.blurring
    ) {

      return false;

    }


    const finalPoint = {

      x:
        payload.point.x,

      y:
        payload.point.y,

      pressure:
        normalisePressure(
          payload
        )

    };


    if (
      blurState.layer &&
      blurState.previousPoint
    ) {

      const finalChanged =
        drawInterpolatedSegment(
          blurState.layer.context,
          blurState.previousPoint,
          finalPoint
        );


      stampBlur(
        blurState.layer.context,
        finalPoint
      );


      if (finalChanged) {

        blurState.changed =
          true;

      }


      renderLayers();

    }


    const changed =
      blurState.changed;


    resetStrokeState();


    if (changed) {

      payload.markChanged?.(
        true
      );


      saveBlurHistory();


      sendStatusMessage(
        "Blur stroke saved."
      );

    }


    drawBlurCursor(
      finalPoint,
      finalPoint.pressure
    );


    return changed;

  }


  function cancelBlurStroke() {

    if (
      !blurState.blurring
    ) {

      clearBlurCursor();


      return false;

    }


    restoreLayerBackup();


    resetStrokeState();


    clearBlurCursor();


    sendStatusMessage(
      "Blur stroke cancelled."
    );


    return true;

  }


  function resetStrokeState() {

    blurState.blurring =
      false;


    blurState.changed =
      false;


    blurState.layer =
      null;


    blurState.layerBackup =
      null;


    blurState.sourceSnapshot =
      null;


    blurState.previousPoint =
      null;


    blurState.currentPoint =
      null;


    blurState.accumulatedDistance =
      0;

  }


  /* =======================================================
     15. POINTER HANDLERS
  ======================================================= */

  function pointerDown(
    payload
  ) {

    if (
      !blurState.active
    ) {

      return false;

    }


    const started =
      beginBlurStroke(
        payload
      );


    return {

      changed:
        started &&
        blurState.changed,

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
      !blurState.active
    ) {

      return false;

    }


    if (
      blurState.blurring
    ) {

      const changed =
        continueBlurStroke(
          payload
        );


      return {

        changed,

        preventDefault:
          true

      };

    }


    drawBlurCursor(
      payload.point,
      normalisePressure(
        payload
      )
    );


    return false;

  }


  function pointerUp(
    payload
  ) {

    if (
      !blurState.blurring
    ) {

      return false;

    }


    const changed =
      finishBlurStroke(
        payload
      );


    return {

      changed,

      preventDefault:
        true,

      releasePointer:
        true

    };

  }


  function pointerCancel() {

    cancelBlurStroke();


    return {

      changed:
        false,

      releasePointer:
        true,

      clearOverlay:
        true

    };

  }


  function hover(
    payload
  ) {

    if (
      !blurState.active ||
      blurState.blurring ||
      !payload.point?.inside
    ) {

      return false;

    }


    drawBlurCursor(
      payload.point,
      normalisePressure(
        payload
      )
    );


    return false;

  }


  function pointerEnter(
    payload
  ) {

    return hover(
      payload
    );

  }


  function pointerLeave() {

    if (
      !blurState.blurring
    ) {

      clearBlurCursor();

    }


    return false;

  }


  /* =======================================================
     16. ACTIVATION
  ======================================================= */

  function activate() {

    blurState.active =
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
      "Blur ready. Paint over pixels to soften them."
    );


    return true;

  }


  function deactivate() {

    if (
      blurState.blurring
    ) {

      cancelBlurStroke();

    }


    blurState.active =
      false;


    clearBlurCursor();


    getCore()
      ?.setCanvasCursor?.(
        "default"
      );


    return true;

  }


  /* =======================================================
     17. DOM AND EVENTS
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


    dom.opacityInput =
      document.getElementById(
        "tool-opacity"
      );


    dom.hardnessInput =
      document.getElementById(
        "brush-hardness"
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
      "paintless:tool-state-changed",
      (event) => {

        if (
          [
            "brushSize",
            "opacity",
            "hardness"
          ].includes(
            event.detail?.property
          )
        ) {

          redrawBlurCursor();

        }

      }
    );


    [
      dom.brushSizeInput,
      dom.opacityInput,
      dom.hardnessInput
    ].forEach(
      (control) => {

        control?.addEventListener(
          "input",
          redrawBlurCursor
        );

      }
    );


    document.addEventListener(
      "paintless:history-restored",
      cancelBlurStroke
    );


    document.addEventListener(
      "paintless:document-reset",
      cancelBlurStroke
    );


    document.addEventListener(
      "paintless:document-resized",
      cancelBlurStroke
    );


    document.addEventListener(
      "paintless:active-layer-changed",
      cancelBlurStroke
    );


    document.addEventListener(
      "paintless:selection-changed",
      redrawBlurCursor
    );


    document.addEventListener(
      "paintless:selection-cleared",
      redrawBlurCursor
    );

  }


  /* =======================================================
     18. BLUR MODULE
  ======================================================= */

  const blurModule = {

    name:
      "Blur",

    label:
      "Blur",

    initialised:
      false,


    async initialise() {

      if (
        blurState.initialised
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
          "Paintless Blur could not find the editor canvases."
        );

      }


      connectEvents();


      blurState.initialised =
        true;


      this.initialised =
        true;


      if (
        tools.getActiveTool() ===
        "blur"
      ) {

        activate();

      }


      document.dispatchEvent(
        new CustomEvent(
          "paintless:blur-ready",
          {
            detail: {
              blur:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless Blur ready.",
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

    pointerEnter,

    pointerLeave,

    hover

  };


  /* =======================================================
     19. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      blurState,


    activate,

    deactivate,


    beginBlurStroke,

    continueBlurStroke,

    finishBlurStroke,

    cancelBlurStroke,


    stampBlur,

    drawInterpolatedSegment,

    drawBlurCursor,

    clearBlurCursor,


    getBlurSize,

    getBlurStrength,

    getBlurHardness,

    getBlurRadius,


    setSmoothing(
      value
    ) {

      blurState.smoothing =
        clamp(
          value,
          0,
          0.92
        );


      return blurState.smoothing;

    },


    getSmoothing() {

      return blurState.smoothing;

    },


    setSpacing(
      value
    ) {

      blurState.spacing =
        clamp(
          value,
          0.02,
          1
        );


      return blurState.spacing;

    },


    getSpacing() {

      return blurState.spacing;

    },


    setMaximumBlurRadius(
      value
    ) {

      blurState.maximumBlurRadius =
        clamp(
          value,
          1,
          64
        );


      return blurState.maximumBlurRadius;

    },


    setSourceRefresh(
      value
    ) {

      blurState.sourceRefresh =
        clamp(
          value,
          0,
          1
        );


      return blurState.sourceRefresh;

    },


    setPressureEnabled(
      enabled
    ) {

      blurState.pressureEnabled =
        Boolean(
          enabled
        );


      return blurState.pressureEnabled;

    },


    setRespectSelection(
      enabled
    ) {

      blurState.respectSelection =
        Boolean(
          enabled
        );


      return blurState.respectSelection;

    },


    isBlurring() {

      return blurState.blurring;

    }

  };


  window.PaintlessBlur =
    publicApi;


  blurModule.api =
    publicApi;


  /* =======================================================
     20. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "blur",
    blurModule
  );

})();
