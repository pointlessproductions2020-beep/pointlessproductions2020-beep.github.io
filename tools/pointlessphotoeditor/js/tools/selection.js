"use strict";

/* =========================================================
   PAINTLESS
   SELECTION TOOL — v1.0

   File:
   js/tools/selection.js

   Features:
   - Rectangular selections
   - Magic Wand selections
   - Adjustable colour tolerance
   - Contiguous or global Magic Wand matching
   - Animated selection outline
   - Deselect button support
   - Invert selection through the public API
   - Delete clears selected pixels on the active layer
   - Escape deselects
   - Selection remains available to Crop and future tools
   - No history entry until pixels are actually changed

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
      "Paintless Selection could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. SELECTION STATE
  ======================================================= */

  const selectionState = {

    initialised:
      false,

    active:
      false,

    selecting:
      false,

    mode:
      "rectangle",

    startPoint:
      null,

    currentPoint:
      null,

    rectangle:
      null,

    mask:
      null,

    maskWidth:
      0,

    maskHeight:
      0,

    selectedPixelCount:
      0,

    tolerance:
      24,

    contiguous:
      true,

    inverted:
      false,

    animationFrame:
      null,

    dashOffset:
      0,

    marchingAntsSpeed:
      0.7

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    editorCanvas:
      null,

    overlayCanvas:
      null,

    selectionModeInput:
      null,

    toleranceInput:
      null,

    toleranceOutput:
      null,

    contiguousInput:
      null,

    deselectButton:
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


  function getActiveLayer() {

    return (
      getCore()
        ?.getActiveLayer?.() ||
      getLayersApi()
        ?.getActiveLayer?.() ||
      null
    );

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

  function getSelectionMode() {

    const mode =
      dom.selectionModeInput?.value ||
      selectionState.mode;


    return [
      "rectangle",
      "magic-wand"
    ].includes(
      mode
    )
      ? mode
      : "rectangle";

  }


  function setSelectionMode(
    mode
  ) {

    if (
      ![
        "rectangle",
        "magic-wand"
      ].includes(
        mode
      )
    ) {

      return false;

    }


    selectionState.mode =
      mode;


    if (dom.selectionModeInput) {

      dom.selectionModeInput.value =
        mode;

    }


    cancelCurrentSelection();


    sendStatusMessage(
      mode ===
        "magic-wand"
        ? "Magic Wand ready."
        : "Rectangle selection ready."
    );


    return true;

  }


  function getTolerance() {

    return clamp(
      selectionState.tolerance,
      0,
      255
    );

  }


  function setTolerance(
    value
  ) {

    selectionState.tolerance =
      clamp(
        value,
        0,
        255
      );


    if (dom.toleranceInput) {

      dom.toleranceInput.value =
        String(
          selectionState.tolerance
        );

    }


    if (dom.toleranceOutput) {

      dom.toleranceOutput.textContent =
        String(
          Math.round(
            selectionState.tolerance
          )
        );

    }


    return selectionState.tolerance;

  }


  function setContiguous(
    enabled
  ) {

    selectionState.contiguous =
      Boolean(
        enabled
      );


    if (dom.contiguousInput) {

      dom.contiguousInput.checked =
        selectionState.contiguous;

    }


    return selectionState.contiguous;

  }


  /* =======================================================
     7. MASK HELPERS
  ======================================================= */

  function createEmptyMask(
    width,
    height
  ) {

    return new Uint8Array(
      width *
      height
    );

  }


  function setSelectionMask(
    mask,
    width,
    height,
    {
      rectangle =
        null,

      inverted =
        false
    } = {}
  ) {

    selectionState.mask =
      mask;


    selectionState.maskWidth =
      width;


    selectionState.maskHeight =
      height;


    selectionState.rectangle =
      rectangle;


    selectionState.inverted =
      inverted;


    selectionState.selectedPixelCount =
      mask
        ? mask.reduce(
            (
              count,
              value
            ) =>
              count +
              (
                value
                  ? 1
                  : 0
              ),
            0
          )
        : 0;


    if (
      selectionState.selectedPixelCount >
      0
    ) {

      startMarchingAnts();

    } else {

      stopMarchingAnts();

      clearOverlay();

    }


    document.dispatchEvent(
      new CustomEvent(
        "paintless:selection-changed",
        {
          detail: {
            mask:
              selectionState.mask,

            width:
              selectionState.maskWidth,

            height:
              selectionState.maskHeight,

            rectangle:
              selectionState.rectangle,

            selectedPixelCount:
              selectionState.selectedPixelCount,

            inverted:
              selectionState.inverted
          }
        }
      )
    );


    return true;

  }


  function hasSelection() {

    return Boolean(
      selectionState.mask &&
      selectionState.selectedPixelCount >
        0
    );

  }


  function getSelectionMask() {

    return selectionState.mask;

  }


  function isPixelSelected(
    x,
    y
  ) {

    if (
      !selectionState.mask ||
      x <
        0 ||
      y <
        0 ||
      x >=
        selectionState.maskWidth ||
      y >=
        selectionState.maskHeight
    ) {

      return false;

    }


    return Boolean(
      selectionState.mask[
        y *
        selectionState.maskWidth +
        x
      ]
    );

  }


  /* =======================================================
     8. RECTANGLE SELECTION
  ======================================================= */

  function createRectangleMask(
    rectangle,
    width,
    height
  ) {

    const mask =
      createEmptyMask(
        width,
        height
      );


    const left =
      clamp(
        Math.floor(
          rectangle.x
        ),
        0,
        width
      );


    const top =
      clamp(
        Math.floor(
          rectangle.y
        ),
        0,
        height
      );


    const right =
      clamp(
        Math.ceil(
          rectangle.x +
          rectangle.width
        ),
        0,
        width
      );


    const bottom =
      clamp(
        Math.ceil(
          rectangle.y +
          rectangle.height
        ),
        0,
        height
      );


    for (
      let y = top;
      y < bottom;
      y += 1
    ) {

      const rowOffset =
        y *
        width;


      for (
        let x = left;
        x < right;
        x += 1
      ) {

        mask[
          rowOffset +
          x
        ] =
          1;

      }

    }


    return mask;

  }


  function commitRectangleSelection(
    startPoint,
    endPoint
  ) {

    const canvas =
      dom.editorCanvas;


    if (!canvas) {

      return false;

    }


    const rectangle =
      getNormalisedRectangle(
        startPoint,
        endPoint
      );


    if (
      rectangle.width <
        1 ||
      rectangle.height <
        1
    ) {

      deselect();

      return false;

    }


    const mask =
      createRectangleMask(
        rectangle,
        canvas.width,
        canvas.height
      );


    setSelectionMask(
      mask,
      canvas.width,
      canvas.height,
      {
        rectangle
      }
    );


    sendStatusMessage(
      `${Math.round(
        rectangle.width
      )} × ${Math.round(
        rectangle.height
      )} px selected.`
    );


    return true;

  }


  /* =======================================================
     9. MAGIC WAND SELECTION
  ======================================================= */

  function coloursMatch(
    pixels,
    pixelIndex,
    target,
    tolerance
  ) {

    return (
      Math.abs(
        pixels[
          pixelIndex
        ] -
        target.red
      ) <=
        tolerance &&
      Math.abs(
        pixels[
          pixelIndex +
          1
        ] -
        target.green
      ) <=
        tolerance &&
      Math.abs(
        pixels[
          pixelIndex +
          2
        ] -
        target.blue
      ) <=
        tolerance &&
      Math.abs(
        pixels[
          pixelIndex +
          3
        ] -
        target.alpha
      ) <=
        tolerance
    );

  }


  function createContiguousMagicMask(
    imageData,
    startX,
    startY,
    tolerance
  ) {

    const width =
      imageData.width;


    const height =
      imageData.height;


    const pixels =
      imageData.data;


    const startPixelIndex =
      (
        startY *
        width +
        startX
      ) *
      4;


    const target = {

      red:
        pixels[
          startPixelIndex
        ],

      green:
        pixels[
          startPixelIndex +
          1
        ],

      blue:
        pixels[
          startPixelIndex +
          2
        ],

      alpha:
        pixels[
          startPixelIndex +
          3
        ]

    };


    const mask =
      createEmptyMask(
        width,
        height
      );


    const visited =
      new Uint8Array(
        width *
        height
      );


    const stack = [
      startY *
      width +
      startX
    ];


    while (
      stack.length >
      0
    ) {

      const pixelNumber =
        stack.pop();


      if (
        visited[
          pixelNumber
        ]
      ) {

        continue;

      }


      visited[
        pixelNumber
      ] =
        1;


      const x =
        pixelNumber %
        width;


      const y =
        Math.floor(
          pixelNumber /
          width
        );


      const pixelIndex =
        pixelNumber *
        4;


      if (
        !coloursMatch(
          pixels,
          pixelIndex,
          target,
          tolerance
        )
      ) {

        continue;

      }


      mask[
        pixelNumber
      ] =
        1;


      if (
        x >
        0
      ) {

        stack.push(
          pixelNumber -
          1
        );

      }


      if (
        x <
        width -
        1
      ) {

        stack.push(
          pixelNumber +
          1
        );

      }


      if (
        y >
        0
      ) {

        stack.push(
          pixelNumber -
          width
        );

      }


      if (
        y <
        height -
        1
      ) {

        stack.push(
          pixelNumber +
          width
        );

      }

    }


    return mask;

  }


  function createGlobalMagicMask(
    imageData,
    startX,
    startY,
    tolerance
  ) {

    const width =
      imageData.width;


    const height =
      imageData.height;


    const pixels =
      imageData.data;


    const startPixelIndex =
      (
        startY *
        width +
        startX
      ) *
      4;


    const target = {

      red:
        pixels[
          startPixelIndex
        ],

      green:
        pixels[
          startPixelIndex +
          1
        ],

      blue:
        pixels[
          startPixelIndex +
          2
        ],

      alpha:
        pixels[
          startPixelIndex +
          3
        ]

    };


    const mask =
      createEmptyMask(
        width,
        height
      );


    for (
      let pixelNumber = 0;
      pixelNumber <
        width *
        height;
      pixelNumber += 1
    ) {

      if (
        coloursMatch(
          pixels,
          pixelNumber *
            4,
          target,
          tolerance
        )
      ) {

        mask[
          pixelNumber
        ] =
          1;

      }

    }


    return mask;

  }


  function commitMagicWandSelection(
    point
  ) {

    const layer =
      getActiveLayer();


    if (
      !layer?.context ||
      !layer?.canvas
    ) {

      sendStatusMessage(
        "There is no active layer to sample."
      );


      return false;

    }


    const width =
      layer.canvas.width;


    const height =
      layer.canvas.height;


    const x =
      clamp(
        Math.floor(
          point.x
        ),
        0,
        width -
          1
      );


    const y =
      clamp(
        Math.floor(
          point.y
        ),
        0,
        height -
          1
      );


    const imageData =
      layer.context.getImageData(
        0,
        0,
        width,
        height
      );


    const tolerance =
      getTolerance();


    const mask =
      selectionState.contiguous
        ? createContiguousMagicMask(
            imageData,
            x,
            y,
            tolerance
          )
        : createGlobalMagicMask(
            imageData,
            x,
            y,
            tolerance
          );


    setSelectionMask(
      mask,
      width,
      height
    );


    sendStatusMessage(
      `${selectionState.selectedPixelCount.toLocaleString()} matching pixel${
        selectionState.selectedPixelCount ===
        1
          ? ""
          : "s"
      } selected.`
    );


    return selectionState.selectedPixelCount >
      0;

  }


  /* =======================================================
     10. PREVIEW
  ======================================================= */

  function drawRectanglePreview(
    startPoint,
    currentPoint
  ) {

    if (
      !overlayContext ||
      !startPoint ||
      !currentPoint
    ) {

      return false;

    }


    clearOverlay();


    const rectangle =
      getNormalisedRectangle(
        startPoint,
        currentPoint
      );


    overlayContext.save();


    overlayContext.globalAlpha =
      1;


    overlayContext.globalCompositeOperation =
      "source-over";


    overlayContext.fillStyle =
      "rgba(168, 76, 255, 0.14)";


    overlayContext.fillRect(
      rectangle.x,
      rectangle.y,
      rectangle.width,
      rectangle.height
    );


    overlayContext.lineWidth =
      1;


    overlayContext.strokeStyle =
      "rgba(255, 255, 255, 0.95)";


    overlayContext.setLineDash(
      [
        7,
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


    overlayContext.restore();


    return true;

  }


  /* =======================================================
     11. MARCHING ANTS
  ======================================================= */

  function drawSelectionOutline() {

    if (
      !selectionState.active ||
      !hasSelection() ||
      !overlayContext
    ) {

      return;

    }


    clearOverlay();


    const width =
      selectionState.maskWidth;


    const height =
      selectionState.maskHeight;


    const mask =
      selectionState.mask;


    overlayContext.save();


    overlayContext.globalAlpha =
      1;


    overlayContext.globalCompositeOperation =
      "source-over";


    overlayContext.lineWidth =
      1;


    overlayContext.setLineDash(
      [
        5,
        5
      ]
    );


    overlayContext.lineDashOffset =
      selectionState.dashOffset;


    overlayContext.strokeStyle =
      "#ffffff";


    overlayContext.beginPath();


    for (
      let y = 0;
      y < height;
      y += 1
    ) {

      const row =
        y *
        width;


      for (
        let x = 0;
        x < width;
        x += 1
      ) {

        const index =
          row +
          x;


        if (
          !mask[
            index
          ]
        ) {

          continue;

        }


        const leftSelected =
          x >
            0 &&
          mask[
            index -
            1
          ];


        const rightSelected =
          x <
            width -
            1 &&
          mask[
            index +
            1
          ];


        const topSelected =
          y >
            0 &&
          mask[
            index -
            width
          ];


        const bottomSelected =
          y <
            height -
            1 &&
          mask[
            index +
            width
          ];


        if (!topSelected) {

          overlayContext.moveTo(
            x,
            y
          );


          overlayContext.lineTo(
            x +
              1,
            y
          );

        }


        if (!rightSelected) {

          overlayContext.moveTo(
            x +
              1,
            y
          );


          overlayContext.lineTo(
            x +
              1,
            y +
              1
          );

        }


        if (!bottomSelected) {

          overlayContext.moveTo(
            x +
              1,
            y +
              1
          );


          overlayContext.lineTo(
            x,
            y +
              1
          );

        }


        if (!leftSelected) {

          overlayContext.moveTo(
            x,
            y +
              1
          );


          overlayContext.lineTo(
            x,
            y
          );

        }

      }

    }


    overlayContext.stroke();


    overlayContext.lineDashOffset =
      selectionState.dashOffset +
      5;


    overlayContext.strokeStyle =
      "#000000";


    overlayContext.stroke();


    overlayContext.restore();

  }


  function animateMarchingAnts() {

    if (
      !selectionState.active ||
      !hasSelection()
    ) {

      selectionState.animationFrame =
        null;


      return;

    }


    selectionState.dashOffset -=
      selectionState.marchingAntsSpeed;


    drawSelectionOutline();


    selectionState.animationFrame =
      requestAnimationFrame(
        animateMarchingAnts
      );

  }


  function startMarchingAnts() {

    if (
      selectionState.animationFrame !==
      null
    ) {

      return;

    }


    selectionState.animationFrame =
      requestAnimationFrame(
        animateMarchingAnts
      );

  }


  function stopMarchingAnts() {

    if (
      selectionState.animationFrame !==
      null
    ) {

      cancelAnimationFrame(
        selectionState.animationFrame
      );

    }


    selectionState.animationFrame =
      null;

  }


  /* =======================================================
     12. DESELECT AND INVERT
  ======================================================= */

  function deselect({
    announce =
      true
  } = {}) {

    stopMarchingAnts();


    selectionState.selecting =
      false;


    selectionState.startPoint =
      null;


    selectionState.currentPoint =
      null;


    selectionState.rectangle =
      null;


    selectionState.mask =
      null;


    selectionState.maskWidth =
      0;


    selectionState.maskHeight =
      0;


    selectionState.selectedPixelCount =
      0;


    selectionState.inverted =
      false;


    clearOverlay();


    document.dispatchEvent(
      new CustomEvent(
        "paintless:selection-cleared"
      )
    );


    if (announce) {

      sendStatusMessage(
        "Selection cleared."
      );

    }


    return true;

  }


  function invertSelection() {

    const width =
      dom.editorCanvas?.width ||
      0;


    const height =
      dom.editorCanvas?.height ||
      0;


    if (
      width <=
        0 ||
      height <=
        0
    ) {

      return false;

    }


    let mask =
      selectionState.mask;


    if (!mask) {

      mask =
        createEmptyMask(
          width,
          height
        );

    }


    const invertedMask =
      new Uint8Array(
        width *
        height
      );


    for (
      let index = 0;
      index <
        invertedMask.length;
      index += 1
    ) {

      invertedMask[
        index
      ] =
        mask[
          index
        ]
          ? 0
          : 1;

    }


    setSelectionMask(
      invertedMask,
      width,
      height,
      {
        inverted:
          !selectionState.inverted
      }
    );


    sendStatusMessage(
      "Selection inverted."
    );


    return true;

  }


  /* =======================================================
     13. DELETE SELECTED PIXELS
  ======================================================= */

  function saveSelectionHistory(
    reason
  ) {

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


    return getCore()
      ?.requestHistorySave?.(
        reason
      );

  }


  function clearSelectedPixels() {

    if (!hasSelection()) {

      return false;

    }


    const layer =
      getActiveLayer();


    if (
      !layer ||
      layer.locked ||
      !layer.context ||
      !layer.canvas
    ) {

      sendStatusMessage(
        "The active layer cannot be edited."
      );


      return false;

    }


    const imageData =
      layer.context.getImageData(
        0,
        0,
        layer.canvas.width,
        layer.canvas.height
      );


    const pixels =
      imageData.data;


    let changedPixels =
      0;


    for (
      let index = 0;
      index <
        selectionState.mask.length;
      index += 1
    ) {

      if (
        !selectionState.mask[
          index
        ]
      ) {

        continue;

      }


      const pixelIndex =
        index *
        4;


      if (
        pixels[
          pixelIndex +
          3
        ] ===
        0
      ) {

        continue;

      }


      pixels[
        pixelIndex
      ] =
        0;


      pixels[
        pixelIndex +
        1
      ] =
        0;


      pixels[
        pixelIndex +
        2
      ] =
        0;


      pixels[
        pixelIndex +
        3
      ] =
        0;


      changedPixels +=
        1;

    }


    if (
      changedPixels ===
      0
    ) {

      sendStatusMessage(
        "The selected pixels are already transparent."
      );


      return false;

    }


    layer.context.putImageData(
      imageData,
      0,
      0
    );


    renderLayers();


    saveSelectionHistory(
      "Clear selected pixels"
    );


    sendStatusMessage(
      `${changedPixels.toLocaleString()} selected pixel${
        changedPixels ===
        1
          ? ""
          : "s"
      } cleared.`
    );


    return true;

  }


  /* =======================================================
     14. SELECTION LIFECYCLE
  ======================================================= */

  function beginRectangleSelection(
    payload
  ) {

    selectionState.selecting =
      true;


    selectionState.startPoint =
      copyPoint(
        payload.point
      );


    selectionState.currentPoint =
      copyPoint(
        payload.point
      );


    stopMarchingAnts();


    clearOverlay();


    return true;

  }


  function updateRectangleSelection(
    payload
  ) {

    if (
      !selectionState.selecting ||
      !selectionState.startPoint
    ) {

      return false;

    }


    selectionState.currentPoint =
      copyPoint(
        payload.point
      );


    return drawRectanglePreview(
      selectionState.startPoint,
      selectionState.currentPoint
    );

  }


  function finishRectangleSelection(
    payload
  ) {

    if (
      !selectionState.selecting ||
      !selectionState.startPoint
    ) {

      return false;

    }


    selectionState.currentPoint =
      copyPoint(
        payload.point
      );


    const changed =
      commitRectangleSelection(
        selectionState.startPoint,
        selectionState.currentPoint
      );


    selectionState.selecting =
      false;


    selectionState.startPoint =
      null;


    selectionState.currentPoint =
      null;


    return changed;

  }


  function cancelCurrentSelection() {

    selectionState.selecting =
      false;


    selectionState.startPoint =
      null;


    selectionState.currentPoint =
      null;


    clearOverlay();


    if (hasSelection()) {

      startMarchingAnts();

    }


    return true;

  }


  /* =======================================================
     15. POINTER HANDLERS
  ======================================================= */

  function pointerDown(
    payload
  ) {

    if (
      !selectionState.active
    ) {

      return false;

    }


    const mode =
      getSelectionMode();


    if (
      mode ===
      "magic-wand"
    ) {

      const changed =
        commitMagicWandSelection(
          payload.point
        );


      return {

        changed:
          false,

        preventDefault:
          true,

        releasePointer:
          true,

        clearOverlay:
          !changed

      };

    }


    beginRectangleSelection(
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
      !selectionState.active ||
      !selectionState.selecting
    ) {

      return false;

    }


    updateRectangleSelection(
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
      !selectionState.selecting
    ) {

      return {

        changed:
          false,

        releasePointer:
          true
      };

    }


    finishRectangleSelection(
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

    cancelCurrentSelection();


    return {

      changed:
        false,

      releasePointer:
        true
    };

  }


  /* =======================================================
     16. TOOL ACTIVATION
  ======================================================= */

  function activate() {

    selectionState.active =
      true;


    getCore()
      ?.showToolOptions?.(
        [
          "selection"
        ]
      );


    getCore()
      ?.setCanvasCursor?.(
        "crosshair"
      );


    if (hasSelection()) {

      startMarchingAnts();

    }


    sendStatusMessage(
      getSelectionMode() ===
        "magic-wand"
        ? "Magic Wand ready."
        : "Rectangle selection ready."
    );


    return true;

  }


  function deactivate() {

    selectionState.active =
      false;


    cancelCurrentSelection();


    stopMarchingAnts();


    clearOverlay();


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


    dom.selectionModeInput =
      document.getElementById(
        "selection-mode"
      );


    dom.toleranceInput =
      document.getElementById(
        "wand-tolerance"
      );


    dom.toleranceOutput =
      document.getElementById(
        "wand-tolerance-output"
      );


    dom.contiguousInput =
      document.getElementById(
        "wand-contiguous"
      );


    dom.deselectButton =
      document.getElementById(
        "deselect-button"
      );


    overlayContext =
      dom.overlayCanvas
        ?.getContext(
          "2d"
        ) ||
      null;

  }


  function connectEvents() {

    dom.selectionModeInput
      ?.addEventListener(
        "change",
        () => {

          setSelectionMode(
            dom.selectionModeInput.value
          );

        }
      );


    dom.toleranceInput
      ?.addEventListener(
        "input",
        () => {

          setTolerance(
            dom.toleranceInput.value
          );

        }
      );


    dom.contiguousInput
      ?.addEventListener(
        "change",
        () => {

          setContiguous(
            dom.contiguousInput.checked
          );

        }
      );


    dom.deselectButton
      ?.addEventListener(
        "click",
        () => {

          deselect();

        }
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
          event.key ===
          "Escape" &&
          hasSelection()
        ) {

          event.preventDefault();


          deselect();


          return;

        }


        if (
          (
            event.key ===
              "Delete" ||
            event.key ===
              "Backspace"
          ) &&
          hasSelection()
        ) {

          event.preventDefault();


          clearSelectedPixels();


          return;

        }


        if (
          (
            event.ctrlKey ||
            event.metaKey
          ) &&
          event.shiftKey &&
          event.key.toLowerCase() ===
            "i"
        ) {

          event.preventDefault();


          invertSelection();

        }

      }
    );


    document.addEventListener(
      "paintless:history-restored",
      () => {

        deselect({
          announce:
            false
        });

      }
    );


    document.addEventListener(
      "paintless:document-reset",
      () => {

        deselect({
          announce:
            false
        });

      }
    );


    document.addEventListener(
      "paintless:document-resized",
      () => {

        deselect({
          announce:
            false
        });

      }
    );

  }


  function initialiseSettings() {

    selectionState.mode =
      getSelectionMode();


    if (dom.toleranceInput) {

      selectionState.tolerance =
        Number(
          dom.toleranceInput.value
        ) ||
        24;

    }


    if (dom.contiguousInput) {

      selectionState.contiguous =
        Boolean(
          dom.contiguousInput.checked
        );

    }


    setTolerance(
      selectionState.tolerance
    );


    setContiguous(
      selectionState.contiguous
    );

  }


  /* =======================================================
     18. SELECTION MODULE
  ======================================================= */

  const selectionModule = {

    name:
      "Selection",

    label:
      "Select",

    initialised:
      false,


    async initialise() {

      if (
        selectionState.initialised
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
          "Paintless Selection could not find the editor canvases."
        );

      }


      initialiseSettings();

      connectEvents();


      selectionState.initialised =
        true;


      this.initialised =
        true;


      if (
        tools.getActiveTool() ===
        "select"
      ) {

        activate();

      }


      document.dispatchEvent(
        new CustomEvent(
          "paintless:selection-ready",
          {
            detail: {
              selection:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless Selection ready.",
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

    pointerCancel

  };


  /* =======================================================
     19. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      selectionState,


    activate,

    deactivate,


    hasSelection,

    getSelectionMask,

    isPixelSelected,

    setSelectionMask,


    commitRectangleSelection,

    commitMagicWandSelection,

    createRectangleMask,

    createContiguousMagicMask,

    createGlobalMagicMask,


    deselect,

    invertSelection,

    clearSelectedPixels,


    setSelectionMode,

    getSelectionMode,

    setTolerance,

    getTolerance,

    setContiguous,


    isContiguous() {

      return selectionState.contiguous;

    },


    getSelectionInformation() {

      return {

        mode:
          selectionState.mode,

        rectangle:
          selectionState.rectangle
            ? {
                ...selectionState.rectangle
              }
            : null,

        width:
          selectionState.maskWidth,

        height:
          selectionState.maskHeight,

        selectedPixelCount:
          selectionState.selectedPixelCount,

        inverted:
          selectionState.inverted

      };

    }

  };


  window.PaintlessSelection =
    publicApi;


  selectionModule.api =
    publicApi;


  /* =======================================================
     20. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "select",
    selectionModule
  );

})();
