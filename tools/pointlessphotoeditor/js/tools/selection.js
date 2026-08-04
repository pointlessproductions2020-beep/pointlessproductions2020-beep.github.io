"use strict";

/* =========================================================
   PAINTLESS
   SELECTION TOOL — v1.1

   File:
   js/tools/selection.js

   Fixes:
   - Magic Wand now samples the transformed active layer
   - Selections remain attached to the active layer
   - Stable cached marching-ants outline
   - Shift adds to the current selection
   - Alt subtracts from the current selection
   - Shift + Alt intersects with the current selection
   - Delete / Backspace clears selected pixels
   - Rectangle selection works with moved, scaled and rotated layers
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
     2. CONSTANTS
  ======================================================= */

  const OUTLINE_FRAME_INTERVAL =
    1000 / 12;

  const DEFAULT_TOLERANCE =
    24;


  /* =======================================================
     3. STATE
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
      DEFAULT_TOLERANCE,

    contiguous:
      true,

    inverted:
      false,

    layer:
      null,

    layerId:
      null,

    combinationMode:
      "replace",

    animationFrame:
      null,

    lastAnimationTime:
      0,

    dashOffset:
      0,

    marchingAntsSpeed:
      1,

    outlinePath:
      null,

    outlineDirty:
      true

  };


  /* =======================================================
     4. DOM
  ======================================================= */

  const dom = {

    editorCanvas:
      null,

    overlayCanvas:
      null,

    selectionOverlayCanvas:
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
     5. SHARED APIS
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


  function createSelectionOverlayCanvas() {

    const existingCanvas =
      document.getElementById(
        "selection-overlay-canvas"
      );


    if (existingCanvas) {

      return existingCanvas;

    }


    if (
      !dom.overlayCanvas ||
      !dom.overlayCanvas.parentElement
    ) {

      return null;

    }


    const canvas =
      document.createElement(
        "canvas"
      );


    canvas.id =
      "selection-overlay-canvas";


    canvas.setAttribute(
      "aria-hidden",
      "true"
    );


    canvas.style.position =
      "absolute";

    canvas.style.left =
      "0";

    canvas.style.top =
      "0";

    canvas.style.pointerEvents =
      "none";

    canvas.style.touchAction =
      "none";

    canvas.style.userSelect =
      "none";

    canvas.style.zIndex =
      "18";


    dom.overlayCanvas.parentElement
      .insertBefore(
        canvas,
        dom.overlayCanvas
      );


    return canvas;

  }


  function synchroniseSelectionOverlay() {

    if (
      !dom.selectionOverlayCanvas ||
      !dom.editorCanvas
    ) {

      return false;

    }


    if (
      dom.selectionOverlayCanvas.width !==
        dom.editorCanvas.width
    ) {

      dom.selectionOverlayCanvas.width =
        dom.editorCanvas.width;

    }


    if (
      dom.selectionOverlayCanvas.height !==
        dom.editorCanvas.height
    ) {

      dom.selectionOverlayCanvas.height =
        dom.editorCanvas.height;

    }


    const editorStyle =
      window.getComputedStyle(
        dom.editorCanvas
      );


    dom.selectionOverlayCanvas.style.width =
      editorStyle.width;

    dom.selectionOverlayCanvas.style.height =
      editorStyle.height;

    dom.selectionOverlayCanvas.style.transform =
      editorStyle.transform ===
        "none"
        ? ""
        : editorStyle.transform;

    dom.selectionOverlayCanvas.style.transformOrigin =
      editorStyle.transformOrigin;

    dom.selectionOverlayCanvas.style.borderRadius =
      editorStyle.borderRadius;


    return true;

  }


  function clearOverlay() {

    if (
      !dom.selectionOverlayCanvas ||
      !overlayContext
    ) {

      return;

    }


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


    overlayContext.setLineDash(
      []
    );


    overlayContext.clearRect(
      0,
      0,
      dom.selectionOverlayCanvas.width,
      dom.selectionOverlayCanvas.height
    );


    overlayContext.restore();

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
     6. GENERAL HELPERS
  ======================================================= */

  function clamp(
    value,
    minimum,
    maximum
  ) {

    const number =
      Number(
        value
      );


    if (
      !Number.isFinite(
        number
      )
    ) {

      return minimum;

    }


    return Math.min(
      maximum,
      Math.max(
        minimum,
        number
      )
    );

  }


  function normaliseNumber(
    value,
    fallback = 0
  ) {

    const number =
      Number(
        value
      );


    return Number.isFinite(
      number
    )
      ? number
      : fallback;

  }


  function copyPoint(
    point
  ) {

    if (!point) {

      return null;

    }


    return {

      x:
        normaliseNumber(
          point.x,
          0
        ),

      y:
        normaliseNumber(
          point.y,
          0
        ),

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


  function getLayerIdentifier(
    layer
  ) {

    return (
      layer?.id ??
      layer?.uuid ??
      layer?.name ??
      null
    );

  }


  function isEditableLayer(
    layer
  ) {

    return Boolean(
      layer &&
      layer.canvas &&
      layer.context &&
      layer.visible !==
        false &&
      !layer.locked
    );

  }


  function getCombinationMode(
    payload
  ) {

    const shiftKey =
      Boolean(
        payload?.shiftKey
      );

    const altKey =
      Boolean(
        payload?.altKey
      );


    if (
      shiftKey &&
      altKey
    ) {

      return "intersect";

    }


    if (shiftKey) {

      return "add";

    }


    if (altKey) {

      return "subtract";

    }


    return "replace";

  }


  /* =======================================================
     7. LAYER TRANSFORMS
  ======================================================= */

  function getLayerTransform(
    layer
  ) {

    const width =
      Math.max(
        1,
        layer?.canvas?.width ||
        1
      );

    const height =
      Math.max(
        1,
        layer?.canvas?.height ||
        1
      );


    return {

      width,

      height,

      centreX:
        normaliseNumber(
          layer?.transformX,
          0
        ) +
        width /
        2,

      centreY:
        normaliseNumber(
          layer?.transformY,
          0
        ) +
        height /
        2,

      scaleX:
        normaliseNumber(
          layer?.scaleX,
          1
        ) ||
        1,

      scaleY:
        normaliseNumber(
          layer?.scaleY,
          1
        ) ||
        1,

      rotation:
        normaliseNumber(
          layer?.rotation,
          0
        ) *
        Math.PI /
        180

    };

  }


  function documentPointToLayerPoint(
    point,
    layer
  ) {

    const transform =
      getLayerTransform(
        layer
      );


    const offsetX =
      point.x -
      transform.centreX;

    const offsetY =
      point.y -
      transform.centreY;


    const cosine =
      Math.cos(
        -transform.rotation
      );

    const sine =
      Math.sin(
        -transform.rotation
      );


    const rotatedX =
      offsetX *
      cosine -
      offsetY *
      sine;

    const rotatedY =
      offsetX *
      sine +
      offsetY *
      cosine;


    return {

      x:
        rotatedX /
        transform.scaleX +
        transform.width /
        2,

      y:
        rotatedY /
        transform.scaleY +
        transform.height /
        2,

      inside:
        true

    };

  }


  function layerPointToDocumentPoint(
    point,
    layer
  ) {

    const transform =
      getLayerTransform(
        layer
      );


    const localX =
      (
        point.x -
        transform.width /
        2
      ) *
      transform.scaleX;

    const localY =
      (
        point.y -
        transform.height /
        2
      ) *
      transform.scaleY;


    const cosine =
      Math.cos(
        transform.rotation
      );

    const sine =
      Math.sin(
        transform.rotation
      );


    return {

      x:
        transform.centreX +
        localX *
        cosine -
        localY *
        sine,

      y:
        transform.centreY +
        localX *
        sine +
        localY *
        cosine

    };

  }


  function pointIsInsideLayer(
    point,
    layer
  ) {

    return Boolean(
      point &&
      layer?.canvas &&
      point.x >=
        0 &&
      point.y >=
        0 &&
      point.x <
        layer.canvas.width &&
      point.y <
        layer.canvas.height
    );

  }


  /* =======================================================
     8. SETTINGS
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


    if (
      dom.selectionModeInput
    ) {

      dom.selectionModeInput.value =
        mode;

    }


    cancelCurrentSelection();


    sendStatusMessage(
      mode ===
        "magic-wand"
        ? "Magic Wand ready. Shift adds, Alt subtracts."
        : "Rectangle selection ready. Shift adds, Alt subtracts."
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


    if (
      dom.toleranceInput
    ) {

      dom.toleranceInput.value =
        String(
          selectionState.tolerance
        );

    }


    if (
      dom.toleranceOutput
    ) {

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


    if (
      dom.contiguousInput
    ) {

      dom.contiguousInput.checked =
        selectionState.contiguous;

    }


    return selectionState.contiguous;

  }


  /* =======================================================
     9. MASK HELPERS
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


  function countSelectedPixels(
    mask
  ) {

    if (!mask) {

      return 0;

    }


    let count =
      0;


    for (
      let index = 0;
      index <
      mask.length;
      index +=
      1
    ) {

      count +=
        mask[
          index
        ]
          ? 1
          : 0;

    }


    return count;

  }


  function combineMasks(
    currentMask,
    nextMask,
    mode
  ) {

    if (
      !currentMask ||
      currentMask.length !==
        nextMask.length ||
      mode ===
        "replace"
    ) {

      return nextMask;

    }


    const output =
      new Uint8Array(
        nextMask.length
      );


    for (
      let index = 0;
      index <
      output.length;
      index +=
      1
    ) {

      const current =
        Boolean(
          currentMask[
            index
          ]
        );

      const next =
        Boolean(
          nextMask[
            index
          ]
        );


      if (
        mode ===
        "add"
      ) {

        output[
          index
        ] =
          current ||
          next
            ? 1
            : 0;

      } else if (
        mode ===
        "subtract"
      ) {

        output[
          index
        ] =
          current &&
          !next
            ? 1
            : 0;

      } else if (
        mode ===
        "intersect"
      ) {

        output[
          index
        ] =
          current &&
          next
            ? 1
            : 0;

      }

    }


    return output;

  }


  function setSelectionMask(
    mask,
    width,
    height,
    {
      rectangle =
        null,

      inverted =
        false,

      layer =
        getActiveLayer(),

      combinationMode =
        "replace"
    } = {}
  ) {

    if (
      !layer ||
      !mask ||
      mask.length !==
        width *
        height
    ) {

      return false;

    }


    const sameLayer =
      selectionState.layer ===
        layer;


    const combinedMask =
      combineMasks(
        sameLayer
          ? selectionState.mask
          : null,
        mask,
        combinationMode
      );


    selectionState.mask =
      combinedMask;

    selectionState.maskWidth =
      width;

    selectionState.maskHeight =
      height;

    selectionState.rectangle =
      rectangle;

    selectionState.inverted =
      inverted;

    selectionState.layer =
      layer;

    selectionState.layerId =
      getLayerIdentifier(
        layer
      );

    selectionState.selectedPixelCount =
      countSelectedPixels(
        combinedMask
      );


    console.log(
      "PAINTLESS SELECTION MASK",
      {
        mode:
          selectionState.mode,

        layer:
          selectionState.layer?.name ||
          selectionState.layerId,

        width:
          selectionState.maskWidth,

        height:
          selectionState.maskHeight,

        selectedPixelCount:
          selectionState.selectedPixelCount,

        combinationMode
      }
    );

    selectionState.outlineDirty =
      true;

    selectionState.outlinePath =
      null;


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
              selectionState.inverted,

            layer:
              selectionState.layer,

            combinationMode

          }
        }
      )
    );


    return true;

  }


  function hasSelection() {

    return Boolean(
      selectionState.mask &&
      selectionState.layer &&
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
     10. RECTANGLE SELECTION
  ======================================================= */

  function createRectangleMask(
    rectangle,
    width,
    height,
    layer =
      getActiveLayer()
  ) {

    const mask =
      createEmptyMask(
        width,
        height
      );


    if (!layer) {

      return mask;

    }


    const corners =
      [
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
            rectangle.x +
            rectangle.width,
          y:
            rectangle.y +
            rectangle.height
        },
        {
          x:
            rectangle.x,
          y:
            rectangle.y +
            rectangle.height
        }
      ]
        .map(
          (point) =>
            documentPointToLayerPoint(
              point,
              layer
            )
        );


    const minimumX =
      clamp(
        Math.floor(
          Math.min(
            ...corners.map(
              (point) =>
                point.x
            )
          )
        ),
        0,
        width
      );

    const maximumX =
      clamp(
        Math.ceil(
          Math.max(
            ...corners.map(
              (point) =>
                point.x
            )
          )
        ),
        0,
        width
      );

    const minimumY =
      clamp(
        Math.floor(
          Math.min(
            ...corners.map(
              (point) =>
                point.y
            )
          )
        ),
        0,
        height
      );

    const maximumY =
      clamp(
        Math.ceil(
          Math.max(
            ...corners.map(
              (point) =>
                point.y
            )
          )
        ),
        0,
        height
      );


    const right =
      rectangle.x +
      rectangle.width;

    const bottom =
      rectangle.y +
      rectangle.height;


    for (
      let y =
        minimumY;
      y <
        maximumY;
      y +=
        1
    ) {

      const rowOffset =
        y *
        width;


      for (
        let x =
          minimumX;
        x <
          maximumX;
        x +=
          1
      ) {

        const documentPoint =
          layerPointToDocumentPoint(
            {
              x:
                x +
                0.5,

              y:
                y +
                0.5
            },
            layer
          );


        if (
          documentPoint.x >=
            rectangle.x &&
          documentPoint.x <=
            right &&
          documentPoint.y >=
            rectangle.y &&
          documentPoint.y <=
            bottom
        ) {

          mask[
            rowOffset +
            x
          ] =
            1;

        }

      }

    }


    return mask;

  }


  function commitRectangleSelection(
    startPoint,
    endPoint,
    options = {}
  ) {

    const layer =
      options.layer ||
      getActiveLayer();


    if (
      !isEditableLayer(
        layer
      )
    ) {

      sendStatusMessage(
        "Select an editable layer first."
      );

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

      return false;

    }


    const mask =
      createRectangleMask(
        rectangle,
        layer.canvas.width,
        layer.canvas.height,
        layer
      );


    setSelectionMask(
      mask,
      layer.canvas.width,
      layer.canvas.height,
      {
        rectangle,
        layer,
        combinationMode:
          options.combinationMode ||
          "replace"
      }
    );


    sendStatusMessage(
      `${selectionState.selectedPixelCount.toLocaleString()} pixel${
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
     11. MAGIC WAND
  ======================================================= */

  function coloursMatch(
    pixels,
    pixelIndex,
    target,
    tolerance
  ) {

    const redDifference =
      pixels[
        pixelIndex
      ] -
      target.red;

    const greenDifference =
      pixels[
        pixelIndex +
        1
      ] -
      target.green;

    const blueDifference =
      pixels[
        pixelIndex +
        2
      ] -
      target.blue;

    const alphaDifference =
      pixels[
        pixelIndex +
        3
      ] -
      target.alpha;


    const colourDistance =
      Math.sqrt(
        redDifference *
        redDifference +
        greenDifference *
        greenDifference +
        blueDifference *
        blueDifference
      );


    const maximumColourDistance =
      tolerance *
      Math.sqrt(
        3
      );


    return (
      colourDistance <=
        maximumColourDistance &&
      Math.abs(
        alphaDifference
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

    const startPixelNumber =
      startY *
      width +
      startX;

    const startPixelIndex =
      startPixelNumber *
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

    const queue =
      new Int32Array(
        width *
        height
      );


    let queueStart =
      0;

    let queueEnd =
      0;


    queue[
      queueEnd
    ] =
      startPixelNumber;

    queueEnd +=
      1;


    while (
      queueStart <
      queueEnd
    ) {

      const pixelNumber =
        queue[
          queueStart
        ];

      queueStart +=
        1;


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


      const x =
        pixelNumber %
        width;

      const y =
        Math.floor(
          pixelNumber /
          width
        );


      if (
        x >
        0
      ) {

        queue[
          queueEnd
        ] =
          pixelNumber -
          1;

        queueEnd +=
          1;

      }


      if (
        x <
        width -
        1
      ) {

        queue[
          queueEnd
        ] =
          pixelNumber +
          1;

        queueEnd +=
          1;

      }


      if (
        y >
        0
      ) {

        queue[
          queueEnd
        ] =
          pixelNumber -
          width;

        queueEnd +=
          1;

      }


      if (
        y <
        height -
        1
      ) {

        queue[
          queueEnd
        ] =
          pixelNumber +
          width;

        queueEnd +=
          1;

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
      pixelNumber +=
      1
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
    documentPoint,
    options = {}
  ) {

    const layer =
      options.layer ||
      getActiveLayer();


    if (
      !isEditableLayer(
        layer
      )
    ) {

      sendStatusMessage(
        "There is no editable active layer to sample."
      );

      return false;

    }


    const localPoint =
      documentPointToLayerPoint(
        documentPoint,
        layer
      );


    if (
      !pointIsInsideLayer(
        localPoint,
        layer
      )
    ) {

      sendStatusMessage(
        "Click inside the active layer."
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
          localPoint.x
        ),
        0,
        width -
        1
      );

    const y =
      clamp(
        Math.floor(
          localPoint.y
        ),
        0,
        height -
        1
      );


    let imageData;


    try {

      imageData =
        layer.context.getImageData(
          0,
          0,
          width,
          height
        );

    } catch (
      error
    ) {

      console.error(
        "Paintless Magic Wand could not read the active layer:",
        error
      );


      sendStatusMessage(
        "The Magic Wand could not read this layer."
      );

      return false;

    }


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
      height,
      {
        layer,
        combinationMode:
          options.combinationMode ||
          "replace"
      }
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
     12. PREVIEW
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
      "rgba(255, 255, 255, 0.96)";

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
     13. STABLE MARCHING ANTS
  ======================================================= */

  function buildSelectionOutlinePath() {

    if (
      !hasSelection()
    ) {

      selectionState.outlinePath =
        null;

      selectionState.outlineDirty =
        false;

      return null;

    }


    const width =
      selectionState.maskWidth;

    const height =
      selectionState.maskHeight;

    const mask =
      selectionState.mask;

    const path =
      new Path2D();


    for (
      let y = 0;
      y <
      height;
      y +=
      1
    ) {

      const row =
        y *
        width;


      for (
        let x = 0;
        x <
        width;
        x +=
        1
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

          path.moveTo(
            x,
            y
          );

          path.lineTo(
            x +
            1,
            y
          );

        }


        if (!rightSelected) {

          path.moveTo(
            x +
            1,
            y
          );

          path.lineTo(
            x +
            1,
            y +
            1
          );

        }


        if (!bottomSelected) {

          path.moveTo(
            x +
            1,
            y +
            1
          );

          path.lineTo(
            x,
            y +
            1
          );

        }


        if (!leftSelected) {

          path.moveTo(
            x,
            y +
            1
          );

          path.lineTo(
            x,
            y
          );

        }

      }

    }


    selectionState.outlinePath =
      path;

    selectionState.outlineDirty =
      false;


    return path;

  }


  function applyLayerTransformToOverlay(
    layer
  ) {

    const transform =
      getLayerTransform(
        layer
      );


    overlayContext.translate(
      transform.centreX,
      transform.centreY
    );

    overlayContext.rotate(
      transform.rotation
    );

    overlayContext.scale(
      transform.scaleX,
      transform.scaleY
    );

    overlayContext.translate(
      -transform.width /
      2,
      -transform.height /
      2
    );

  }


  function drawSelectionOutline() {

    if (
      !hasSelection() ||
      !overlayContext
    ) {

      return false;

    }


    const layer =
      selectionState.layer;


    if (
      !layer ||
      layer.visible ===
        false
    ) {

      clearOverlay();

      return false;

    }


    const path =
      selectionState.outlineDirty ||
      !selectionState.outlinePath
        ? buildSelectionOutlinePath()
        : selectionState.outlinePath;


    if (!path) {

      clearOverlay();

      return false;

    }


    clearOverlay();


    overlayContext.save();

    overlayContext.globalAlpha =
      1;

    overlayContext.globalCompositeOperation =
      "source-over";

    applyLayerTransformToOverlay(
      layer
    );

    overlayContext.lineWidth =
      2;

    overlayContext.setLineDash(
      [
        5,
        4
      ]
    );

    overlayContext.lineDashOffset =
      0;

    overlayContext.strokeStyle =
      "rgba(0, 0, 0, 0.95)";

    overlayContext.stroke(
      path
    );

    overlayContext.lineWidth =
      1;

    overlayContext.strokeStyle =
      "rgba(255, 255, 255, 0.98)";

    overlayContext.stroke(
      path
    );

    overlayContext.restore();


    return true;

  }


  function animateMarchingAnts() {

    /*
     * Selection animation is intentionally disabled for now.
     * A stable outline is much more useful than an outline that
     * intermittently disappears while the selection engine is
     * being validated.
     */

    selectionState.animationFrame =
      null;


    drawSelectionOutline();

  }


  function startMarchingAnts() {

    stopMarchingAnts();


    selectionState.lastAnimationTime =
      0;

    selectionState.dashOffset =
      0;


    drawSelectionOutline();

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

    selectionState.lastAnimationTime =
      0;

  }


  /* =======================================================
     14. DESELECT AND INVERT
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

    selectionState.layer =
      null;

    selectionState.layerId =
      null;

    selectionState.combinationMode =
      "replace";

    selectionState.outlinePath =
      null;

    selectionState.outlineDirty =
      true;


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

    const layer =
      selectionState.layer ||
      getActiveLayer();


    if (
      !layer?.canvas
    ) {

      return false;

    }


    const width =
      layer.canvas.width;

    const height =
      layer.canvas.height;

    const mask =
      selectionState.mask ||
      createEmptyMask(
        width,
        height
      );

    const invertedMask =
      new Uint8Array(
        width *
        height
      );


    for (
      let index = 0;
      index <
      invertedMask.length;
      index +=
      1
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
          !selectionState.inverted,

        layer,

        combinationMode:
          "replace"
      }
    );


    sendStatusMessage(
      "Selection inverted."
    );


    return true;

  }


  /* =======================================================
     15. CLEAR SELECTED PIXELS
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

    if (
      !hasSelection()
    ) {

      console.warn(
        "Paintless could not clear pixels because no live selection mask exists."
      );


      sendStatusMessage(
        "No live selection exists."
      );


      return false;

    }


    const layer =
      selectionState.layer;


    if (
      !isEditableLayer(
        layer
      )
    ) {

      sendStatusMessage(
        "The selected layer cannot be edited."
      );

      return false;

    }


    if (
      selectionState.maskWidth !==
        layer.canvas.width ||
      selectionState.maskHeight !==
        layer.canvas.height
    ) {

      sendStatusMessage(
        "The selection no longer matches this layer."
      );

      deselect({
        announce:
          false
      });

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
      index +=
      1
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


    document.dispatchEvent(
      new CustomEvent(
        "paintless:artwork-changed",
        {
          detail: {
            reason:
              "selection-clear",

            layer
          }
        }
      )
    );


    document.dispatchEvent(
      new CustomEvent(
        "paintless3d:render-requested",
        {
          detail: {
            reason:
              "selection-clear",

            layer
          }
        }
      )
    );


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
     16. SELECTION LIFECYCLE
  ======================================================= */

  function beginRectangleSelection(
    payload
  ) {

    const layer =
      getActiveLayer();


    if (
      !isEditableLayer(
        layer
      )
    ) {

      sendStatusMessage(
        "Select an editable layer first."
      );

      return false;

    }


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

    selectionState.layer =
      layer;

    selectionState.layerId =
      getLayerIdentifier(
        layer
      );

    selectionState.combinationMode =
      getCombinationMode(
        payload
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
        selectionState.currentPoint,
        {
          layer:
            selectionState.layer,

          combinationMode:
            selectionState.combinationMode
        }
      );


    selectionState.selecting =
      false;

    selectionState.startPoint =
      null;

    selectionState.currentPoint =
      null;

    selectionState.combinationMode =
      "replace";


    return changed;

  }


  function cancelCurrentSelection() {

    selectionState.selecting =
      false;

    selectionState.startPoint =
      null;

    selectionState.currentPoint =
      null;

    selectionState.combinationMode =
      "replace";


    clearOverlay();


    if (
      hasSelection()
    ) {

      startMarchingAnts();

    }


    return true;

  }


  /* =======================================================
     17. POINTER HANDLERS
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
          payload.point,
          {
            combinationMode:
              getCombinationMode(
                payload
              )
          }
        );


      return {

        changed:
          false,

        preventDefault:
          true,

        releasePointer:
          true,

        clearOverlay:
          false,

        selectionChanged:
          changed

      };

    }


    const started =
      beginRectangleSelection(
        payload
      );


    if (!started) {

      return false;

    }


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
     18. TOOL ACTIVATION
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


    if (
      hasSelection()
    ) {

      startMarchingAnts();

    }


    sendStatusMessage(
      getSelectionMode() ===
        "magic-wand"
        ? "Magic Wand ready. Shift adds, Alt subtracts."
        : "Rectangle selection ready. Shift adds, Alt subtracts."
    );


    return true;

  }


  function deactivate() {

    selectionState.active =
      false;


    selectionState.selecting =
      false;

    selectionState.startPoint =
      null;

    selectionState.currentPoint =
      null;

    selectionState.combinationMode =
      "replace";


    if (
      hasSelection()
    ) {

      startMarchingAnts();

    } else {

      clearOverlay();

    }


    return true;

  }


  /* =======================================================
     19. DOM AND EVENTS
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

    dom.selectionOverlayCanvas =
      createSelectionOverlayCanvas();


    synchroniseSelectionOverlay();

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
      dom.selectionOverlayCanvas
        ?.getContext(
          "2d"
        ) ||
      null;

  }


  function handleActiveLayerChanged() {

    const activeLayer =
      getActiveLayer();


    if (
      hasSelection() &&
      activeLayer !==
        selectionState.layer
    ) {

      deselect({
        announce:
          false
      });

    }

  }


  function handleLayerTransformed(
    event
  ) {

    if (
      hasSelection() &&
      (
        !event.detail?.layer ||
        event.detail.layer ===
          selectionState.layer
      )
    ) {

      drawSelectionOutline();

    }

  }


  function isTextEntryTarget(
    target
  ) {

    if (
      !target ||
      target ===
        document.body ||
      target ===
        document.documentElement
    ) {

      return false;

    }


    if (
      target.isContentEditable
    ) {

      return true;

    }


    const tagName =
      String(
        target.tagName ||
        ""
      ).toLowerCase();


    if (
      tagName ===
        "textarea"
    ) {

      return true;

    }


    if (
      tagName !==
        "input"
    ) {

      return false;

    }


    const inputType =
      String(
        target.type ||
        "text"
      ).toLowerCase();


    return ![
      "button",
      "checkbox",
      "color",
      "file",
      "hidden",
      "image",
      "radio",
      "range",
      "reset",
      "submit"
    ].includes(
      inputType
    );

  }


  function connectEvents() {

    dom.selectionModeInput
      ?.addEventListener(
        "change",
        () => {

          setSelectionMode(
            dom.selectionModeInput.value
          );


          dom.selectionModeInput.blur();

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
          isTextEntryTarget(
            event.target
          )
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
            event.ctrlKey ||
            event.metaKey
          ) &&
          event.key.toLowerCase() ===
            "d" &&
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

          event.stopPropagation();


          const cleared =
            clearSelectedPixels();


          console.log(
            "PAINTLESS DELETE SELECTION",
            {
              cleared,

              selectedPixelCount:
                selectionState.selectedPixelCount,

              layer:
                selectionState.layer?.name ||
                selectionState.layerId
            }
          );


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
       },
      true
    );


    document.addEventListener(
      "paintless:active-layer-changed",
      handleActiveLayerChanged
    );


    document.addEventListener(
      "paintless:layer-transformed",
      handleLayerTransformed
    );


    window.addEventListener(
      "resize",
      () => {

        synchroniseSelectionOverlay();

        drawSelectionOutline();

      }
    );


    document.addEventListener(
      "paintless:canvas-rendered",
      () => {

        synchroniseSelectionOverlay();

      }
    );


    [
      "paintless:history-restored",
      "paintless:document-reset",
      "paintless:document-resized",
      "paintless:layers-restored"
    ].forEach(
      (eventName) => {

        document.addEventListener(
          eventName,
          () => {

            deselect({
              announce:
                false
            });

          }
        );

      }
    );

  }


  function initialiseSettings() {

    selectionState.mode =
      getSelectionMode();


    if (
      dom.toleranceInput
    ) {

      selectionState.tolerance =
        Number(
          dom.toleranceInput.value
        ) ||
        DEFAULT_TOLERANCE;

    }


    if (
      dom.contiguousInput
    ) {

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
     20. MODULE
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
        !dom.selectionOverlayCanvas ||
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
     21. PUBLIC API
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
          selectionState.inverted,

        layer:
          selectionState.layer,

        layerId:
          selectionState.layerId

      };

    }

  };


  window.PaintlessSelection =
    publicApi;


  selectionModule.api =
    publicApi;


  /* =======================================================
     22. REGISTER
  ======================================================= */

  tools.registerModule(
    "select",
    selectionModule
  );

})();
