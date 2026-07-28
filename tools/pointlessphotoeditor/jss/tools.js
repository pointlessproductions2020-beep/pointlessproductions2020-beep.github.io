"use strict";

/* =========================================================
   PAINTLESS
   DRAWING AND TOOLS SYSTEM
========================================================= */

(() => {

  /* =======================================================
     1. DOM REFERENCES
  ======================================================= */

  const editorCanvas =
    document.getElementById(
      "editor-canvas"
    );

  const overlayCanvas =
    document.getElementById(
      "overlay-canvas"
    );

  const canvasTextEditor =
    document.getElementById(
      "canvas-text-editor"
    );

  const activeToolName =
    document.getElementById(
      "active-tool-name"
    );

  const brushSizeInput =
    document.getElementById(
      "brush-size"
    );

  const brushSizeOutput =
    document.getElementById(
      "brush-size-output"
    );

  const toolOpacityInput =
    document.getElementById(
      "tool-opacity"
    );

  const toolOpacityOutput =
    document.getElementById(
      "tool-opacity-output"
    );

  const brushHardnessInput =
    document.getElementById(
      "brush-hardness"
    );

  const brushHardnessOutput =
    document.getElementById(
      "brush-hardness-output"
    );

  const primaryColourInput =
    document.getElementById(
      "primary-colour"
    );

  const panelColourPicker =
    document.getElementById(
      "panel-colour-picker"
    );

  const hexColourInput =
    document.getElementById(
      "hex-colour-input"
    );

  const primaryColourChip =
    document.getElementById(
      "primary-colour-chip"
    );

  const secondaryColourChip =
    document.getElementById(
      "secondary-colour-chip"
    );

  const swapColoursButton =
    document.getElementById(
      "swap-colours-button"
    );

  const recentColours =
    document.getElementById(
      "recent-colours"
    );


  const overlayContext =
    overlayCanvas?.getContext(
      "2d"
    );


  /* =======================================================
     2. TOOL DEFINITIONS
  ======================================================= */

  const toolDefinitions = {

    brush: {
      name:
        "Brush",

      shortcut:
        "b",

      cursor:
        "crosshair"
    },

    eraser: {
      name:
        "Eraser",

      shortcut:
        "e",

      cursor:
        "crosshair"
    },

    move: {
      name:
        "Move",

      shortcut:
        "v",

      cursor:
        "move"
    },

    select: {
      name:
        "Select",

      shortcut:
        "m",

      cursor:
        "crosshair"
    },

    crop: {
      name:
        "Crop",

      shortcut:
        "c",

      cursor:
        "crosshair"
    },

    fill: {
      name:
        "Fill",

      shortcut:
        "g",

      cursor:
        "crosshair"
    },

    gradient: {
      name:
        "Gradient",

      shortcut:
        null,

      cursor:
        "crosshair"
    },

    eyedropper: {
      name:
        "Colour Picker",

      shortcut:
        "i",

      cursor:
        "crosshair"
    },

    text: {
      name:
        "Text",

      shortcut:
        "t",

      cursor:
        "text"
    },

    shape: {
      name:
        "Shape",

      shortcut:
        "u",

      cursor:
        "crosshair"
    }

  };


  /* =======================================================
     3. TOOL STATE
  ======================================================= */

  let activeTool =
    "brush";

  let primaryColour =
    "#a84cff";

  let secondaryColour =
    "#ffffff";

  let brushSize =
    20;

  let toolOpacity =
    1;

  let brushHardness =
    0.8;


  let pointerDown =
    false;

  let pointerId =
    null;

  let startPoint =
    null;

  let previousPoint =
    null;

  let currentPoint =
    null;

  let actionChangedCanvas =
    false;


  let movingLayerBackup =
    null;

  let moveStartPoint =
    null;


  let recentColourValues = [
    "#a84cff",
    "#35e7ff",
    "#ff5fb7",
    "#ffd75a",
    "#69f59c",
    "#ff596d",
    "#ffffff"
  ];


  /* =======================================================
     4. HELPERS
  ======================================================= */

  function clamp(
    value,
    minimum,
    maximum
  ) {

    return Math.min(
      maximum,
      Math.max(
        minimum,
        Number(value)
      )
    );

  }


  function normaliseHexColour(
    value
  ) {

    const colour =
      String(value || "")
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

    const hex =
      normaliseHexColour(
        hexColour
      );


    if (!hex) {

      return {
        red:
          0,

        green:
          0,

        blue:
          0
      };

    }


    return {
      red:
        parseInt(
          hex.slice(
            1,
            3
          ),
          16
        ),

      green:
        parseInt(
          hex.slice(
            3,
            5
          ),
          16
        ),

      blue:
        parseInt(
          hex.slice(
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

    const values =
      [
        red,
        green,
        blue
      ].map(
        (value) =>
          clamp(
            Math.round(value),
            0,
            255
          )
            .toString(16)
            .padStart(
              2,
              "0"
            )
      );


    return (
      "#" +
      values.join("")
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


  function getActiveLayer() {

    return (
      getLayersApi()
        ?.getActiveLayer() ||
      null
    );

  }


  function getCanvasPoint(
    event
  ) {

    const canvasApi =
      getCanvasApi();


    if (!canvasApi) {

      return {
        x:
          0,

        y:
          0,

        inside:
          false
      };

    }


    return canvasApi.clientToCanvas(
      event.clientX,
      event.clientY
    );

  }


  function dispatchToolEvent(
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


  function requestHistorySave(
    reason
  ) {

    dispatchToolEvent(
      "paintless:history-requested",
      {
        reason
      }
    );

  }


  function rerenderLayers() {

    getLayersApi()
      ?.renderLayers();

  }


  function clearOverlay() {

    if (
      !overlayCanvas ||
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


    overlayContext.clearRect(
      0,
      0,
      overlayCanvas.width,
      overlayCanvas.height
    );

  }


  function canEditActiveLayer() {

    const layer =
      getActiveLayer();


    if (!layer) {
      return false;
    }


    if (layer.locked) {

      dispatchToolEvent(
        "paintless:status-message",
        {
          message:
            "That layer is locked."
        }
      );

      return false;

    }


    return true;

  }


  /* =======================================================
     5. COLOUR MANAGEMENT
  ======================================================= */

  function addRecentColour(
    colour
  ) {

    const normalised =
      normaliseHexColour(
        colour
      );


    if (!normalised) {
      return;
    }


    recentColourValues =
      recentColourValues.filter(
        (existingColour) =>
          existingColour !==
          normalised
      );


    recentColourValues.unshift(
      normalised
    );


    recentColourValues =
      recentColourValues.slice(
        0,
        14
      );


    renderRecentColours();

  }


  function setPrimaryColour(
    colour,
    {
      remember = true
    } = {}
  ) {

    const normalised =
      normaliseHexColour(
        colour
      );


    if (!normalised) {
      return false;
    }


    primaryColour =
      normalised;


    if (primaryColourInput) {

      primaryColourInput.value =
        primaryColour;

    }


    if (panelColourPicker) {

      panelColourPicker.value =
        primaryColour;

    }


    if (hexColourInput) {

      hexColourInput.value =
        primaryColour.toUpperCase();

    }


    if (primaryColourChip) {

      primaryColourChip.style.background =
        primaryColour;

    }


    if (remember) {

      addRecentColour(
        primaryColour
      );

    }


    dispatchToolEvent(
      "paintless:primary-colour-changed",
      {
        colour:
          primaryColour
      }
    );


    return true;

  }


  function setSecondaryColour(
    colour,
    {
      remember = true
    } = {}
  ) {

    const normalised =
      normaliseHexColour(
        colour
      );


    if (!normalised) {
      return false;
    }


    secondaryColour =
      normalised;


    if (secondaryColourChip) {

      secondaryColourChip.style.background =
        secondaryColour;

    }


    if (remember) {

      addRecentColour(
        secondaryColour
      );

    }


    dispatchToolEvent(
      "paintless:secondary-colour-changed",
      {
        colour:
          secondaryColour
      }
    );


    return true;

  }


  function swapColours() {

    const oldPrimary =
      primaryColour;


    primaryColour =
      secondaryColour;

    secondaryColour =
      oldPrimary;


    setPrimaryColour(
      primaryColour,
      {
        remember:
          false
      }
    );


    setSecondaryColour(
      secondaryColour,
      {
        remember:
          false
      }
    );

  }


  function renderRecentColours() {

    if (!recentColours) {
      return;
    }


    recentColours.innerHTML =
      "";


    recentColourValues.forEach(
      (colour) => {

        const button =
          document.createElement(
            "button"
          );


        button.type =
          "button";

        button.className =
          "recent-colour";

        button.style.background =
          colour;

        button.title =
          colour.toUpperCase();

        button.setAttribute(
          "aria-label",
          `Use colour ${colour}`
        );


        button.addEventListener(
          "click",
          () => {

            setPrimaryColour(
              colour
            );

          }
        );


        recentColours.appendChild(
          button
        );

      }
    );

  }


  /* =======================================================
     6. TOOL SELECTION
  ======================================================= */

  function setActiveTool(
    toolName
  ) {

    if (
      !toolDefinitions[
        toolName
      ]
    ) {
      return false;
    }


    finishTextEditing(
      false
    );


    activeTool =
      toolName;


    document
      .querySelectorAll(
        ".tool-button[data-tool]"
      )
      .forEach(
        (button) => {

          const selected =
            button.dataset.tool ===
            activeTool;


          button.classList.toggle(
            "is-active",
            selected
          );


          button.setAttribute(
            "aria-pressed",
            String(selected)
          );

        }
      );


    const definition =
      toolDefinitions[
        activeTool
      ];


    if (activeToolName) {

      activeToolName.textContent =
        definition.name;

    }


    getCanvasApi()
      ?.setCanvasCursor(
        definition.cursor
      );


    clearOverlay();


    dispatchToolEvent(
      "paintless:tool-changed",
      {
        tool:
          activeTool,

        definition
      }
    );


    return true;

  }


  /* =======================================================
     7. BRUSH ENGINE
  ======================================================= */

  function stampBrushPoint(
    layerContext,
    x,
    y,
    size,
    colour,
    opacity,
    hardness,
    erase = false
  ) {

    const radius =
      Math.max(
        0.5,
        size / 2
      );


    layerContext.save();


    layerContext.globalAlpha =
      opacity;


    layerContext.globalCompositeOperation =
      erase
        ? "destination-out"
        : "source-over";


    if (
      erase ||
      hardness >= 0.98
    ) {

      layerContext.fillStyle =
        colour;

      layerContext.beginPath();

      layerContext.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
      );

      layerContext.fill();

    } else {

      const colourValues =
        hexToRgb(
          colour
        );


      const solidRadius =
        radius *
        hardness;


      const gradient =
        layerContext.createRadialGradient(
          x,
          y,
          solidRadius,
          x,
          y,
          radius
        );


      if (erase) {

        gradient.addColorStop(
          0,
          "rgba(0,0,0,1)"
        );

        gradient.addColorStop(
          1,
          "rgba(0,0,0,0)"
        );

      } else {

        gradient.addColorStop(
          0,
          `rgba(${colourValues.red},${colourValues.green},${colourValues.blue},1)`
        );

        gradient.addColorStop(
          1,
          `rgba(${colourValues.red},${colourValues.green},${colourValues.blue},0)`
        );

      }


      layerContext.fillStyle =
        gradient;

      layerContext.beginPath();

      layerContext.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
      );

      layerContext.fill();

    }


    layerContext.restore();

  }


  function drawBrushSegment(
    layer,
    fromPoint,
    toPoint,
    erase = false
  ) {

    const distance =
      Math.hypot(
        toPoint.x -
          fromPoint.x,

        toPoint.y -
          fromPoint.y
      );


    const spacing =
      Math.max(
        1,
        brushSize *
          0.12
      );


    const stepCount =
      Math.max(
        1,
        Math.ceil(
          distance /
          spacing
        )
      );


    for (
      let step = 0;
      step <= stepCount;
      step += 1
    ) {

      const progress =
        step /
        stepCount;


      const x =
        fromPoint.x +
        (
          toPoint.x -
          fromPoint.x
        ) *
        progress;


      const y =
        fromPoint.y +
        (
          toPoint.y -
          fromPoint.y
        ) *
        progress;


      stampBrushPoint(
        layer.context,
        x,
        y,
        brushSize,
        primaryColour,
        toolOpacity,
        brushHardness,
        erase
      );

    }


    actionChangedCanvas =
      true;


    rerenderLayers();

  }


  /* =======================================================
     8. EYEDROPPER
  ======================================================= */

  function pickColourAtPoint(
    point
  ) {

    if (!editorCanvas) {
      return;
    }


    const context =
      editorCanvas.getContext(
        "2d",
        {
          willReadFrequently:
            true
        }
      );


    const x =
      clamp(
        Math.floor(
          point.x
        ),
        0,
        editorCanvas.width - 1
      );


    const y =
      clamp(
        Math.floor(
          point.y
        ),
        0,
        editorCanvas.height - 1
      );


    const pixel =
      context.getImageData(
        x,
        y,
        1,
        1
      ).data;


    if (
      pixel[3] === 0
    ) {

      dispatchToolEvent(
        "paintless:status-message",
        {
          message:
            "That pixel is transparent."
        }
      );

      return;

    }


    setPrimaryColour(
      rgbToHex(
        pixel[0],
        pixel[1],
        pixel[2]
      )
    );

  }


  /* =======================================================
     9. FLOOD FILL
  ======================================================= */

  function coloursWithinTolerance(
    first,
    second,
    tolerance
  ) {

    return (
      Math.abs(
        first[0] -
        second[0]
      ) <= tolerance &&
      Math.abs(
        first[1] -
        second[1]
      ) <= tolerance &&
      Math.abs(
        first[2] -
        second[2]
      ) <= tolerance &&
      Math.abs(
        first[3] -
        second[3]
      ) <= tolerance
    );

  }


  function floodFillLayer(
    layer,
    point
  ) {

    const width =
      layer.canvas.width;

    const height =
      layer.canvas.height;


    const startX =
      clamp(
        Math.floor(
          point.x
        ),
        0,
        width - 1
      );


    const startY =
      clamp(
        Math.floor(
          point.y
        ),
        0,
        height - 1
      );


    const imageData =
      layer.context.getImageData(
        0,
        0,
        width,
        height
      );


    const pixels =
      imageData.data;


    const startIndex =
      (
        startY *
        width +
        startX
      ) *
      4;


    const targetColour =
      [
        pixels[
          startIndex
        ],
        pixels[
          startIndex + 1
        ],
        pixels[
          startIndex + 2
        ],
        pixels[
          startIndex + 3
        ]
      ];


    const fillRgb =
      hexToRgb(
        primaryColour
      );


    const fillColour =
      [
        fillRgb.red,
        fillRgb.green,
        fillRgb.blue,
        Math.round(
          toolOpacity *
          255
        )
      ];


    if (
      coloursWithinTolerance(
        targetColour,
        fillColour,
        0
      )
    ) {
      return false;
    }


    const tolerance =
      24;


    const visited =
      new Uint8Array(
        width *
        height
      );


    const stack =
      [
        startX,
        startY
      ];


    let changed =
      false;


    while (
      stack.length > 0
    ) {

      const y =
        stack.pop();

      const x =
        stack.pop();


      if (
        x < 0 ||
        y < 0 ||
        x >= width ||
        y >= height
      ) {
        continue;
      }


      const pixelNumber =
        y *
        width +
        x;


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


      const index =
        pixelNumber *
        4;


      const currentColour =
        [
          pixels[
            index
          ],
          pixels[
            index + 1
          ],
          pixels[
            index + 2
          ],
          pixels[
            index + 3
          ]
        ];


      if (
        !coloursWithinTolerance(
          currentColour,
          targetColour,
          tolerance
        )
      ) {
        continue;
      }


      pixels[
        index
      ] =
        fillColour[0];

      pixels[
        index + 1
      ] =
        fillColour[1];

      pixels[
        index + 2
      ] =
        fillColour[2];

      pixels[
        index + 3
      ] =
        fillColour[3];


      changed =
        true;


      stack.push(
        x + 1,
        y,

        x - 1,
        y,

        x,
        y + 1,

        x,
        y - 1
      );

    }


    if (!changed) {
      return false;
    }


    layer.context.putImageData(
      imageData,
      0,
      0
    );


    rerenderLayers();


    return true;

  }


  /* =======================================================
     10. GRADIENT TOOL
  ======================================================= */

  function drawGradientPreview(
    fromPoint,
    toPoint
  ) {

    if (!overlayContext) {
      return;
    }


    clearOverlay();


    overlayContext.save();


    overlayContext.strokeStyle =
      "#ffffff";

    overlayContext.lineWidth =
      1;

    overlayContext.setLineDash(
      [
        8,
        6
      ]
    );


    overlayContext.beginPath();

    overlayContext.moveTo(
      fromPoint.x,
      fromPoint.y
    );

    overlayContext.lineTo(
      toPoint.x,
      toPoint.y
    );

    overlayContext.stroke();


    overlayContext.setLineDash(
      []
    );


    overlayContext.fillStyle =
      primaryColour;

    overlayContext.beginPath();

    overlayContext.arc(
      fromPoint.x,
      fromPoint.y,
      5,
      0,
      Math.PI * 2
    );

    overlayContext.fill();


    overlayContext.fillStyle =
      secondaryColour;

    overlayContext.beginPath();

    overlayContext.arc(
      toPoint.x,
      toPoint.y,
      5,
      0,
      Math.PI * 2
    );

    overlayContext.fill();


    overlayContext.restore();

  }


  function applyGradient(
    layer,
    fromPoint,
    toPoint
  ) {

    const distance =
      Math.hypot(
        toPoint.x -
          fromPoint.x,

        toPoint.y -
          fromPoint.y
      );


    if (distance < 2) {
      return false;
    }


    const gradient =
      layer.context.createLinearGradient(
        fromPoint.x,
        fromPoint.y,
        toPoint.x,
        toPoint.y
      );


    const primaryRgb =
      hexToRgb(
        primaryColour
      );

    const secondaryRgb =
      hexToRgb(
        secondaryColour
      );


    gradient.addColorStop(
      0,
      `rgba(${primaryRgb.red},${primaryRgb.green},${primaryRgb.blue},${toolOpacity})`
    );


    gradient.addColorStop(
      1,
      `rgba(${secondaryRgb.red},${secondaryRgb.green},${secondaryRgb.blue},${toolOpacity})`
    );


    layer.context.save();


    layer.context.globalCompositeOperation =
      "source-over";


    layer.context.fillStyle =
      gradient;


    layer.context.fillRect(
      0,
      0,
      layer.canvas.width,
      layer.canvas.height
    );


    layer.context.restore();


    rerenderLayers();


    return true;

  }


  /* =======================================================
     11. SHAPE TOOL
  ======================================================= */

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


  function drawShape(
    context,
    firstPoint,
    secondPoint,
    preview = false
  ) {

    const rectangle =
      getNormalisedRectangle(
        firstPoint,
        secondPoint
      );


    if (
      rectangle.width < 1 ||
      rectangle.height < 1
    ) {
      return false;
    }


    context.save();


    context.globalAlpha =
      preview
        ? 0.8
        : toolOpacity;


    context.strokeStyle =
      primaryColour;


    context.lineWidth =
      Math.max(
        1,
        brushSize
      );


    if (preview) {

      context.setLineDash(
        [
          8,
          5
        ]
      );

    }


    context.strokeRect(
      rectangle.x,
      rectangle.y,
      rectangle.width,
      rectangle.height
    );


    context.restore();


    return true;

  }


  function drawShapePreview(
    firstPoint,
    secondPoint
  ) {

    if (!overlayContext) {
      return;
    }


    clearOverlay();


    drawShape(
      overlayContext,
      firstPoint,
      secondPoint,
      true
    );

  }


  /* =======================================================
     12. SELECTION AND CROP GUIDES
  ======================================================= */

  function drawSelectionGuide(
    firstPoint,
    secondPoint,
    cropMode = false
  ) {

    if (!overlayContext) {
      return;
    }


    const rectangle =
      getNormalisedRectangle(
        firstPoint,
        secondPoint
      );


    clearOverlay();


    overlayContext.save();


    if (cropMode) {

      overlayContext.fillStyle =
        "rgba(0,0,0,0.48)";


      overlayContext.fillRect(
        0,
        0,
        overlayCanvas.width,
        overlayCanvas.height
      );


      overlayContext.clearRect(
        rectangle.x,
        rectangle.y,
        rectangle.width,
        rectangle.height
      );

    }


    overlayContext.strokeStyle =
      cropMode
        ? "#ffd75a"
        : "#35e7ff";


    overlayContext.lineWidth =
      1;


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

  }


  /* =======================================================
     13. CROP
  ======================================================= */

  function commitCrop(
    firstPoint,
    secondPoint
  ) {

    const rectangle =
      getNormalisedRectangle(
        firstPoint,
        secondPoint
      );


    const cropX =
      Math.max(
        0,
        Math.floor(
          rectangle.x
        )
      );


    const cropY =
      Math.max(
        0,
        Math.floor(
          rectangle.y
        )
      );


    const cropWidth =
      Math.min(
        editorCanvas.width -
          cropX,

        Math.max(
          1,
          Math.round(
            rectangle.width
          )
        )
      );


    const cropHeight =
      Math.min(
        editorCanvas.height -
          cropY,

        Math.max(
          1,
          Math.round(
            rectangle.height
          )
        )
      );


    if (
      cropWidth < 2 ||
      cropHeight < 2
    ) {
      return false;
    }


    const layersApi =
      getLayersApi();


    if (!layersApi) {
      return false;
    }


    const croppedLayers =
      layersApi.layers.map(
        (layer) => {

          const cropCanvas =
            document.createElement(
              "canvas"
            );


          cropCanvas.width =
            cropWidth;

          cropCanvas.height =
            cropHeight;


          cropCanvas
            .getContext("2d")
            .drawImage(
              layer.canvas,
              cropX,
              cropY,
              cropWidth,
              cropHeight,
              0,
              0,
              cropWidth,
              cropHeight
            );


          return {
            layer,
            cropCanvas
          };

        }
      );


    layersApi.resizeDocument(
      cropWidth,
      cropHeight,
      {
        preserveContent:
          false
      }
    );


    croppedLayers.forEach(
      ({
        layer,
        cropCanvas
      }) => {

        layer.context.clearRect(
          0,
          0,
          cropWidth,
          cropHeight
        );


        layer.context.drawImage(
          cropCanvas,
          0,
          0
        );

      }
    );


    rerenderLayers();


    getCanvasApi()
      ?.fitCanvasToScreen();


    return true;

  }


  /* =======================================================
     14. MOVE LAYER TOOL
  ======================================================= */

  function beginMoveLayer(
    layer,
    point
  ) {

    movingLayerBackup =
      document.createElement(
        "canvas"
      );


    movingLayerBackup.width =
      layer.canvas.width;

    movingLayerBackup.height =
      layer.canvas.height;


    movingLayerBackup
      .getContext("2d")
      .drawImage(
        layer.canvas,
        0,
        0
      );


    moveStartPoint = {
      x:
        point.x,

      y:
        point.y
    };

  }


  function updateMoveLayer(
    layer,
    point
  ) {

    if (
      !movingLayerBackup ||
      !moveStartPoint
    ) {
      return;
    }


    const offsetX =
      Math.round(
        point.x -
        moveStartPoint.x
      );


    const offsetY =
      Math.round(
        point.y -
        moveStartPoint.y
      );


    layer.context.clearRect(
      0,
      0,
      layer.canvas.width,
      layer.canvas.height
    );


    layer.context.drawImage(
      movingLayerBackup,
      offsetX,
      offsetY
    );


    actionChangedCanvas =
      offsetX !== 0 ||
      offsetY !== 0;


    rerenderLayers();

  }


  function finishMoveLayer() {

    movingLayerBackup =
      null;

    moveStartPoint =
      null;

  }


  /* =======================================================
     15. TEXT TOOL
  ======================================================= */

  function beginTextEditing(
    point
  ) {

    if (!canvasTextEditor) {
      return;
    }


    const canvasApi =
      getCanvasApi();


    const clientPoint =
      canvasApi?.canvasToClient(
        point.x,
        point.y
      );


    canvasTextEditor.hidden =
      false;


    canvasTextEditor.value =
      "";


    canvasTextEditor.dataset.canvasX =
      String(
        point.x
      );


    canvasTextEditor.dataset.canvasY =
      String(
        point.y
      );


    if (clientPoint) {

      canvasTextEditor.style.position =
        "fixed";

      canvasTextEditor.style.left =
        `${clientPoint.x}px`;

      canvasTextEditor.style.top =
        `${clientPoint.y}px`;

    }


    canvasTextEditor.style.color =
      primaryColour;


    canvasTextEditor.style.fontSize =
      `${Math.max(
        12,
        brushSize * 1.5
      )}px`;


    requestAnimationFrame(
      () => {

        canvasTextEditor.focus();

      }
    );

  }


  function finishTextEditing(
    commit = true
  ) {

    if (
      !canvasTextEditor ||
      canvasTextEditor.hidden
    ) {
      return;
    }


    const text =
      canvasTextEditor.value;


    if (
      commit &&
      text.trim() &&
      canEditActiveLayer()
    ) {

      const layer =
        getActiveLayer();


      const x =
        Number(
          canvasTextEditor.dataset.canvasX ||
          0
        );


      const y =
        Number(
          canvasTextEditor.dataset.canvasY ||
          0
        );


      const fontSize =
        Math.max(
          12,
          brushSize * 1.5
        );


      layer.context.save();


      layer.context.globalAlpha =
        toolOpacity;


      layer.context.fillStyle =
        primaryColour;


      layer.context.font =
        `${fontSize}px "Segoe UI", sans-serif`;


      layer.context.textBaseline =
        "top";


      const lines =
        text.split(
          "\n"
        );


      lines.forEach(
        (line, index) => {

          layer.context.fillText(
            line,
            x,
            y +
              index *
              fontSize *
              1.2
          );

        }
      );


      layer.context.restore();


      rerenderLayers();


      requestHistorySave(
        "Add text"
      );

    }


    canvasTextEditor.hidden =
      true;

    canvasTextEditor.value =
      "";

  }


  /* =======================================================
     16. POINTER DOWN
  ======================================================= */

  function handlePointerDown(
    event
  ) {

    if (
      event.button !== 0 &&
      event.pointerType ===
        "mouse"
    ) {
      return;
    }


    const canvasApi =
      getCanvasApi();


    if (
      !canvasApi?.isDocumentOpen()
    ) {
      return;
    }


    const point =
      getCanvasPoint(
        event
      );


    if (!point.inside) {
      return;
    }


    if (
      activeTool ===
      "eyedropper"
    ) {

      pickColourAtPoint(
        point
      );

      return;

    }


    if (
      activeTool ===
      "text"
    ) {

      beginTextEditing(
        point
      );

      return;

    }


    if (
      !canEditActiveLayer() &&
      activeTool !==
        "select"
    ) {
      return;
    }


    pointerDown =
      true;

    pointerId =
      event.pointerId;

    startPoint = {
      x:
        point.x,

      y:
        point.y
    };

    previousPoint = {
      ...startPoint
    };

    currentPoint = {
      ...startPoint
    };

    actionChangedCanvas =
      false;


    editorCanvas.setPointerCapture?.(
      event.pointerId
    );


    const layer =
      getActiveLayer();


    if (
      activeTool ===
        "brush" ||
      activeTool ===
        "eraser"
    ) {

      drawBrushSegment(
        layer,
        startPoint,
        startPoint,
        activeTool ===
          "eraser"
      );

    }


    if (
      activeTool ===
      "fill"
    ) {

      actionChangedCanvas =
        floodFillLayer(
          layer,
          point
        );


      pointerDown =
        false;


      if (actionChangedCanvas) {

        requestHistorySave(
          "Fill area"
        );

      }

    }


    if (
      activeTool ===
      "move"
    ) {

      beginMoveLayer(
        layer,
        point
      );

    }


    event.preventDefault();

  }


  /* =======================================================
     17. POINTER MOVE
  ======================================================= */

  function handlePointerMove(
    event
  ) {

    if (
      !pointerDown ||
      event.pointerId !==
        pointerId
    ) {
      return;
    }


    const point =
      getCanvasPoint(
        event
      );


    currentPoint = {
      x:
        clamp(
          point.x,
          0,
          editorCanvas.width
        ),

      y:
        clamp(
          point.y,
          0,
          editorCanvas.height
        )
    };


    const layer =
      getActiveLayer();


    if (
      activeTool ===
        "brush" ||
      activeTool ===
        "eraser"
    ) {

      drawBrushSegment(
        layer,
        previousPoint,
        currentPoint,
        activeTool ===
          "eraser"
      );

    }


    if (
      activeTool ===
      "gradient"
    ) {

      drawGradientPreview(
        startPoint,
        currentPoint
      );

    }


    if (
      activeTool ===
      "shape"
    ) {

      drawShapePreview(
        startPoint,
        currentPoint
      );

    }


    if (
      activeTool ===
      "select"
    ) {

      drawSelectionGuide(
        startPoint,
        currentPoint,
        false
      );

    }


    if (
      activeTool ===
      "crop"
    ) {

      drawSelectionGuide(
        startPoint,
        currentPoint,
        true
      );

    }


    if (
      activeTool ===
      "move"
    ) {

      updateMoveLayer(
        layer,
        currentPoint
      );

    }


    previousPoint = {
      ...currentPoint
    };


    event.preventDefault();

  }


  /* =======================================================
     18. POINTER UP
  ======================================================= */

  function handlePointerUp(
    event
  ) {

    if (
      !pointerDown ||
      event.pointerId !==
        pointerId
    ) {
      return;
    }


    const layer =
      getActiveLayer();


    if (
      activeTool ===
      "gradient"
    ) {

      actionChangedCanvas =
        applyGradient(
          layer,
          startPoint,
          currentPoint ||
            startPoint
        );

    }


    if (
      activeTool ===
      "shape"
    ) {

      actionChangedCanvas =
        drawShape(
          layer.context,
          startPoint,
          currentPoint ||
            startPoint,
          false
        );


      if (actionChangedCanvas) {

        rerenderLayers();

      }

    }


    if (
      activeTool ===
      "crop"
    ) {

      actionChangedCanvas =
        commitCrop(
          startPoint,
          currentPoint ||
            startPoint
        );

    }


    if (
      activeTool ===
      "move"
    ) {

      finishMoveLayer();

    }


    clearOverlay();


    if (actionChangedCanvas) {

      const reasonByTool = {

        brush:
          "Brush stroke",

        eraser:
          "Erase",

        gradient:
          "Apply gradient",

        shape:
          "Draw shape",

        crop:
          "Crop image",

        move:
          "Move layer"

      };


      requestHistorySave(
        reasonByTool[
          activeTool
        ] ||
        "Edit image"
      );

    }


    editorCanvas.releasePointerCapture?.(
      event.pointerId
    );


    pointerDown =
      false;

    pointerId =
      null;

    startPoint =
      null;

    previousPoint =
      null;

    currentPoint =
      null;

    actionChangedCanvas =
      false;


    event.preventDefault();

  }


  function cancelPointerAction() {

    if (
      activeTool ===
      "move" &&
      movingLayerBackup
    ) {

      const layer =
        getActiveLayer();


      if (layer) {

        layer.context.clearRect(
          0,
          0,
          layer.canvas.width,
          layer.canvas.height
        );


        layer.context.drawImage(
          movingLayerBackup,
          0,
          0
        );


        rerenderLayers();

      }

    }


    finishMoveLayer();

    clearOverlay();


    pointerDown =
      false;

    pointerId =
      null;

    startPoint =
      null;

    previousPoint =
      null;

    currentPoint =
      null;

    actionChangedCanvas =
      false;

  }


  /* =======================================================
     19. OPTIONS UI
  ======================================================= */

  function updateBrushSize(
    value
  ) {

    brushSize =
      clamp(
        value,
        1,
        200
      );


    if (brushSizeInput) {

      brushSizeInput.value =
        String(
          brushSize
        );

    }


    if (brushSizeOutput) {

      brushSizeOutput.textContent =
        `${Math.round(
          brushSize
        )} px`;

    }

  }


  function updateToolOpacity(
    value
  ) {

    const percentage =
      clamp(
        value,
        1,
        100
      );


    toolOpacity =
      percentage /
      100;


    if (toolOpacityInput) {

      toolOpacityInput.value =
        String(
          percentage
        );

    }


    if (toolOpacityOutput) {

      toolOpacityOutput.textContent =
        `${Math.round(
          percentage
        )}%`;

    }

  }


  function updateBrushHardness(
    value
  ) {

    const percentage =
      clamp(
        value,
        0,
        100
      );


    brushHardness =
      percentage /
      100;


    if (brushHardnessInput) {

      brushHardnessInput.value =
        String(
          percentage
        );

    }


    if (brushHardnessOutput) {

      brushHardnessOutput.textContent =
        `${Math.round(
          percentage
        )}%`;

    }

  }


  /* =======================================================
     20. EVENT LISTENERS
  ======================================================= */

  document
    .querySelectorAll(
      ".tool-button[data-tool]"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            setActiveTool(
              button.dataset.tool
            );

          }
        );

      }
    );


  editorCanvas?.addEventListener(
    "pointerdown",
    handlePointerDown
  );


  editorCanvas?.addEventListener(
    "pointermove",
    handlePointerMove
  );


  editorCanvas?.addEventListener(
    "pointerup",
    handlePointerUp
  );


  editorCanvas?.addEventListener(
    "pointercancel",
    cancelPointerAction
  );


  editorCanvas?.addEventListener(
    "contextmenu",
    (event) => {

      event.preventDefault();

    }
  );


  brushSizeInput?.addEventListener(
    "input",
    () => {

      updateBrushSize(
        brushSizeInput.value
      );

    }
  );


  toolOpacityInput?.addEventListener(
    "input",
    () => {

      updateToolOpacity(
        toolOpacityInput.value
      );

    }
  );


  brushHardnessInput?.addEventListener(
    "input",
    () => {

      updateBrushHardness(
        brushHardnessInput.value
      );

    }
  );


  primaryColourInput?.addEventListener(
    "input",
    () => {

      setPrimaryColour(
        primaryColourInput.value
      );

    }
  );


  panelColourPicker?.addEventListener(
    "input",
    () => {

      setPrimaryColour(
        panelColourPicker.value
      );

    }
  );


  hexColourInput?.addEventListener(
    "change",
    () => {

      const accepted =
        setPrimaryColour(
          hexColourInput.value
        );


      if (!accepted) {

        hexColourInput.value =
          primaryColour.toUpperCase();

      }

    }
  );


  primaryColourChip?.addEventListener(
    "click",
    () => {

      primaryColourInput?.click();

    }
  );


  secondaryColourChip?.addEventListener(
    "click",
    () => {

      const colour =
        window.prompt(
          "Secondary colour:",
          secondaryColour
        );


      if (colour !== null) {

        setSecondaryColour(
          colour
        );

      }

    }
  );


  swapColoursButton?.addEventListener(
    "click",
    swapColours
  );


  canvasTextEditor?.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key ===
          "Escape"
      ) {

        event.preventDefault();

        finishTextEditing(
          false
        );

      }


      if (
        event.key ===
          "Enter" &&
        (
          event.ctrlKey ||
          event.metaKey
        )
      ) {

        event.preventDefault();

        finishTextEditing(
          true
        );

      }

    }
  );


  canvasTextEditor?.addEventListener(
    "blur",
    () => {

      finishTextEditing(
        true
      );

    }
  );


  window.addEventListener(
    "keydown",
    (event) => {

      const activeElement =
        document.activeElement;


      const typing =
        activeElement &&
        (
          activeElement.tagName ===
            "INPUT" ||
          activeElement.tagName ===
            "TEXTAREA" ||
          activeElement.tagName ===
            "SELECT"
        );


      if (typing) {
        return;
      }


      if (
        event.key ===
        "Escape"
      ) {

        cancelPointerAction();

        finishTextEditing(
          false
        );

        return;

      }


      const pressedKey =
        event.key.toLowerCase();


      const matchingTool =
        Object.entries(
          toolDefinitions
        ).find(
          (
            [
              ,
              definition
            ]
          ) =>
            definition.shortcut ===
            pressedKey
        );


      if (matchingTool) {

        event.preventDefault();

        setActiveTool(
          matchingTool[0]
        );

      }


      if (
        pressedKey === "x"
      ) {

        event.preventDefault();

        swapColours();

      }


      if (
        event.key === "["
      ) {

        event.preventDefault();

        updateBrushSize(
          brushSize - 2
        );

      }


      if (
        event.key === "]"
      ) {

        event.preventDefault();

        updateBrushSize(
          brushSize + 2
        );

      }

    }
  );


  /* =======================================================
     21. PUBLIC API
  ======================================================= */

  window.PaintlessTools = {

    setActiveTool,

    getActiveTool() {

      return activeTool;

    },

    setPrimaryColour,

    setSecondaryColour,

    swapColours,

    getPrimaryColour() {

      return primaryColour;

    },

    getSecondaryColour() {

      return secondaryColour;

    },

    setBrushSize:
      updateBrushSize,

    getBrushSize() {

      return brushSize;

    },

    setToolOpacity:
      updateToolOpacity,

    getToolOpacity() {

      return toolOpacity;

    },

    setBrushHardness:
      updateBrushHardness,

    getBrushHardness() {

      return brushHardness;

    },

    finishTextEditing,

    cancelPointerAction

  };


  /* =======================================================
     22. INITIAL STATE
  ======================================================= */

  setPrimaryColour(
    primaryColour,
    {
      remember:
        false
    }
  );


  setSecondaryColour(
    secondaryColour,
    {
      remember:
        false
    }
  );


  renderRecentColours();


  updateBrushSize(
    brushSize
  );


  updateToolOpacity(
    toolOpacity *
    100
  );


  updateBrushHardness(
    brushHardness *
    100
  );


  setActiveTool(
    activeTool
  );


  console.log(
    "%cPaintless tools ready.",
    [
      "color:#ff5fb7",
      "font-weight:bold",
      "font-size:13px"
    ].join(";")
  );

})();
