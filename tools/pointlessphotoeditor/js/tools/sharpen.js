"use strict";

/* =========================================================
   PAINTLESS
   SHARPEN BRUSH TOOL — v1.0

   File:
   js/tools/sharpen.js

   Features:
   - Paints sharpening directly onto the active layer
   - Adjustable brush size
   - Opacity control becomes sharpening strength
   - Hardness controls edge softness
   - Smooth interpolated strokes
   - Mouse, touch and pen support
   - Pen-pressure support
   - Live circular cursor preview
   - One completed sharpen stroke = one Undo step
   - Escape restores the original layer
   - Locked-layer protection
   - Selection-aware
   - Uses a local convolution filter for real sharpening

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
      "Paintless Sharpen could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. SHARPEN STATE
  ======================================================= */

  const sharpenState = {

    initialised:
      false,

    active:
      false,

    sharpening:
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
      0.14,

    minimumSpacing:
      1,

    pressureEnabled:
      true,

    pressureSizeMinimum:
      0.3,

    pressureStrengthMinimum:
      0.25,

    maximumAmount:
      2.4,

    sourceRefresh:
      0.72,

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
      !sharpenState.pressureEnabled ||
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


    sharpenState.cursorVisible =
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

  function getSharpenSize() {

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


  function getSharpenStrength() {

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


  function getSharpenHardness() {

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
      0.6,
      0,
      1
    );

  }


  function getEffectiveSize(
    pressure
  ) {

    const pressureScale =
      sharpenState.pressureSizeMinimum +
      (
        1 -
        sharpenState.pressureSizeMinimum
      ) *
      pressure;


    return Math.max(
      4,
      getSharpenSize() *
      pressureScale
    );

  }


  function getEffectiveStrength(
    pressure
  ) {

    const pressureScale =
      sharpenState.pressureStrengthMinimum +
      (
        1 -
        sharpenState.pressureStrengthMinimum
      ) *
      pressure;


    return clamp(
      getSharpenStrength() *
      pressureScale,
      0.01,
      1
    );

  }


  function getSharpenAmount(
    pressure
  ) {

    return (
      getEffectiveStrength(
        pressure
      ) *
      sharpenState.maximumAmount
    );

  }


  function getStampSpacing(
    pressure
  ) {

    return Math.max(
      sharpenState.minimumSpacing,
      getEffectiveSize(
        pressure
      ) *
      sharpenState.spacing
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
        "That layer cannot be sharpened."
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


    copiedCanvas
      .getContext(
        "2d",
        {
          alpha:
            true,

          willReadFrequently:
            true
        }
      )
      .drawImage(
        sourceCanvas,
        0,
        0
      );


    return copiedCanvas;

  }


  function restoreLayerBackup() {

    if (
      !sharpenState.layer ||
      !sharpenState.layerBackup
    ) {

      return false;

    }


    const layer =
      sharpenState.layer;


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
      sharpenState.layerBackup,
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
      sharpenState.respectSelection &&
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


    const information =
      selectionApi
        ?.getSelectionInformation?.();


    const maskWidth =
      information?.width ||
      sharpenState.layer
        ?.canvas?.width ||
      0;


    const maskHeight =
      information?.height ||
      sharpenState.layer
        ?.canvas?.height ||
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
     10. SHARPEN CONVOLUTION
  ======================================================= */

  function sharpenImageData(
    imageData,
    amount
  ) {

    const width =
      imageData.width;


    const height =
      imageData.height;


    const source =
      imageData.data;


    const result =
      new Uint8ClampedArray(
        source
      );


    /*
     * Adjustable sharpening kernel:

         0      -a       0
        -a   1 + 4a     -a
         0      -a       0

       The kernel always sums to 1, preserving general
       brightness while increasing local edge contrast.
    */

    const edgeAmount =
      clamp(
        amount,
        0,
        sharpenState.maximumAmount
      );


    const centreWeight =
      1 +
      edgeAmount *
      4;


    const neighbourWeight =
      -edgeAmount;


    for (
      let y = 1;
      y < height - 1;
      y += 1
    ) {

      for (
        let x = 1;
        x < width - 1;
        x += 1
      ) {

        const centreIndex =
          (
            y *
            width +
            x
          ) *
          4;


        const topIndex =
          (
            (
              y -
              1
            ) *
            width +
            x
          ) *
          4;


        const bottomIndex =
          (
            (
              y +
              1
            ) *
            width +
            x
          ) *
          4;


        const leftIndex =
          (
            y *
            width +
            x -
            1
          ) *
          4;


        const rightIndex =
          (
            y *
            width +
            x +
            1
          ) *
          4;


        for (
          let channel = 0;
          channel < 3;
          channel += 1
        ) {

          const sharpenedValue =
            source[
              centreIndex +
              channel
            ] *
              centreWeight +
            source[
              topIndex +
              channel
            ] *
              neighbourWeight +
            source[
              bottomIndex +
              channel
            ] *
              neighbourWeight +
            source[
              leftIndex +
              channel
            ] *
              neighbourWeight +
            source[
              rightIndex +
              channel
            ] *
              neighbourWeight;


          result[
            centreIndex +
            channel
          ] =
            clamp(
              Math.round(
                sharpenedValue
              ),
              0,
              255
            );

        }


        /*
         * Preserve the original alpha channel.
         */

        result[
          centreIndex +
          3
        ] =
          source[
            centreIndex +
            3
          ];

      }

    }


    return new ImageData(
      result,
      width,
      height
    );

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
     11. SHARPEN STAMP
  ======================================================= */

  function stampSharpen(
    destinationContext,
    point
  ) {

    if (
      !destinationContext ||
      !point ||
      !sharpenState.sourceSnapshot
    ) {

      return false;

    }


    const layerPoint =
      documentPointToLayerPoint(
        sharpenState.layer,
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


    const amount =
      getSharpenAmount(
        pressure
      );


    const hardness =
      getSharpenHardness();


    /*
     * One-pixel padding gives the convolution neighbouring
     * pixels around the brush boundary.
     */

    const padding =
      1;


    const workSize =
      stampSize +
      padding *
      2;


    const sourceX =
      Math.round(
        layerPoint.x -
        halfSize -
        padding
      );


    const sourceY =
      Math.round(
        layerPoint.y -
        halfSize -
        padding
      );


    const sourceCanvas =
      document.createElement(
        "canvas"
      );


    sourceCanvas.width =
      workSize;


    sourceCanvas.height =
      workSize;


    const sourceContext =
      sourceCanvas.getContext(
        "2d",
        {
          alpha:
            true,

          willReadFrequently:
            true
        }
      );


    sourceContext.drawImage(
      sharpenState.sourceSnapshot,
      sourceX,
      sourceY,
      workSize,
      workSize,
      0,
      0,
      workSize,
      workSize
    );


    let sourceImageData =
      null;


    try {

      sourceImageData =
        sourceContext.getImageData(
          0,
          0,
          workSize,
          workSize
        );

    } catch (error) {

      console.error(
        "Paintless Sharpen could not read the source pixels:",
        error
      );


      return false;

    }


    const sharpenedImageData =
      sharpenImageData(
        sourceImageData,
        amount
      );


    const sharpenedCanvas =
      document.createElement(
        "canvas"
      );


    sharpenedCanvas.width =
      workSize;


    sharpenedCanvas.height =
      workSize;


    sharpenedCanvas
      .getContext(
        "2d"
      )
      .putImageData(
        sharpenedImageData,
        0,
        0
      );


    /*
     * Crop away the convolution padding.
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
      sharpenedCanvas,
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
     * Apply circular brush hardness and strength.
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
     * Restrict sharpening to the active selection.
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
     * Feed part of the result back into the source snapshot so
     * repeated passes gradually build the effect.
     */

    const refreshContext =
      sharpenState.sourceSnapshot
        .getContext(
          "2d"
        );


    refreshContext.save();


    refreshContext.globalAlpha =
      clamp(
        sharpenState.sourceRefresh *
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
     12. INTERPOLATION
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
        sharpenState.smoothing,
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

      return stampSharpen(
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
      sharpenState.accumulatedDistance;


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
        stampSharpen(
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


    sharpenState.accumulatedDistance =
      usedDistance;


    if (
      sharpenState.accumulatedDistance >=
      spacing
    ) {

      sharpenState.accumulatedDistance %=
        spacing;

    }


    return stamped;

  }


  /* =======================================================
     13. CURSOR PREVIEW
  ======================================================= */

  function clearSharpenCursor() {

    clearOverlay();

  }


  function drawSharpenCursor(
    point,
    pressure =
      1
  ) {

    if (
      !sharpenState.active ||
      sharpenState.sharpening ||
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
     * Inner white ring.
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
     * Sharpen star symbol.
     */

    const symbolRadius =
      Math.max(
        4,
        radius *
        0.34
      );


    const innerRadius =
      symbolRadius *
      0.42;


    overlayContext.fillStyle =
      "rgba(255, 215, 90, 0.98)";


    overlayContext.strokeStyle =
      "rgba(0, 0, 0, 0.72)";


    overlayContext.lineWidth =
      1;


    overlayContext.beginPath();


    for (
      let index = 0;
      index < 16;
      index += 1
    ) {

      const angle =
        -Math.PI /
          2 +
        index *
        Math.PI /
        8;


      const pointRadius =
        index %
          2 ===
        0
          ? symbolRadius
          : innerRadius;


      const x =
        point.x +
        Math.cos(
          angle
        ) *
        pointRadius;


      const y =
        point.y +
        Math.sin(
          angle
        ) *
        pointRadius;


      if (
        index ===
        0
      ) {

        overlayContext.moveTo(
          x,
          y
        );

      } else {

        overlayContext.lineTo(
          x,
          y
        );

      }

    }


    overlayContext.closePath();


    overlayContext.fill();

    overlayContext.stroke();


    overlayContext.restore();


    sharpenState.cursorVisible =
      true;


    sharpenState.cursorPoint =
      copyPoint(
        point
      );


    sharpenState.cursorPressure =
      pressure;


    return true;

  }


  function drawActiveSharpenGuide(
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
      "rgba(255, 215, 90, 0.95)";


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


  function redrawSharpenCursor() {

    if (
      !sharpenState.cursorVisible ||
      !sharpenState.cursorPoint ||
      sharpenState.sharpening
    ) {

      return;

    }


    drawSharpenCursor(
      sharpenState.cursorPoint,
      sharpenState.cursorPressure
    );

  }


  /* =======================================================
     14. HISTORY
  ======================================================= */

  function saveSharpenHistory() {

    if (
      typeof getHistoryApi()
        ?.saveHistory ===
      "function"
    ) {

      return getHistoryApi()
        .saveHistory(
          "Sharpen pixels"
        );

    }


    return getCore()
      ?.requestHistorySave?.(
        "Sharpen pixels"
      );

  }


  /* =======================================================
     15. STROKE LIFECYCLE
  ======================================================= */

  function beginSharpenStroke(
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


    sharpenState.sharpening =
      true;


    sharpenState.changed =
      false;


    sharpenState.layer =
      layer;


    sharpenState.layerBackup =
      createCanvasCopy(
        layer.canvas
      );


    sharpenState.sourceSnapshot =
      createCanvasCopy(
        layer.canvas
      );


    sharpenState.previousPoint =
      copyPoint(
        point
      );


    sharpenState.currentPoint =
      copyPoint(
        point
      );


    sharpenState.accumulatedDistance =
      0;


    sharpenState.strokeCounter +=
      1;


    clearSharpenCursor();


    const changed =
      stampSharpen(
        layer.context,
        point
      );


    if (changed) {

      sharpenState.changed =
        true;


      payload.markChanged?.(
        true
      );


      renderLayers();

    }


    drawActiveSharpenGuide(
      point,
      point.pressure
    );


    return true;

  }


  function continueSharpenStroke(
    payload
  ) {

    if (
      !sharpenState.sharpening ||
      !sharpenState.layer
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
        sharpenState.previousPoint,
        incomingPoint
      );


    const changed =
      drawInterpolatedSegment(
        sharpenState.layer.context,
        sharpenState.previousPoint,
        smoothedPoint
      );


    sharpenState.previousPoint =
      copyPoint(
        smoothedPoint
      );


    sharpenState.currentPoint =
      copyPoint(
        smoothedPoint
      );


    if (changed) {

      sharpenState.changed =
        true;


      payload.markChanged?.(
        true
      );


      renderLayers();

    }


    drawActiveSharpenGuide(
      smoothedPoint,
      smoothedPoint.pressure
    );


    return changed;

  }


  function finishSharpenStroke(
    payload
  ) {

    if (
      !sharpenState.sharpening
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
      sharpenState.layer &&
      sharpenState.previousPoint
    ) {

      const finalChanged =
        drawInterpolatedSegment(
          sharpenState.layer.context,
          sharpenState.previousPoint,
          finalPoint
        );


      const finalStampChanged =
        stampSharpen(
          sharpenState.layer.context,
          finalPoint
        );


      if (
        finalChanged ||
        finalStampChanged
      ) {

        sharpenState.changed =
          true;


        renderLayers();

      }

    }


    const changed =
      sharpenState.changed;


    resetStrokeState();


    if (changed) {

      payload.markChanged?.(
        true
      );


      saveSharpenHistory();


      sendStatusMessage(
        "Sharpen stroke saved."
      );

    }


    drawSharpenCursor(
      finalPoint,
      finalPoint.pressure
    );


    return changed;

  }


  function cancelSharpenStroke() {

    if (
      !sharpenState.sharpening
    ) {

      clearSharpenCursor();


      return false;

    }


    restoreLayerBackup();


    resetStrokeState();


    clearSharpenCursor();


    sendStatusMessage(
      "Sharpen stroke cancelled."
    );


    return true;

  }


  function resetStrokeState() {

    sharpenState.sharpening =
      false;


    sharpenState.changed =
      false;


    sharpenState.layer =
      null;


    sharpenState.layerBackup =
      null;


    sharpenState.sourceSnapshot =
      null;


    sharpenState.previousPoint =
      null;


    sharpenState.currentPoint =
      null;


    sharpenState.accumulatedDistance =
      0;

  }


  /* =======================================================
     16. POINTER HANDLERS
  ======================================================= */

  function pointerDown(
    payload
  ) {

    if (
      !sharpenState.active
    ) {

      return false;

    }


    const started =
      beginSharpenStroke(
        payload
      );


    return {

      changed:
        started &&
        sharpenState.changed,

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
      !sharpenState.active
    ) {

      return false;

    }


    if (
      sharpenState.sharpening
    ) {

      const changed =
        continueSharpenStroke(
          payload
        );


      return {

        changed,

        preventDefault:
          true

      };

    }


    drawSharpenCursor(
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
      !sharpenState.sharpening
    ) {

      return false;

    }


    const changed =
      finishSharpenStroke(
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

    cancelSharpenStroke();


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
      !sharpenState.active ||
      sharpenState.sharpening ||
      !payload.point?.inside
    ) {

      return false;

    }


    drawSharpenCursor(
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
      !sharpenState.sharpening
    ) {

      clearSharpenCursor();

    }


    return false;

  }


  /* =======================================================
     17. ACTIVATION
  ======================================================= */

  function activate() {

    sharpenState.active =
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
      "Sharpen ready. Paint over details to make them crisper."
    );


    return true;

  }


  function deactivate() {

    if (
      sharpenState.sharpening
    ) {

      cancelSharpenStroke();

    }


    sharpenState.active =
      false;


    clearSharpenCursor();


    getCore()
      ?.setCanvasCursor?.(
        "default"
      );


    return true;

  }


  /* =======================================================
     18. DOM AND EVENTS
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

          redrawSharpenCursor();

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
          redrawSharpenCursor
        );

      }
    );


    document.addEventListener(
      "paintless:history-restored",
      cancelSharpenStroke
    );


    document.addEventListener(
      "paintless:document-reset",
      cancelSharpenStroke
    );


    document.addEventListener(
      "paintless:document-resized",
      cancelSharpenStroke
    );


    document.addEventListener(
      "paintless:active-layer-changed",
      cancelSharpenStroke
    );


    document.addEventListener(
      "paintless:selection-changed",
      redrawSharpenCursor
    );


    document.addEventListener(
      "paintless:selection-cleared",
      redrawSharpenCursor
    );

  }


  /* =======================================================
     19. SHARPEN MODULE
  ======================================================= */

  const sharpenModule = {

    name:
      "Sharpen",

    label:
      "Sharpen",

    initialised:
      false,


    async initialise() {

      if (
        sharpenState.initialised
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
          "Paintless Sharpen could not find the editor canvases."
        );

      }


      connectEvents();


      sharpenState.initialised =
        true;


      this.initialised =
        true;


      if (
        tools.getActiveTool() ===
        "sharpen"
      ) {

        activate();

      }


      document.dispatchEvent(
        new CustomEvent(
          "paintless:sharpen-ready",
          {
            detail: {
              sharpen:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless Sharpen ready.",
        [
          "color:#ffd75a",
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
     20. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      sharpenState,


    activate,

    deactivate,


    beginSharpenStroke,

    continueSharpenStroke,

    finishSharpenStroke,

    cancelSharpenStroke,


    stampSharpen,

    sharpenImageData,

    drawInterpolatedSegment,

    drawSharpenCursor,

    clearSharpenCursor,


    getSharpenSize,

    getSharpenStrength,

    getSharpenHardness,

    getSharpenAmount,


    setSmoothing(
      value
    ) {

      sharpenState.smoothing =
        clamp(
          value,
          0,
          0.92
        );


      return sharpenState.smoothing;

    },


    getSmoothing() {

      return sharpenState.smoothing;

    },


    setSpacing(
      value
    ) {

      sharpenState.spacing =
        clamp(
          value,
          0.02,
          1
        );


      return sharpenState.spacing;

    },


    getSpacing() {

      return sharpenState.spacing;

    },


    setMaximumAmount(
      value
    ) {

      sharpenState.maximumAmount =
        clamp(
          value,
          0.1,
          5
        );


      return sharpenState.maximumAmount;

    },


    setSourceRefresh(
      value
    ) {

      sharpenState.sourceRefresh =
        clamp(
          value,
          0,
          1
        );


      return sharpenState.sourceRefresh;

    },


    setPressureEnabled(
      enabled
    ) {

      sharpenState.pressureEnabled =
        Boolean(
          enabled
        );


      return sharpenState.pressureEnabled;

    },


    setRespectSelection(
      enabled
    ) {

      sharpenState.respectSelection =
        Boolean(
          enabled
        );


      return sharpenState.respectSelection;

    },


    isSharpening() {

      return sharpenState.sharpening;

    }

  };


  window.PaintlessSharpen =
    publicApi;


  sharpenModule.api =
    publicApi;


  /* =======================================================
     21. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "sharpen",
    sharpenModule
  );

})();
