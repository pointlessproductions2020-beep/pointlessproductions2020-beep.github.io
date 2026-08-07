"use strict";

/* =========================================================
   PAINTLESS
   SELECTION TOOL — v1.5

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
      true,

    polygonPoints:
      [],

    polygonPreviewPoint:
      null,

    renderedMaskCanvas:
      null,

    renderedMaskDirty:
      true,

    completedPolygonPoints:
      null,

    clipboard:
      null

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
      null,

    shortcutHelper:
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

    /*
     * Selection visuals belong on Paintless' existing overlay canvas.
     * It is already sized, zoomed and stacked directly over editor-canvas.
     */
    return dom.overlayCanvas ||
      null;

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


    /*
     * Do not copy CSS transforms, offsets or display sizes here.
     * overlay-canvas already occupies the exact same canvas-stage position
     * as editor-canvas and inherits the stage zoom automatically.
     */
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
      "magic-wand",
      "polygon-lasso"
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
        "magic-wand",
        "polygon-lasso"
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


    const statusMessage =
      mode === "magic-wand"
        ? "Magic Wand ready. Shift adds, Alt subtracts."
        : mode === "polygon-lasso"
          ? "Polygon Lasso ready. Click points, double-click or press Enter to finish."
          : "Rectangle selection ready. Shift adds, Alt subtracts.";


    sendStatusMessage(
      statusMessage
    );


    updateShortcutHelper();


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

    selectionState.outlineDirty =
      true;

    selectionState.outlinePath =
      null;

    selectionState.renderedMaskDirty =
      true;


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


  function clipContext(
    context,
    layer =
      getActiveLayer()
  ) {

    if (
      !context ||
      !hasSelection() ||
      layer !==
        selectionState.layer
    ) {

      return false;

    }


    const mask =
      selectionState.mask;

    const width =
      selectionState.maskWidth;

    const height =
      selectionState.maskHeight;


    context.beginPath();


    for (
      let y = 0;
      y < height;
      y += 1
    ) {

      const rowOffset =
        y *
        width;


      let x =
        0;


      while (
        x < width
      ) {

        while (
          x < width &&
          !mask[
            rowOffset +
            x
          ]
        ) {

          x +=
            1;

        }


        if (
          x >= width
        ) {

          break;

        }


        const runStart =
          x;


        while (
          x < width &&
          mask[
            rowOffset +
            x
          ]
        ) {

          x +=
            1;

        }


        context.rect(
          runStart,
          y,
          x -
            runStart,
          1
        );

      }

    }


    context.clip();


    return true;

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
     11. POLYGON LASSO
  ======================================================= */

  function pointInsidePolygon(
    point,
    polygon
  ) {

    let inside =
      false;


    for (
      let currentIndex = 0,
          previousIndex = polygon.length - 1;
      currentIndex < polygon.length;
      previousIndex = currentIndex,
      currentIndex += 1
    ) {

      const current =
        polygon[currentIndex];

      const previous =
        polygon[previousIndex];


      const crosses =
        (
          current.y > point.y
        ) !==
        (
          previous.y > point.y
        ) &&
        point.x <
          (
            (
              previous.x -
              current.x
            ) *
            (
              point.y -
              current.y
            ) /
            (
              previous.y -
              current.y ||
              Number.EPSILON
            )
          ) +
          current.x;


      if (crosses) {

        inside =
          !inside;

      }

    }


    return inside;

  }


  function createPolygonMask(
    polygonPoints,
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


    if (
      !layer ||
      !Array.isArray(
        polygonPoints
      ) ||
      polygonPoints.length <
        3
    ) {

      return mask;

    }


    const layerPolygon =
      polygonPoints.map(
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
            ...layerPolygon.map(
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
            ...layerPolygon.map(
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
            ...layerPolygon.map(
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
            ...layerPolygon.map(
              (point) =>
                point.y
            )
          )
        ),
        0,
        height
      );


    for (
      let y = minimumY;
      y < maximumY;
      y += 1
    ) {

      const rowOffset =
        y *
        width;


      for (
        let x = minimumX;
        x < maximumX;
        x += 1
      ) {

        if (
          pointInsidePolygon(
            {
              x:
                x +
                0.5,

              y:
                y +
                0.5
            },
            layerPolygon
          )
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


  function commitPolygonSelection(
    polygonPoints,
    options = {}
  ) {

    const layer =
      options.layer ||
      getActiveLayer();


    if (
      !isEditableLayer(
        layer
      ) ||
      !Array.isArray(
        polygonPoints
      ) ||
      polygonPoints.length <
        3
    ) {

      return false;

    }


    const mask =
      createPolygonMask(
        polygonPoints,
        layer.canvas.width,
        layer.canvas.height,
        layer
      );


    setSelectionMask(
      mask,
      layer.canvas.width,
      layer.canvas.height,
      {
        layer,
        combinationMode:
          options.combinationMode ||
          "replace"
      }
    );


    sendStatusMessage(
      `${selectionState.selectedPixelCount.toLocaleString()} pixel${
        selectionState.selectedPixelCount === 1
          ? ""
          : "s"
      } selected with Polygon Lasso.`
    );


    return selectionState.selectedPixelCount >
      0;

  }


  function drawPolygonPreview() {

    if (
      !overlayContext ||
      selectionState.polygonPoints.length ===
        0
    ) {

      return false;

    }


    clearOverlay();


    const points =
      selectionState.polygonPoints;


    overlayContext.save();

    overlayContext.globalAlpha =
      1;

    overlayContext.globalCompositeOperation =
      "source-over";

    overlayContext.lineWidth =
      1.5;

    overlayContext.strokeStyle =
      "rgba(255, 255, 255, 0.98)";

    overlayContext.fillStyle =
      "rgba(168, 76, 255, 0.13)";

    overlayContext.setLineDash(
      [
        7,
        5
      ]
    );

    overlayContext.beginPath();

    overlayContext.moveTo(
      points[0].x,
      points[0].y
    );


    points.slice(
      1
    ).forEach(
      (point) => {

        overlayContext.lineTo(
          point.x,
          point.y
        );

      }
    );


    if (
      selectionState.polygonPreviewPoint
    ) {

      overlayContext.lineTo(
        selectionState.polygonPreviewPoint.x,
        selectionState.polygonPreviewPoint.y
      );

    }


    if (
      points.length >=
        3
    ) {

      overlayContext.lineTo(
        points[0].x,
        points[0].y
      );

      overlayContext.fill();

    }


    overlayContext.stroke();

    overlayContext.setLineDash(
      []
    );


    points.forEach(
      (point) => {

        overlayContext.beginPath();

        overlayContext.arc(
          point.x,
          point.y,
          3.5,
          0,
          Math.PI *
            2
        );

        overlayContext.fillStyle =
          "rgba(168, 76, 255, 1)";

        overlayContext.fill();

        overlayContext.strokeStyle =
          "rgba(255, 255, 255, 0.95)";

        overlayContext.stroke();

      }
    );


    /*
     * Live mouse-position preview, matching the visible feedback used
     * by Brush and Eraser. This is not a committed polygon vertex.
     */
    if (
      selectionState.polygonPreviewPoint
    ) {

      const preview =
        selectionState.polygonPreviewPoint;


      overlayContext.beginPath();

      overlayContext.arc(
        preview.x,
        preview.y,
        7,
        0,
        Math.PI *
          2
      );

      overlayContext.fillStyle =
        "rgba(168, 76, 255, 0.16)";

      overlayContext.fill();

      overlayContext.lineWidth =
        1.5;

      overlayContext.strokeStyle =
        "rgba(255, 255, 255, 0.98)";

      overlayContext.stroke();


      overlayContext.beginPath();

      overlayContext.moveTo(
        preview.x - 10,
        preview.y
      );

      overlayContext.lineTo(
        preview.x + 10,
        preview.y
      );

      overlayContext.moveTo(
        preview.x,
        preview.y - 10
      );

      overlayContext.lineTo(
        preview.x,
        preview.y + 10
      );

      overlayContext.strokeStyle =
        "rgba(168, 76, 255, 1)";

      overlayContext.stroke();

    }


    overlayContext.restore();


    return true;

  }


  function beginOrContinuePolygonSelection(
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


    if (
      !selectionState.selecting
    ) {

      selectionState.selecting =
        true;

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

      selectionState.polygonPoints =
        [];

      selectionState.polygonPreviewPoint =
        null;

      stopMarchingAnts();

    }


    const nextPoint =
      copyPoint(
        payload.point
      );


    const previousPoint =
      selectionState.polygonPoints[
        selectionState.polygonPoints.length -
          1
      ] ||
      null;


    const duplicatePoint =
      previousPoint &&
      Math.abs(
        previousPoint.x -
        nextPoint.x
      ) <
        0.75 &&
      Math.abs(
        previousPoint.y -
        nextPoint.y
      ) <
        0.75;


    if (
      !duplicatePoint
    ) {

      selectionState.polygonPoints.push(
        nextPoint
      );

    }


    selectionState.polygonPreviewPoint =
      nextPoint;


    drawPolygonPreview();


    return true;

  }


  function finishPolygonSelection() {

    if (
      !selectionState.selecting ||
      selectionState.polygonPoints.length <
        3
    ) {

      sendStatusMessage(
        "Polygon Lasso needs at least three points."
      );

      return false;

    }


    const points =
      selectionState.polygonPoints.filter(
        (
          point,
          index,
          allPoints
        ) => {

          if (
            index ===
              0
          ) {

            return true;

          }


          const previous =
            allPoints[
              index -
              1
            ];


          return (
            Math.abs(
              point.x -
              previous.x
            ) >
              0.25 ||
            Math.abs(
              point.y -
              previous.y
            ) >
              0.25
          );

        }
      );


    const changed =
      commitPolygonSelection(
        points,
        {
          layer:
            selectionState.layer,

          combinationMode:
            selectionState.combinationMode
        }
      );


    selectionState.completedPolygonPoints =
      points.map(
        copyPoint
      );

    selectionState.selecting =
      false;

    selectionState.polygonPoints =
      [];

    selectionState.polygonPreviewPoint =
      null;

    selectionState.combinationMode =
      "replace";


    clearOverlay();


    if (
      hasSelection()
    ) {

      startMarchingAnts();

    }


    return changed;

  }


  function removeLastPolygonPoint() {

    if (
      !selectionState.selecting ||
      selectionState.polygonPoints.length ===
        0
    ) {

      return false;

    }


    selectionState.polygonPoints.pop();


    if (
      selectionState.polygonPoints.length ===
        0
    ) {

      cancelCurrentSelection();

      return true;

    }


    drawPolygonPreview();


    return true;

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


  function buildRenderedSelectionMask() {

    if (
      !hasSelection()
    ) {

      selectionState.renderedMaskCanvas =
        null;

      selectionState.renderedMaskDirty =
        false;

      return null;

    }


    const width =
      selectionState.maskWidth;

    const height =
      selectionState.maskHeight;

    const mask =
      selectionState.mask;


    let canvas =
      selectionState.renderedMaskCanvas;


    if (!canvas) {

      canvas =
        document.createElement(
          "canvas"
        );

      selectionState.renderedMaskCanvas =
        canvas;

    }


    if (
      canvas.width !==
        width
    ) {

      canvas.width =
        width;

    }


    if (
      canvas.height !==
        height
    ) {

      canvas.height =
        height;

    }


    const context =
      canvas.getContext(
        "2d",
        {
          alpha:
            true,

          willReadFrequently:
            true
        }
      );


    const imageData =
      context.createImageData(
        width,
        height
      );

    const pixels =
      imageData.data;


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


        const pixelIndex =
          index *
          4;


        /*
         * The completed selection keeps Paintless' purple mask tint
         * visible, so the user can clearly see the selected interior.
         */
        pixels[
          pixelIndex
        ] =
          168;

        pixels[
          pixelIndex +
            1
        ] =
          76;

        pixels[
          pixelIndex +
            2
        ] =
          255;

        pixels[
          pixelIndex +
            3
        ] =
          38;


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


        const boundary =
          !leftSelected ||
          !rightSelected ||
          !topSelected ||
          !bottomSelected;


        if (boundary) {

          const whiteDash =
            (
              x +
              y +
              Math.floor(
                selectionState.dashOffset
              )
            ) %
              10 <
            5;


          const colour =
            whiteDash
              ? 255
              : 10;


          pixels[
            pixelIndex
          ] =
            colour;

          pixels[
            pixelIndex +
              1
          ] =
            colour;

          pixels[
            pixelIndex +
              2
          ] =
            colour;

          pixels[
            pixelIndex +
              3
          ] =
            255;

        }

      }

    }


    context.putImageData(
      imageData,
      0,
      0
    );


    selectionState.renderedMaskDirty =
      false;


    return canvas;

  }


  function drawCompletedPolygonVisual() {

    const points =
      selectionState.completedPolygonPoints;


    if (
      !overlayContext ||
      !Array.isArray(
        points
      ) ||
      points.length <
        3
    ) {

      return false;

    }


    overlayContext.save();

    overlayContext.globalAlpha =
      1;

    overlayContext.globalCompositeOperation =
      "source-over";


    overlayContext.beginPath();

    overlayContext.moveTo(
      points[0].x,
      points[0].y
    );


    points.slice(
      1
    ).forEach(
      (point) => {

        overlayContext.lineTo(
          point.x,
          point.y
        );

      }
    );


    overlayContext.closePath();


    /*
     * Keep the sexy Paintless purple interior after the polygon
     * is committed, not only while it is being drawn.
     */
    overlayContext.fillStyle =
      "rgba(168, 76, 255, 0.28)";

    overlayContext.fill();


    overlayContext.lineWidth =
      3;

    overlayContext.setLineDash(
      [
        6,
        6
      ]
    );

    overlayContext.lineDashOffset =
      -selectionState.dashOffset;

    overlayContext.strokeStyle =
      "rgba(0, 0, 0, 0.98)";

    overlayContext.stroke();


    overlayContext.lineWidth =
      1.5;

    overlayContext.lineDashOffset =
      5 -
      selectionState.dashOffset;

    overlayContext.strokeStyle =
      "rgba(255, 255, 255, 1)";

    overlayContext.stroke();


    overlayContext.restore();


    return true;

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


    clearOverlay();


    if (
      Array.isArray(
        selectionState.completedPolygonPoints
      ) &&
      selectionState.completedPolygonPoints.length >=
        3
    ) {

      return drawCompletedPolygonVisual();

    }


    const renderedMask =
      buildRenderedSelectionMask();


    if (
      !renderedMask
    ) {

      return false;

    }


    overlayContext.save();

    overlayContext.globalAlpha =
      1;

    overlayContext.globalCompositeOperation =
      "source-over";


    applyLayerTransformToOverlay(
      layer
    );


    overlayContext.imageSmoothingEnabled =
      false;


    overlayContext.drawImage(
      renderedMask,
      0,
      0
    );


    overlayContext.restore();


    return true;

  }


  function animateMarchingAnts(
    timestamp
  ) {

    if (
      !hasSelection()
    ) {

      selectionState.animationFrame =
        null;

      return;

    }


    if (
      !selectionState.lastAnimationTime
    ) {

      selectionState.lastAnimationTime =
        timestamp;

    }


    if (
      timestamp -
        selectionState.lastAnimationTime >=
      OUTLINE_FRAME_INTERVAL
    ) {

      selectionState.dashOffset =
        (
          selectionState.dashOffset +
          1
        ) %
        12;

      selectionState.lastAnimationTime =
        timestamp;

      selectionState.renderedMaskDirty =
        true;

      drawSelectionOutline();

    }


    selectionState.animationFrame =
      requestAnimationFrame(
        animateMarchingAnts
      );

  }


  function startMarchingAnts() {

    stopMarchingAnts();


    selectionState.lastAnimationTime =
      0;

    selectionState.dashOffset =
      0;

    selectionState.renderedMaskDirty =
      true;


    drawSelectionOutline();


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

    selectionState.renderedMaskCanvas =
      null;

    selectionState.renderedMaskDirty =
      true;

    selectionState.completedPolygonPoints =
      null;


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
     15. INTERNAL SELECTION CLIPBOARD
  ======================================================= */

  function createShortcutHelper() {

    const existing =
      document.getElementById(
        "paintless-selection-shortcuts"
      );


    if (existing) {

      dom.shortcutHelper =
        existing;

      return existing;

    }


    const viewport =
      document.getElementById(
        "canvas-viewport"
      );


    if (!viewport) {

      return null;

    }


    const helper =
      document.createElement(
        "div"
      );


    helper.id =
      "paintless-selection-shortcuts";

    helper.setAttribute(
      "aria-live",
      "polite"
    );


    helper.style.position =
      "sticky";

    helper.style.left =
      "12px";

    helper.style.bottom =
      "12px";

    helper.style.zIndex =
      "1200";

    helper.style.display =
      "none";

    helper.style.width =
      "fit-content";

    helper.style.maxWidth =
      "min(760px, calc(100% - 24px))";

    helper.style.margin =
      "12px";

    helper.style.padding =
      "9px 12px";

    helper.style.border =
      "1px solid rgba(212, 154, 255, 0.35)";

    helper.style.borderRadius =
      "10px";

    helper.style.background =
      "rgba(12, 8, 18, 0.92)";

    helper.style.color =
      "rgba(255,255,255,0.84)";

    helper.style.boxShadow =
      "0 8px 24px rgba(0,0,0,0.32)";

    helper.style.backdropFilter =
      "blur(8px)";

    helper.style.font =
      '700 11px/1.5 "Segoe UI", Arial, sans-serif';

    helper.style.pointerEvents =
     "auto";

     
    viewport.appendChild(
      helper
    );


    dom.shortcutHelper =
      helper;


    return helper;

  }


  function updateShortcutHelper() {

    const helper =
      dom.shortcutHelper ||
      createShortcutHelper();


    if (!helper) {

      return false;

    }


    const mode =
      getSelectionMode();


    const modeInstructions =
      mode ===
        "polygon-lasso"
        ? "<strong style=\"color:#d49aff\">Polygon Lasso</strong> · Click: add point · Enter/double-click: finish · Backspace: remove point · Esc: cancel/deselect"
        : mode ===
            "magic-wand"
          ? "<strong style=\"color:#d49aff\">Magic Wand</strong> · Click: select colour · Shift: add · Alt: subtract · Shift+Alt: intersect"
          : "<strong style=\"color:#d49aff\">Rectangle Select</strong> · Drag: select · Shift: add · Alt: subtract · Shift+Alt: intersect";


        helper.innerHTML =
      "";


    const content =
      document.createElement(
        "div"
      );


    content.style.paddingRight =
      "28px";


    content.innerHTML =
      `${modeInstructions}<br>` +
      "<span style=\"color:#ffffff\">Ctrl+C</span> Copy · " +
      "<span style=\"color:#ffffff\">Ctrl+X</span> Cut · " +
      "<span style=\"color:#ffffff\">Ctrl+V</span> Paste · " +
      "<span style=\"color:#ffffff\">Ctrl+J</span> Duplicate selection · " +
      "<span style=\"color:#ffffff\">Ctrl+Shift+I</span> Invert · " +
      "<span style=\"color:#ffffff\">Ctrl+D</span> Deselect";


    const closeButton =
      document.createElement(
        "button"
      );


    closeButton.type =
      "button";


    closeButton.textContent =
      "×";


    closeButton.setAttribute(
      "aria-label",
      "Hide selection shortcuts"
    );


    closeButton.style.position =
      "absolute";


    closeButton.style.top =
      "5px";


    closeButton.style.right =
      "7px";


    closeButton.style.width =
      "22px";


    closeButton.style.height =
      "22px";


    closeButton.style.padding =
      "0";


    closeButton.style.border =
      "0";


    closeButton.style.borderRadius =
      "6px";


    closeButton.style.background =
      "transparent";


    closeButton.style.color =
      "rgba(255,255,255,0.65)";


    closeButton.style.fontSize =
      "17px";


    closeButton.style.fontWeight =
      "800";


    closeButton.style.lineHeight =
      "22px";


    closeButton.style.cursor =
      "pointer";


    closeButton.addEventListener(
      "mouseenter",
      () => {

        closeButton.style.color =
          "#ffffff";


        closeButton.style.background =
          "rgba(168,76,255,0.18)";

      }
    );


    closeButton.addEventListener(
      "mouseleave",
      () => {

        closeButton.style.color =
          "rgba(255,255,255,0.65)";


        closeButton.style.background =
          "transparent";

      }
    );


    closeButton.addEventListener(
      "click",
      (event) => {

        event.preventDefault();

        event.stopPropagation();


        helper.style.display =
          "none";

      }
    );


    helper.append(
      content,
      closeButton
    );


    return true;
  }


  function showShortcutHelper() {

    const helper =
      dom.shortcutHelper ||
      createShortcutHelper();


    if (!helper) {

      return false;

    }


    updateShortcutHelper();


    helper.style.display =
      "block";


    return true;

  }


  function hideShortcutHelper() {

    if (
      dom.shortcutHelper
    ) {

      dom.shortcutHelper.style.display =
        "none";

    }


    return true;

  }


  function copySelectionToClipboard({
    announce =
      true
  } = {}) {

    if (
      !hasSelection()
    ) {

      if (announce) {

        sendStatusMessage(
          "Make a selection before copying."
        );

      }

      return false;

    }


    const layer =
      selectionState.layer;


    if (
      !layer?.canvas ||
      !layer?.context
    ) {

      return false;

    }


    const width =
      layer.canvas.width;

    const height =
      layer.canvas.height;


    if (
      selectionState.maskWidth !==
        width ||
      selectionState.maskHeight !==
        height
    ) {

      sendStatusMessage(
        "The selection no longer matches this layer."
      );

      return false;

    }


    const sourceData =
      layer.context.getImageData(
        0,
        0,
        width,
        height
      );

    const copiedData =
      new ImageData(
        width,
        height
      );


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


      copiedData.data[
        pixelIndex
      ] =
        sourceData.data[
          pixelIndex
        ];

      copiedData.data[
        pixelIndex +
          1
      ] =
        sourceData.data[
          pixelIndex +
            1
        ];

      copiedData.data[
        pixelIndex +
          2
      ] =
        sourceData.data[
          pixelIndex +
            2
        ];

      copiedData.data[
        pixelIndex +
          3
      ] =
        sourceData.data[
          pixelIndex +
            3
        ];

    }


    const clipboardCanvas =
      document.createElement(
        "canvas"
      );

    clipboardCanvas.width =
      width;

    clipboardCanvas.height =
      height;

    clipboardCanvas
      .getContext(
        "2d",
        {
          alpha:
            true
        }
      )
      .putImageData(
        copiedData,
        0,
        0
      );


    selectionState.clipboard = {

      canvas:
        clipboardCanvas,

      sourceName:
        layer.name ||
        "Selection",

      transformX:
        Number(
          layer.transformX
        ) ||
        0,

      transformY:
        Number(
          layer.transformY
        ) ||
        0,

      scaleX:
        Number(
          layer.scaleX
        ) ||
        1,

      scaleY:
        Number(
          layer.scaleY
        ) ||
        1,

      rotation:
        Number(
          layer.rotation
        ) ||
        0,

      stereo3dEnabled:
        Boolean(
          layer.stereo3dEnabled
        ),

      depth3d:
        Number(
          layer.depth3d
        ) ||
        0

    };


    if (announce) {

      sendStatusMessage(
        `${selectionState.selectedPixelCount.toLocaleString()} selected pixel${
          selectionState.selectedPixelCount ===
            1
            ? ""
            : "s"
        } copied.`
      );

    }


    return true;

  }


  function pasteSelectionClipboard({
    announce =
      true
  } = {}) {

    const clipboard =
      selectionState.clipboard;


    if (
      !clipboard?.canvas
    ) {

      if (announce) {

        sendStatusMessage(
          "The Paintless clipboard is empty."
        );

      }

      return false;

    }


    const layersApi =
      getLayersApi();


    if (
      typeof layersApi
        ?.createLayer !==
      "function"
    ) {

      sendStatusMessage(
        "Paintless could not create a pasted layer."
      );

      return false;

    }


    const pastedLayer =
      layersApi.createLayer({
        name:
          `${clipboard.sourceName} copy`,

        select:
          true,

        insertAboveActive:
          true
      });


    if (
      !pastedLayer?.context
    ) {

      return false;

    }


    pastedLayer.context.clearRect(
      0,
      0,
      pastedLayer.canvas.width,
      pastedLayer.canvas.height
    );


    pastedLayer.context.drawImage(
      clipboard.canvas,
      0,
      0
    );


    pastedLayer.transformX =
      clipboard.transformX;

    pastedLayer.transformY =
      clipboard.transformY;

    pastedLayer.scaleX =
      clipboard.scaleX;

    pastedLayer.scaleY =
      clipboard.scaleY;

    pastedLayer.rotation =
      clipboard.rotation;

    pastedLayer.stereo3dEnabled =
      clipboard.stereo3dEnabled;

    pastedLayer.depth3d =
      clipboard.depth3d;


    layersApi.renderLayerList?.();

    layersApi.renderLayers?.();


    saveSelectionHistory(
      "Paste selection"
    );


    document.dispatchEvent(
      new CustomEvent(
        "paintless:artwork-changed",
        {
          detail: {
            reason:
              "selection-paste",

            layer:
              pastedLayer
          }
        }
      )
    );


    if (announce) {

      sendStatusMessage(
        "Selection pasted onto a new layer."
      );

    }


    return pastedLayer;

  }


  function cutSelectionToClipboard() {

    if (
      !copySelectionToClipboard({
        announce:
          false
      })
    ) {

      return false;

    }


    const cleared =
      clearSelectedPixels();


    if (cleared) {

      sendStatusMessage(
        "Selection cut to the Paintless clipboard."
      );

    }


    return cleared;

  }


  function duplicateSelectionToLayer() {

    if (
      !copySelectionToClipboard({
        announce:
          false
      })
    ) {

      return false;

    }


    const pastedLayer =
      pasteSelectionClipboard({
        announce:
          false
      });


    if (pastedLayer) {

      sendStatusMessage(
        "Selection duplicated onto a new layer."
      );

    }


    return pastedLayer;

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

    selectionState.polygonPoints =
      [];

    selectionState.polygonPreviewPoint =
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
      "polygon-lasso"
    ) {

      const started =
        beginOrContinuePolygonSelection(
          payload
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
          started

      };

    }


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


    if (
      getSelectionMode() ===
        "polygon-lasso"
    ) {

      selectionState.polygonPreviewPoint =
        copyPoint(
          payload.point
        );

      drawPolygonPreview();

    } else {

      updateRectangleSelection(
        payload
      );

    }


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


    if (
      getSelectionMode() !==
        "polygon-lasso"
    ) {

      finishRectangleSelection(
        payload
      );

    }


    return {

      changed:
        false,

      preventDefault:
        true,

      releasePointer:
        true

    };

  }



  function hover(
    payload
  ) {

    if (
      !selectionState.active ||
      getSelectionMode() !==
        "polygon-lasso" ||
      !selectionState.selecting
    ) {

      return false;

    }


    selectionState.polygonPreviewPoint =
      copyPoint(
        payload.point
      );


    drawPolygonPreview();


    return {

      changed:
        false,

      preventDefault:
        false,

      clearOverlay:
        false

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


    showShortcutHelper();


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


    hideShortcutHelper();


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
      getCore()
        ?.getOverlayContext?.() ||
      dom.overlayCanvas
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

    dom.editorCanvas
      ?.addEventListener(
        "dblclick",
        (event) => {

          if (
            !selectionState.active ||
            getSelectionMode() !==
              "polygon-lasso" ||
            !selectionState.selecting
          ) {

            return;

          }


          event.preventDefault();
          event.stopPropagation();


          finishPolygonSelection();

        }
      );


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
          getSelectionMode() ===
            "polygon-lasso" &&
          selectionState.selecting
        ) {

          if (
            event.key ===
              "Enter"
          ) {

            event.preventDefault();

            finishPolygonSelection();

            return;

          }


          if (
            event.key ===
              "Backspace"
          ) {

            event.preventDefault();

            removeLastPolygonPoint();

            return;

          }


          if (
            event.key ===
              "Escape"
          ) {

            event.preventDefault();

            cancelCurrentSelection();

            sendStatusMessage(
              "Polygon Lasso cancelled."
            );

            return;

          }

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


        const modifierPressed =
          event.ctrlKey ||
          event.metaKey;


        if (
          modifierPressed &&
          !event.shiftKey &&
          event.key.toLowerCase() ===
            "c" &&
          hasSelection()
        ) {

          event.preventDefault();

          copySelectionToClipboard();

          return;

        }


        if (
          modifierPressed &&
          !event.shiftKey &&
          event.key.toLowerCase() ===
            "x" &&
          hasSelection()
        ) {

          event.preventDefault();

          cutSelectionToClipboard();

          return;

        }


        if (
          modifierPressed &&
          !event.shiftKey &&
          event.key.toLowerCase() ===
            "v"
        ) {

          event.preventDefault();

          pasteSelectionClipboard();

          return;

        }


        if (
          modifierPressed &&
          !event.shiftKey &&
          event.key.toLowerCase() ===
            "j" &&
          hasSelection()
        ) {

          event.preventDefault();

          duplicateSelectionToLayer();

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

      createShortcutHelper();


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
        "%cPaintless Selection v1.5 — clipboard + shortcut helper ready.",
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

    hover,

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

    clipContext,

    isPixelSelected,

    setSelectionMask,


    commitRectangleSelection,

    commitPolygonSelection,

    commitMagicWandSelection,

    createRectangleMask,

    createPolygonMask,

    createContiguousMagicMask,

    createGlobalMagicMask,


    deselect,

    invertSelection,

    clearSelectedPixels,

    copySelectionToClipboard,

    cutSelectionToClipboard,

    pasteSelectionClipboard,

    duplicateSelectionToLayer,


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
