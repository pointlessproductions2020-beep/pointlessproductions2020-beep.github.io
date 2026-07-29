"use strict";

/* =========================================================
   PAINTLESS
   DRAWING AND TOOLS SYSTEM — v0.3
========================================================= */

(() => {

  /* =======================================================
     1. DOM REFERENCES
  ======================================================= */

  const byId =
    (id) =>
      document.getElementById(
        id
      );


  const editorCanvas =
    byId(
      "editor-canvas"
    );

  const overlayCanvas =
    byId(
      "overlay-canvas"
    );

  const canvasTextEditor =
    byId(
      "canvas-text-editor"
    );

  const activeToolName =
    byId(
      "active-tool-name"
    );


  const brushSizeInput =
    byId(
      "brush-size"
    );

  const brushSizeOutput =
    byId(
      "brush-size-output"
    );

  const toolOpacityInput =
    byId(
      "tool-opacity"
    );

  const toolOpacityOutput =
    byId(
      "tool-opacity-output"
    );

  const brushHardnessInput =
    byId(
      "brush-hardness"
    );

  const brushHardnessOutput =
    byId(
      "brush-hardness-output"
    );


  const primaryColourInput =
    byId(
      "primary-colour"
    );

  const panelColourPicker =
    byId(
      "panel-colour-picker"
    );

  const hexColourInput =
    byId(
      "hex-colour-input"
    );

  const primaryColourChip =
    byId(
      "primary-colour-chip"
    );

  const secondaryColourChip =
    byId(
      "secondary-colour-chip"
    );

  const swapColoursButton =
    byId(
      "swap-colours-button"
    );

  const recentColours =
    byId(
      "recent-colours"
    );


  const brushOptions =
    byId(
      "brush-options"
    );

  const opacityOptions =
    byId(
      "opacity-options"
    );

  const hardnessOptions =
    byId(
      "hardness-options"
    );

  const shapeOptions =
    byId(
      "shape-options"
    );

  const selectionOptions =
    byId(
      "selection-options"
    );

  const textOptions =
    byId(
      "text-options"
    );


  const shapeTypeInput =
    byId(
      "shape-type"
    );

  const shapeFillEnabledInput =
    byId(
      "shape-fill-enabled"
    );

  const shapeStrokeEnabledInput =
    byId(
      "shape-stroke-enabled"
    );

  const shapeCornerRadiusInput =
    byId(
      "shape-corner-radius"
    );

  const shapeCornerRadiusOutput =
    byId(
      "shape-corner-radius-output"
    );


  const textFontFamilyInput =
    byId(
      "text-font-family"
    );

  const textFontSizeInput =
    byId(
      "text-font-size"
    );

  const textBoldInput =
    byId(
      "text-bold"
    );

  const textItalicInput =
    byId(
      "text-italic"
    );


  const overlayContext =
    overlayCanvas?.getContext(
      "2d"
    );


  if (
    !editorCanvas ||
    !overlayCanvas ||
    !overlayContext
  ) {

    console.error(
      "Paintless tools could not start because the canvas is missing."
    );

    return;

  }


  /* =======================================================
     2. TOOL DEFINITIONS AND STATE
  ======================================================= */

  const toolDefinitions = {

    brush: {
      name:
        "Brush",

      shortcut:
        "b",

      cursor:
        "none"
    },

    eraser: {
      name:
        "Eraser",

      shortcut:
        "e",

      cursor:
        "none"
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


  let selectedShape =
    shapeTypeInput?.value ||
    "ellipse";


  let shapeFillEnabled =
    Boolean(
      shapeFillEnabledInput?.checked
    );


  let shapeStrokeEnabled =
    shapeStrokeEnabledInput
      ? Boolean(
          shapeStrokeEnabledInput.checked
        )
      : true;


  let shapeCornerRadius =
    Number(
      shapeCornerRadiusInput?.value ||
      24
    );


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
     3. SHARED HELPERS
  ======================================================= */

  const clamp =
    (
      value,
      minimum,
      maximum
    ) =>
      Math.min(
        maximum,
        Math.max(
          minimum,
          Number(value)
        )
      );


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

    const hex =
      normaliseHexColour(
        hexColour
      ) ||
      "#000000";


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

    const part =
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
      part(red) +
      part(green) +
      part(blue)
    );

  }


  const getLayersApi =
    () =>
      window.PaintlessLayers ||
      null;


  const getCanvasApi =
    () =>
      window.PaintlessCanvas ||
      null;


  const getActiveLayer =
    () =>
      getLayersApi()
        ?.getActiveLayer() ||
      null;


  function getCanvasPoint(
    event
  ) {

    return (
      getCanvasApi()
        ?.clientToCanvas(
          event.clientX,
          event.clientY
        ) ||
      {
        x:
          0,

        y:
          0,

        inside:
          false
      }
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


    if (!layer.locked) {

      return true;

    }


    dispatchToolEvent(
      "paintless:status-message",
      {
        message:
          "That layer is locked."
      }
    );


    return false;

  }


  /* =======================================================
     4. TOOL OPTIONS VISIBILITY
  ======================================================= */

  function updateToolOptionVisibility() {

    if (brushOptions) {

      brushOptions.hidden =
        ![
          "brush",
          "eraser",
          "shape"
        ].includes(
          activeTool
        );

    }


    if (opacityOptions) {

      opacityOptions.hidden =
        ![
          "brush",
          "eraser",
          "fill",
          "gradient",
          "shape",
          "text"
        ].includes(
          activeTool
        );

    }


    if (hardnessOptions) {

      hardnessOptions.hidden =
        ![
          "brush",
          "eraser"
        ].includes(
          activeTool
        );

    }


    if (shapeOptions) {

      shapeOptions.hidden =
        activeTool !==
        "shape";

    }


    if (selectionOptions) {

      selectionOptions.hidden =
        activeTool !==
        "select";

    }


    if (textOptions) {

      textOptions.hidden =
        activeTool !==
        "text";

    }

  }


  /* =======================================================
     5. BRUSH CURSOR PREVIEW
  ======================================================= */

  const brushCursorPreview =
    document.createElement(
      "div"
    );


  brushCursorPreview.className =
    "brush-cursor-preview";


  const brushCursorHardness =
    document.createElement(
      "span"
    );


  brushCursorHardness.className =
    "brush-cursor-preview__hardness";


  brushCursorPreview.appendChild(
    brushCursorHardness
  );


  document.body.appendChild(
    brushCursorPreview
  );


  function updateBrushCursorAppearance() {

    const zoom =
      Math.max(
        0.01,
        Number(
          getCanvasApi()
            ?.getZoom?.() ||
          1
        )
      );


    const diameter =
      Math.max(
        2,
        brushSize *
          zoom
      );


    const innerDiameter =
      Math.max(
        2,
        diameter *
          brushHardness
      );


    brushCursorPreview.style.width =
      `${diameter}px`;

    brushCursorPreview.style.height =
      `${diameter}px`;

    brushCursorHardness.style.width =
      `${innerDiameter}px`;

    brushCursorHardness.style.height =
      `${innerDiameter}px`;


    brushCursorPreview.classList.toggle(
      "is-eraser",
      activeTool ===
        "eraser"
    );

  }


  function updateBrushCursorPosition(
    event
  ) {

    const point =
      getCanvasPoint(
        event
      );


    const visible =
      [
        "brush",
        "eraser"
      ].includes(
        activeTool
      ) &&
      point.inside;


    brushCursorPreview.classList.toggle(
      "is-visible",
      visible
    );


    if (!visible) {

      return;

    }


    brushCursorPreview.style.left =
      `${event.clientX}px`;

    brushCursorPreview.style.top =
      `${event.clientY}px`;


    updateBrushCursorAppearance();

  }


  function hideBrushCursorPreview() {

    brushCursorPreview.classList.remove(
      "is-visible"
    );

  }


  /* =======================================================
     6. COLOUR MANAGEMENT
  ======================================================= */

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
          () =>
            setPrimaryColour(
              colour
            )
        );


        recentColours.appendChild(
          button
        );

      }
    );

  }


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


  /* =======================================================
     7. TOOL SELECTION
  ======================================================= */

  function setActiveTool(
    toolName
  ) {

    const definition =
      toolDefinitions[
        toolName
      ];


    if (!definition) {

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
            String(
              selected
            )
          );

        }
      );


    if (activeToolName) {

      activeToolName.textContent =
        definition.name;

    }


    getCanvasApi()
      ?.setCanvasCursor(
        definition.cursor
      );


    clearOverlay();

    updateToolOptionVisibility();

    updateBrushCursorAppearance();


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
     8. BRUSH ENGINE
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

      layerContext.restore();

      return;

    }


    const rgb =
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


    gradient.addColorStop(
      0,
      `rgba(${rgb.red},${rgb.green},${rgb.blue},1)`
    );


    gradient.addColorStop(
      1,
      `rgba(${rgb.red},${rgb.green},${rgb.blue},0)`
    );


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

    layerContext.restore();

  }


  function drawBrushSegment(
    layer,
    fromPoint,
    toPoint,
    erase = false
  ) {

    if (!layer) {

      return;

    }


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
     9. EYEDROPPER
  ======================================================= */

  function pickColourAtPoint(
    point
  ) {

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
     10. FLOOD FILL
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

    if (!layer) {

      return false;

    }


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


    const targetColour = [
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


    const fillColour = [
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


    const stack = [
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


      const currentColour = [
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
     11. GRADIENT TOOL
  ======================================================= */

  function drawGradientPreview(
    fromPoint,
    toPoint
  ) {

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

    if (!layer) {

      return false;

    }


    const distance =
      Math.hypot(
        toPoint.x -
          fromPoint.x,

        toPoint.y -
          fromPoint.y
      );


    if (
      distance < 2
    ) {

      return false;

    }


    const gradient =
      layer.context.createLinearGradient(
        fromPoint.x,
        fromPoint.y,
        toPoint.x,
        toPoint.y
      );


    const first =
      hexToRgb(
        primaryColour
      );


    const second =
      hexToRgb(
        secondaryColour
      );


    gradient.addColorStop(
      0,
      `rgba(${first.red},${first.green},${first.blue},${toolOpacity})`
    );


    gradient.addColorStop(
      1,
      `rgba(${second.red},${second.green},${second.blue},${toolOpacity})`
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
     12. SHAPE TOOL
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
        rectangle.width / 2,
        rectangle.height / 2
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


    const isLine =
      selectedShape ===
      "line";


    if (
      isLine
        ? Math.hypot(
            secondPoint.x -
              firstPoint.x,
            secondPoint.y -
              firstPoint.y
          ) < 1
        : rectangle.width < 1 ||
          rectangle.height < 1
    ) {

      return false;

    }


    context.save();


    context.globalAlpha =
      preview
        ? 0.82
        : toolOpacity;


    context.strokeStyle =
      primaryColour;

    context.fillStyle =
      secondaryColour;

    context.lineWidth =
      Math.max(
        1,
        brushSize
      );

    context.lineCap =
      "round";

    context.lineJoin =
      "round";


    if (preview) {

      context.setLineDash(
        [
          8,
          5
        ]
      );

    }


    context.beginPath();


    switch (
      selectedShape
    ) {

      case "ellipse":

        context.ellipse(
          rectangle.x +
            rectangle.width / 2,
          rectangle.y +
            rectangle.height / 2,
          rectangle.width / 2,
          rectangle.height / 2,
          0,
          0,
          Math.PI * 2
        );

        break;


      case "rounded-rectangle":

        createRoundedRectanglePath(
          context,
          rectangle,
          shapeCornerRadius
        );

        break;


      case "line":

        context.moveTo(
          firstPoint.x,
          firstPoint.y
        );

        context.lineTo(
          secondPoint.x,
          secondPoint.y
        );

        break;


      case "rectangle":
      default:

        context.rect(
          rectangle.x,
          rectangle.y,
          rectangle.width,
          rectangle.height
        );

        break;

    }


    if (
      !isLine &&
      shapeFillEnabled
    ) {

      context.fill();

    }


    if (
      isLine ||
      shapeStrokeEnabled ||
      !shapeFillEnabled
    ) {

      context.stroke();

    }


    context.restore();


    return true;

  }


  function drawShapePreview(
    firstPoint,
    secondPoint
  ) {

    clearOverlay();


    drawShape(
      overlayContext,
      firstPoint,
      secondPoint,
      true
    );

  }


  /* =======================================================
     13. SELECTION AND CROP GUIDES
  ======================================================= */

  function drawSelectionGuide(
    firstPoint,
    secondPoint,
    cropMode = false
  ) {

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
     14. CROP
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


    if (
      !layersApi?.layers ||
      typeof layersApi.resizeDocument !==
        "function"
    ) {

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
            .getContext(
              "2d"
            )
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
     15. MOVE LAYER TOOL
  ======================================================= */

  function beginMoveLayer(
    layer,
    point
  ) {

    if (!layer) {

      return;

    }


    movingLayerBackup =
      document.createElement(
        "canvas"
      );


    movingLayerBackup.width =
      layer.canvas.width;

    movingLayerBackup.height =
      layer.canvas.height;


    movingLayerBackup
      .getContext(
        "2d"
      )
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
      !layer ||
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
     16. TEXT TOOL
  ======================================================= */

  function getTextSettings() {

    return {

      fontFamily:
        textFontFamilyInput?.value ||
        "Segoe UI",

      fontSize:
        Math.max(
          6,
          Number(
            textFontSizeInput?.value ||
            brushSize * 1.5
          )
        ),

      fontWeight:
        textBoldInput?.checked
          ? "700"
          : "400",

      fontStyle:
        textItalicInput?.checked
          ? "italic"
          : "normal"

    };

  }


  function beginTextEditing(
    point
  ) {

    if (!canvasTextEditor) {

      return;

    }


    const clientPoint =
      getCanvasApi()
        ?.canvasToClient(
          point.x,
          point.y
        );


    const settings =
      getTextSettings();


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


    canvasTextEditor.style.position =
      "fixed";


    if (clientPoint) {

      canvasTextEditor.style.left =
        `${clientPoint.x}px`;

      canvasTextEditor.style.top =
        `${clientPoint.y}px`;

    }


    canvasTextEditor.style.color =
      primaryColour;

    canvasTextEditor.style.fontSize =
      `${settings.fontSize}px`;

    canvasTextEditor.style.fontFamily =
      settings.fontFamily;

    canvasTextEditor.style.fontWeight =
      settings.fontWeight;

    canvasTextEditor.style.fontStyle =
      settings.fontStyle;


    requestAnimationFrame(
      () =>
        canvasTextEditor.focus()
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


      const settings =
        getTextSettings();


      layer.context.save();

      layer.context.globalAlpha =
        toolOpacity;

      layer.context.fillStyle =
        primaryColour;

      layer.context.textBaseline =
        "top";


      layer.context.font =
        `${settings.fontStyle} ${settings.fontWeight} ${settings.fontSize}px "${settings.fontFamily}", sans-serif`;


      text
        .split(
          "\n"
        )
        .forEach(
          (
            line,
            index
          ) => {

            layer.context.fillText(
              line,
              x,
              y +
                index *
                settings.fontSize *
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
     17. POINTER ACTIONS
  ======================================================= */

  function handlePointerDown(
    event
  ) {

    if (
      event.pointerType ===
        "mouse" &&
      event.button !==
        0
    ) {

      return;

    }


    if (
      !getCanvasApi()
        ?.isDocumentOpen()
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

      finishTextEditing(
        true
      );


      beginTextEditing(
        point
      );


      event.preventDefault();


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
      [
        "brush",
        "eraser"
      ].includes(
        activeTool
      )
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

      pointerId =
        null;


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


  function handlePointerMove(
    event
  ) {

    updateBrushCursorPosition(
      event
    );


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


    switch (
      activeTool
    ) {

      case "brush":
      case "eraser":

        drawBrushSegment(
          layer,
          previousPoint,
          currentPoint,
          activeTool ===
            "eraser"
        );

        break;


      case "gradient":

        drawGradientPreview(
          startPoint,
          currentPoint
        );

        break;


      case "shape":

        drawShapePreview(
          startPoint,
          currentPoint
        );

        break;


      case "select":

        drawSelectionGuide(
          startPoint,
          currentPoint,
          false
        );

        break;


      case "crop":

        drawSelectionGuide(
          startPoint,
          currentPoint,
          true
        );

        break;


      case "move":

        updateMoveLayer(
          layer,
          currentPoint
        );

        break;


      default:

        break;

    }


    previousPoint = {
      ...currentPoint
    };


    event.preventDefault();

  }


  function resetPointerState() {

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


    const endPoint =
      currentPoint ||
      startPoint;


    if (
      activeTool ===
      "gradient"
    ) {

      actionChangedCanvas =
        applyGradient(
          layer,
          startPoint,
          endPoint
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
          endPoint,
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
          endPoint
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


    resetPointerState();


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

    resetPointerState();

  }


  /* =======================================================
     18. OPTION UPDATES
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


    updateBrushCursorAppearance();

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


    updateBrushCursorAppearance();

  }


  function updateShapeCornerRadius(
    value
  ) {

    shapeCornerRadius =
      clamp(
        value,
        0,
        100
      );


    if (shapeCornerRadiusInput) {

      shapeCornerRadiusInput.value =
        String(
          shapeCornerRadius
        );

    }


    if (shapeCornerRadiusOutput) {

      shapeCornerRadiusOutput.textContent =
        `${Math.round(
          shapeCornerRadius
        )} px`;

    }

  }


  /* =======================================================
     19. EVENT LISTENERS
  ======================================================= */

  document
    .querySelectorAll(
      ".tool-button[data-tool]"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () =>
            setActiveTool(
              button.dataset.tool
            )
        );

      }
    );


  editorCanvas.addEventListener(
    "pointerdown",
    handlePointerDown
  );


  editorCanvas.addEventListener(
    "pointermove",
    handlePointerMove
  );


  editorCanvas.addEventListener(
    "pointerenter",
    updateBrushCursorPosition
  );


  editorCanvas.addEventListener(
    "pointerleave",
    hideBrushCursorPreview
  );


  editorCanvas.addEventListener(
    "pointerup",
    handlePointerUp
  );


  editorCanvas.addEventListener(
    "pointercancel",
    cancelPointerAction
  );


  editorCanvas.addEventListener(
    "contextmenu",
    (event) =>
      event.preventDefault()
  );


  brushSizeInput?.addEventListener(
    "input",
    () =>
      updateBrushSize(
        brushSizeInput.value
      )
  );


  toolOpacityInput?.addEventListener(
    "input",
    () =>
      updateToolOpacity(
        toolOpacityInput.value
      )
  );


  brushHardnessInput?.addEventListener(
    "input",
    () =>
      updateBrushHardness(
        brushHardnessInput.value
      )
  );


  primaryColourInput?.addEventListener(
    "input",
    () =>
      setPrimaryColour(
        primaryColourInput.value
      )
  );


  panelColourPicker?.addEventListener(
    "input",
    () =>
      setPrimaryColour(
        panelColourPicker.value
      )
  );


  hexColourInput?.addEventListener(
    "change",
    () => {

      if (
        !setPrimaryColour(
          hexColourInput.value
        )
      ) {

        hexColourInput.value =
          primaryColour.toUpperCase();

      }

    }
  );


  primaryColourChip?.addEventListener(
    "click",
    () =>
      primaryColourInput?.click()
  );


  secondaryColourChip?.addEventListener(
    "click",
    () => {

      const colour =
        window.prompt(
          "Secondary colour:",
          secondaryColour
        );


      if (
        colour !==
        null
      ) {

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


  shapeTypeInput?.addEventListener(
    "change",
    () => {

      selectedShape =
        shapeTypeInput.value ||
        "ellipse";


      dispatchToolEvent(
        "paintless:shape-changed",
        {
          shape:
            selectedShape
        }
      );

    }
  );


  shapeFillEnabledInput?.addEventListener(
    "change",
    () => {

      shapeFillEnabled =
        Boolean(
          shapeFillEnabledInput.checked
        );


      if (
        !shapeFillEnabled &&
        !shapeStrokeEnabled
      ) {

        shapeStrokeEnabled =
          true;


        if (
          shapeStrokeEnabledInput
        ) {

          shapeStrokeEnabledInput.checked =
            true;

        }

      }

    }
  );


  shapeStrokeEnabledInput?.addEventListener(
    "change",
    () => {

      shapeStrokeEnabled =
        Boolean(
          shapeStrokeEnabledInput.checked
        );


      if (
        !shapeStrokeEnabled &&
        !shapeFillEnabled
      ) {

        shapeFillEnabled =
          true;


        if (
          shapeFillEnabledInput
        ) {

          shapeFillEnabledInput.checked =
            true;

        }

      }

    }
  );


  shapeCornerRadiusInput?.addEventListener(
    "input",
    () =>
      updateShapeCornerRadius(
        shapeCornerRadiusInput.value
      )
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


        return;

      }


      if (
        event.key ===
          "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();


        finishTextEditing(
          true
        );


        setActiveTool(
          "move"
        );

      }

    }
  );


  canvasTextEditor?.addEventListener(
    "blur",
    () =>
      finishTextEditing(
        true
      )
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
            "SELECT" ||
          activeElement.isContentEditable
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
        pressedKey ===
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


        updateBrushSize(
          brushSize -
          2
        );

      }


      if (
        event.key ===
        "]"
      ) {

        event.preventDefault();


        updateBrushSize(
          brushSize +
          2
        );

      }

    }
  );


  /* =======================================================
     20. PUBLIC API
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


    setShape(
      shape
    ) {

      const allowedShapes = [
        "rectangle",
        "ellipse",
        "rounded-rectangle",
        "line"
      ];


      if (
        !allowedShapes.includes(
          shape
        )
      ) {

        return false;

      }


      selectedShape =
        shape;


      if (
        shapeTypeInput
      ) {

        shapeTypeInput.value =
          shape;

      }


      return true;

    },


    getShape() {

      return selectedShape;

    },


    finishTextEditing,

    cancelPointerAction

  };


  /* =======================================================
     21. INITIAL STATE
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


  updateShapeCornerRadius(
    shapeCornerRadius
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
