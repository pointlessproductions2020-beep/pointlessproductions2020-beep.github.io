"use strict";

/* =========================================================
   PAINTLESS
   FLOOD FILL TOOL — v1.0

   File:
   js/tools/fill.js

   Features:
   - Primary-colour flood fill
   - Adjustable opacity
   - Colour tolerance
   - Contiguous filling
   - Transparent-area support
   - Mouse, touch and pen support
   - One fill = one Undo step
   - Locked-layer protection
   - Large-canvas safety checks

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
      "Paintless Fill could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. FILL STATE
  ======================================================= */

  const fillState = {

    initialised:
      false,

    active:
      false,

    filling:
      false,

    tolerance:
      24,

    contiguous:
      true,

    includeTransparency:
      true,

    maximumPixels:
      50000000,

    lastFillPoint:
      null,

    lastChangedPixels:
      0

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    editorCanvas:
      null,

    opacityInput:
      null,

    wandToleranceInput:
      null,

    wandToleranceOutput:
      null,

    wandContiguousInput:
      null

  };


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
     6. FILL SETTINGS
  ======================================================= */

  function getFillColour() {

    return (
      getColours()
        ?.getFillColour?.() ||
      getColours()
        ?.getPrimaryColour?.() ||
      tools.getState(
        "primaryColour"
      ) ||
      "#a84cff"
    );

  }


  function getFillOpacity() {

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


  function getTolerance() {

    return clamp(
      fillState.tolerance,
      0,
      255
    );

  }


  function setTolerance(
    value
  ) {

    fillState.tolerance =
      clamp(
        value,
        0,
        255
      );


    if (dom.wandToleranceInput) {

      dom.wandToleranceInput.value =
        String(
          fillState.tolerance
        );

    }


    if (dom.wandToleranceOutput) {

      dom.wandToleranceOutput.textContent =
        String(
          Math.round(
            fillState.tolerance
          )
        );

    }


    return fillState.tolerance;

  }


  function setContiguous(
    enabled
  ) {

    fillState.contiguous =
      Boolean(
        enabled
      );


    if (dom.wandContiguousInput) {

      dom.wandContiguousInput.checked =
        fillState.contiguous;

    }


    return fillState.contiguous;

  }


  /* =======================================================
     7. COLOUR HELPERS
  ======================================================= */

  function hexToRgb(
    colour
  ) {

    if (
      typeof getColours()?.hexToRgb ===
      "function"
    ) {

      return getColours().hexToRgb(
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


  function coloursMatch(
    firstRed,
    firstGreen,
    firstBlue,
    firstAlpha,
    secondRed,
    secondGreen,
    secondBlue,
    secondAlpha,
    tolerance
  ) {

    if (
      Math.abs(
        firstRed -
        secondRed
      ) >
      tolerance
    ) {

      return false;

    }


    if (
      Math.abs(
        firstGreen -
        secondGreen
      ) >
      tolerance
    ) {

      return false;

    }


    if (
      Math.abs(
        firstBlue -
        secondBlue
      ) >
      tolerance
    ) {

      return false;

    }


    if (
      Math.abs(
        firstAlpha -
        secondAlpha
      ) >
      tolerance
    ) {

      return false;

    }


    return true;

  }


  function blendChannel(
    source,
    destination,
    opacity
  ) {

    return Math.round(
      source *
        opacity +
      destination *
        (
          1 -
          opacity
        )
    );

  }


  /* =======================================================
     8. LAYER HELPERS
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
        "That layer cannot be filled."
      );


      return false;

    }


    return true;

  }


  /* =======================================================
     9. PIXEL REPLACEMENT
  ======================================================= */

  function replacePixel(
    pixels,
    pixelIndex,
    fillColour,
    fillAlpha,
    opacity
  ) {

    const destinationRed =
      pixels[
        pixelIndex
      ];


    const destinationGreen =
      pixels[
        pixelIndex +
        1
      ];


    const destinationBlue =
      pixels[
        pixelIndex +
        2
      ];


    const destinationAlpha =
      pixels[
        pixelIndex +
        3
      ];


    const sourceAlpha =
      (
        fillAlpha /
        255
      ) *
      opacity;


    const destinationAlphaNormalised =
      destinationAlpha /
      255;


    const resultingAlpha =
      sourceAlpha +
      destinationAlphaNormalised *
      (
        1 -
        sourceAlpha
      );


    if (
      resultingAlpha <=
      0
    ) {

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


      return;

    }


    const red =
      (
        fillColour.red *
          sourceAlpha +
        destinationRed *
          destinationAlphaNormalised *
          (
            1 -
            sourceAlpha
          )
      ) /
      resultingAlpha;


    const green =
      (
        fillColour.green *
          sourceAlpha +
        destinationGreen *
          destinationAlphaNormalised *
          (
            1 -
            sourceAlpha
          )
      ) /
      resultingAlpha;


    const blue =
      (
        fillColour.blue *
          sourceAlpha +
        destinationBlue *
          destinationAlphaNormalised *
          (
            1 -
            sourceAlpha
          )
      ) /
      resultingAlpha;


    pixels[
      pixelIndex
    ] =
      clamp(
        Math.round(
          red
        ),
        0,
        255
      );


    pixels[
      pixelIndex +
      1
    ] =
      clamp(
        Math.round(
          green
        ),
        0,
        255
      );


    pixels[
      pixelIndex +
      2
    ] =
      clamp(
        Math.round(
          blue
        ),
        0,
        255
      );


    pixels[
      pixelIndex +
      3
    ] =
      clamp(
        Math.round(
          resultingAlpha *
          255
        ),
        0,
        255
      );

  }


  /* =======================================================
     10. CONTIGUOUS FLOOD FILL
  ======================================================= */

  function floodFillContiguous(
    imageData,
    startX,
    startY,
    fillColour,
    opacity,
    tolerance
  ) {

    const width =
      imageData.width;


    const height =
      imageData.height;


    const pixels =
      imageData.data;


    const startPixel =
      (
        startY *
        width +
        startX
      ) *
      4;


    const targetRed =
      pixels[
        startPixel
      ];


    const targetGreen =
      pixels[
        startPixel +
        1
      ];


    const targetBlue =
      pixels[
        startPixel +
        2
      ];


    const targetAlpha =
      pixels[
        startPixel +
        3
      ];


    const fillAlpha =
      255;


    const visited =
      new Uint8Array(
        width *
        height
      );


    const stackX =
      [];


    const stackY =
      [];


    stackX.push(
      startX
    );


    stackY.push(
      startY
    );


    let changedPixels =
      0;


    while (
      stackX.length >
      0
    ) {

      const y =
        stackY.pop();


      const x =
        stackX.pop();


      if (
        x <
          0 ||
        y <
          0 ||
        x >=
          width ||
        y >=
          height
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


      const pixelIndex =
        pixelNumber *
        4;


      const matches =
        coloursMatch(
          pixels[
            pixelIndex
          ],
          pixels[
            pixelIndex +
            1
          ],
          pixels[
            pixelIndex +
            2
          ],
          pixels[
            pixelIndex +
            3
          ],
          targetRed,
          targetGreen,
          targetBlue,
          targetAlpha,
          tolerance
        );


      if (!matches) {

        continue;

      }


      replacePixel(
        pixels,
        pixelIndex,
        fillColour,
        fillAlpha,
        opacity
      );


      changedPixels +=
        1;


      stackX.push(
        x +
        1
      );


      stackY.push(
        y
      );


      stackX.push(
        x -
        1
      );


      stackY.push(
        y
      );


      stackX.push(
        x
      );


      stackY.push(
        y +
        1
      );


      stackX.push(
        x
      );


      stackY.push(
        y -
        1
      );

    }


    return changedPixels;

  }


  /* =======================================================
     11. GLOBAL COLOUR FILL
  ======================================================= */

  function floodFillGlobal(
    imageData,
    startX,
    startY,
    fillColour,
    opacity,
    tolerance
  ) {

    const width =
      imageData.width;


    const pixels =
      imageData.data;


    const startPixel =
      (
        startY *
        width +
        startX
      ) *
      4;


    const targetRed =
      pixels[
        startPixel
      ];


    const targetGreen =
      pixels[
        startPixel +
        1
      ];


    const targetBlue =
      pixels[
        startPixel +
        2
      ];


    const targetAlpha =
      pixels[
        startPixel +
        3
      ];


    let changedPixels =
      0;


    for (
      let pixelIndex = 0;
      pixelIndex <
        pixels.length;
      pixelIndex +=
        4
    ) {

      const matches =
        coloursMatch(
          pixels[
            pixelIndex
          ],
          pixels[
            pixelIndex +
            1
          ],
          pixels[
            pixelIndex +
            2
          ],
          pixels[
            pixelIndex +
            3
          ],
          targetRed,
          targetGreen,
          targetBlue,
          targetAlpha,
          tolerance
        );


      if (!matches) {

        continue;

      }


      replacePixel(
        pixels,
        pixelIndex,
        fillColour,
        255,
        opacity
      );


      changedPixels +=
        1;

    }


    return changedPixels;

  }


  /* =======================================================
     12. CHECK WHETHER FILL WOULD CHANGE PIXELS
  ======================================================= */

  function targetAlreadyMatchesFill(
    imageData,
    startX,
    startY,
    fillColour,
    opacity
  ) {

    const pixelIndex =
      (
        startY *
        imageData.width +
        startX
      ) *
      4;


    const pixels =
      imageData.data;


    const expectedAlpha =
      Math.round(
        255 *
        opacity
      );


    return (
      pixels[
        pixelIndex
      ] ===
        fillColour.red &&
      pixels[
        pixelIndex +
        1
      ] ===
        fillColour.green &&
      pixels[
        pixelIndex +
        2
      ] ===
        fillColour.blue &&
      pixels[
        pixelIndex +
        3
      ] ===
        expectedAlpha
    );

  }


  /* =======================================================
     13. APPLY FILL
  ======================================================= */

  function applyFill(
    layer,
    point
  ) {

    if (
      !canEditLayer(
        layer
      )
    ) {

      return false;

    }


    const width =
      layer.canvas.width;


    const height =
      layer.canvas.height;


    const totalPixels =
      width *
      height;


    if (
      totalPixels >
      fillState.maximumPixels
    ) {

      sendStatusMessage(
        "That canvas is too large for flood fill right now."
      );


      return false;

    }


    const startX =
      clamp(
        Math.floor(
          point.x
        ),
        0,
        width -
          1
      );


    const startY =
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


    const fillColour =
      hexToRgb(
        getFillColour()
      );


    const opacity =
      getFillOpacity();


    if (
      targetAlreadyMatchesFill(
        imageData,
        startX,
        startY,
        fillColour,
        opacity
      )
    ) {

      sendStatusMessage(
        "That area is already wearing that colour."
      );


      return false;

    }


    const tolerance =
      getTolerance();


    fillState.filling =
      true;


    let changedPixels =
      0;


    try {

      if (
        fillState.contiguous
      ) {

        changedPixels =
          floodFillContiguous(
            imageData,
            startX,
            startY,
            fillColour,
            opacity,
            tolerance
          );

      } else {

        changedPixels =
          floodFillGlobal(
            imageData,
            startX,
            startY,
            fillColour,
            opacity,
            tolerance
          );

      }


      if (
        changedPixels <=
        0
      ) {

        return false;

      }


      layer.context.putImageData(
        imageData,
        0,
        0
      );


      fillState.lastFillPoint =
        copyPoint(
          point
        );


      fillState.lastChangedPixels =
        changedPixels;


      renderLayers();


      saveFillHistory();


      sendStatusMessage(
        `Filled ${changedPixels.toLocaleString()} pixel${
          changedPixels ===
          1
            ? ""
            : "s"
        }.`
      );


      document.dispatchEvent(
        new CustomEvent(
          "paintless:fill-applied",
          {
            detail: {
              point:
                copyPoint(
                  point
                ),

              changedPixels,

              tolerance,

              contiguous:
                fillState.contiguous,

              colour:
                getFillColour(),

              opacity
            }
          }
        )
      );


      return true;

    } catch (error) {

      console.error(
        "Paintless Fill failed:",
        error
      );


      sendStatusMessage(
        "Fill failed. The pixels refused to cooperate."
      );


      return false;

    } finally {

      fillState.filling =
        false;

    }

  }


  /* =======================================================
     14. HISTORY
  ======================================================= */

  function saveFillHistory() {

    if (
      typeof getHistoryApi()
        ?.saveHistory ===
      "function"
    ) {

      return getHistoryApi()
        .saveHistory(
          "Fill area"
        );

    }


    if (
      typeof getCore()
        ?.requestHistorySave ===
      "function"
    ) {

      return getCore()
        .requestHistorySave(
          "Fill area"
        );

    }


    document.dispatchEvent(
      new CustomEvent(
        "paintless:history-requested",
        {
          detail: {
            reason:
              "Fill area"
          }
        }
      )
    );


    return true;

  }


  /* =======================================================
     15. POINTER HANDLERS
  ======================================================= */

  function pointerDown(
    payload
  ) {

    if (
      !fillState.active ||
      fillState.filling
    ) {

      return false;

    }


    const layer =
      payload.layer ||
      getActiveLayer();


    const changed =
      applyFill(
        layer,
        payload.point
      );


    payload.markChanged?.(
      changed
    );


    return {

      changed,

      preventDefault:
        true,

      releasePointer:
        true

    };

  }


  function pointerMove() {

    /*
     * Fill is a single-click/tap tool.
     */

    return false;

  }


  function pointerUp() {

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

    fillState.filling =
      false;


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

    fillState.active =
      true;


    getCore()
      ?.showToolOptions?.(
        [
          "opacity"
        ]
      );


    getCore()
      ?.setCanvasCursor?.(
        "crosshair"
      );


    sendStatusMessage(
      "Fill bucket ready."
    );


    return true;

  }


  function deactivate() {

    fillState.active =
      false;


    fillState.filling =
      false;


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


    dom.opacityInput =
      document.getElementById(
        "tool-opacity"
      );


    dom.wandToleranceInput =
      document.getElementById(
        "wand-tolerance"
      );


    dom.wandToleranceOutput =
      document.getElementById(
        "wand-tolerance-output"
      );


    dom.wandContiguousInput =
      document.getElementById(
        "wand-contiguous"
      );

  }


  function connectEvents() {

    dom.wandToleranceInput
      ?.addEventListener(
        "input",
        () => {

          setTolerance(
            dom.wandToleranceInput.value
          );

        }
      );


    dom.wandContiguousInput
      ?.addEventListener(
        "change",
        () => {

          setContiguous(
            dom.wandContiguousInput.checked
          );

        }
      );


    document.addEventListener(
      "paintless:history-restored",
      () => {

        fillState.filling =
          false;

      }
    );


    document.addEventListener(
      "paintless:document-reset",
      () => {

        fillState.filling =
          false;

      }
    );


    document.addEventListener(
      "paintless:document-resized",
      () => {

        fillState.filling =
          false;

      }
    );

  }


  /* =======================================================
     18. INITIAL SETTINGS
  ======================================================= */

  function initialiseSettings() {

    const tolerance =
      Number(
        dom.wandToleranceInput
          ?.value
      );


    if (
      Number.isFinite(
        tolerance
      )
    ) {

      fillState.tolerance =
        tolerance;

    }


    if (dom.wandContiguousInput) {

      fillState.contiguous =
        Boolean(
          dom.wandContiguousInput
            .checked
        );

    }


    setTolerance(
      fillState.tolerance
    );


    setContiguous(
      fillState.contiguous
    );

  }


  /* =======================================================
     19. FILL MODULE
  ======================================================= */

  const fillModule = {

    name:
      "Fill",

    label:
      "Fill",

    initialised:
      false,


    async initialise() {

      if (
        fillState.initialised
      ) {

        return true;

      }


      collectDomReferences();


      if (!dom.editorCanvas) {

        throw new Error(
          "Paintless Fill could not find editor-canvas."
        );

      }


      initialiseSettings();

      connectEvents();


      fillState.initialised =
        true;


      this.initialised =
        true;


      if (
        tools.getActiveTool() ===
        "fill"
      ) {

        activate();

      }


      document.dispatchEvent(
        new CustomEvent(
          "paintless:fill-ready",
          {
            detail: {
              fill:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless Fill ready.",
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

    pointerCancel

  };


  /* =======================================================
     20. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      fillState,


    activate,

    deactivate,


    applyFill,

    floodFillContiguous,

    floodFillGlobal,


    getFillColour,

    getFillOpacity,

    getTolerance,

    setTolerance,

    setContiguous,


    isContiguous() {

      return fillState.contiguous;

    },


    setIncludeTransparency(
      enabled
    ) {

      fillState.includeTransparency =
        Boolean(
          enabled
        );


      return fillState.includeTransparency;

    },


    getLastFillInformation() {

      return {

        point:
          copyPoint(
            fillState.lastFillPoint
          ),

        changedPixels:
          fillState.lastChangedPixels

      };

    }

  };


  window.PaintlessFill =
    publicApi;


  fillModule.api =
    publicApi;


  /* =======================================================
     21. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "fill",
    fillModule
  );

})();
