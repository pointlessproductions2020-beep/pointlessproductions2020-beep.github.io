"use strict";

/* =========================================================
   PAINTLESS
   COLOUR PICKER TOOL — v1.0

   File:
   js/tools/picker.js

   Features:
   - Samples the visible composite canvas
   - Click/tap sets the primary colour
   - Shift + click sets the secondary colour
   - Alt + click samples only the active layer
   - Live colour preview while hovering
   - Transparent-pixel detection
   - Mouse, touch and pen support
   - No history entry required because pixels are unchanged

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
      "Paintless Picker could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. PICKER STATE
  ======================================================= */

  const pickerState = {

    initialised:
      false,

    active:
      false,

    sampling:
      false,

    lastPoint:
      null,

    lastSample:
      null,

    sampleSource:
      "composite",

    previewVisible:
      false,

    previewRadius:
      11

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    editorCanvas:
      null,

    overlayCanvas:
      null,

    cursorPosition:
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


  function rgbToHex(
    red,
    green,
    blue
  ) {

    const colourApi =
      getColours();


    if (
      typeof colourApi?.rgbToHex ===
      "function"
    ) {

      return colourApi.rgbToHex(
        red,
        green,
        blue
      );

    }


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


  function clearOverlay() {

    getCore()
      ?.clearOverlay?.();


    pickerState.previewVisible =
      false;

  }


  /* =======================================================
     6. CANVAS SOURCES
  ======================================================= */

  function getCompositeCanvas() {

    return (
      dom.editorCanvas ||
      document.getElementById(
        "editor-canvas"
      )
    );

  }


  function getActiveLayerCanvas() {

    const layer =
      getCore()
        ?.getActiveLayer?.() ||
      getLayersApi()
        ?.getActiveLayer?.() ||
      null;


    return (
      layer?.canvas ||
      null
    );

  }


  function getSamplingCanvas(
    source =
      "composite"
  ) {

    if (
      source ===
      "active-layer"
    ) {

      return getActiveLayerCanvas();

    }


    return getCompositeCanvas();

  }




  function getActiveLayer() {

    return (
      getCore()?.getActiveLayer?.() ||
      getLayersApi()?.getActiveLayer?.() ||
      null
    );

  }


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

    const tx = (Number(layer.transformX) || 0) + centreX + (Number(para.x) || 0);
    const ty = (Number(layer.transformY) || 0) + centreY + (Number(para.y) || 0);
    const angle = (Number(layer.rotation) || 0) * Math.PI / 180;
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

    return { x: x + centreX, y: y + centreY, inside: point.inside };

  }


  /* =======================================================
     7. PIXEL SAMPLING
  ======================================================= */

  function samplePixel(
    point,
    {
      source =
        pickerState.sampleSource
    } = {}
  ) {

    const canvas =
      getSamplingCanvas(
        source
      );


    if (
      !canvas ||
      !point
    ) {

      return null;

    }


    const context =
      canvas.getContext(
        "2d",
        {
          willReadFrequently:
            true
        }
      );


    if (!context) {

      return null;

    }


    const samplePoint =
      source === "active-layer"
        ? documentPointToLayerPoint(
            getActiveLayer(),
            point
          )
        : point;


    const x =
      clamp(
        Math.floor(
          samplePoint.x
        ),
        0,
        Math.max(
          0,
          canvas.width -
          1
        )
      );


    const y =
      clamp(
        Math.floor(
          samplePoint.y
        ),
        0,
        Math.max(
          0,
          canvas.height -
          1
        )
      );


    try {

      const pixel =
        context.getImageData(
          x,
          y,
          1,
          1
        ).data;


      const red =
        pixel[0];


      const green =
        pixel[1];


      const blue =
        pixel[2];


      const alpha =
        pixel[3];


      return {

        x,

        y,

        red,

        green,

        blue,

        alpha,

        alphaNormalised:
          alpha /
          255,

        hex:
          rgbToHex(
            red,
            green,
            blue
          ),

        rgba:
          `rgba(${red}, ${green}, ${blue}, ${(
            alpha /
            255
          ).toFixed(
            3
          )})`,

        transparent:
          alpha ===
          0,

        source

      };

    } catch (error) {

      console.error(
        "Paintless Picker could not sample the canvas:",
        error
      );


      return null;

    }

  }


  /* =======================================================
     8. APPLY SAMPLED COLOUR
  ======================================================= */

  function applySample(
    sample,
    {
      secondary =
        false,

      remember =
        true,

      announce =
        true
    } = {}
  ) {

    if (!sample) {

      return false;

    }


    if (
      sample.transparent
    ) {

      if (announce) {

        sendStatusMessage(
          "That pixel is transparent."
        );

      }


      return false;

    }


    const colourApi =
      getColours();


    let changed =
      false;


    if (secondary) {

      if (
        typeof colourApi
          ?.setSecondaryColour ===
        "function"
      ) {

        changed =
          colourApi.setSecondaryColour(
            sample.hex,
            {
              remember,

              announce:
                false
            }
          );

      } else {

        changed =
          tools.setState(
            "secondaryColour",
            sample.hex
          );

      }

    } else {

      if (
        typeof colourApi
          ?.setPrimaryColour ===
        "function"
      ) {

        changed =
          colourApi.setPrimaryColour(
            sample.hex,
            {
              remember,

              announce:
                false
            }
          );

      } else {

        changed =
          tools.setState(
            "primaryColour",
            sample.hex
          );

      }

    }


    if (!changed) {

      return false;

    }


    pickerState.lastSample =
      {
        ...sample
      };


    if (announce) {

      sendStatusMessage(
        `${
          secondary
            ? "Secondary"
            : "Primary"
        } colour set to ${sample.hex.toUpperCase()}.`
      );

    }


    document.dispatchEvent(
      new CustomEvent(
        "paintless:colour-picked",
        {
          detail: {

            colour:
              sample.hex,

            sample:
              {
                ...sample
              },

            target:
              secondary
                ? "secondary"
                : "primary"

          }
        }
      )
    );


    return true;

  }


  /* =======================================================
     9. PREVIEW
  ======================================================= */

  function getPreviewContrastColour(
    sample
  ) {

    if (!sample) {

      return "#ffffff";

    }


    const luminance =
      (
        0.2126 *
          sample.red +
        0.7152 *
          sample.green +
        0.0722 *
          sample.blue
      ) /
      255;


    return luminance >
      0.52
      ? "#000000"
      : "#ffffff";

  }


  function drawPickerPreview(
    point,
    sample
  ) {

    if (
      !pickerState.active ||
      !overlayContext ||
      !point ||
      !point.inside
    ) {

      return false;

    }


    clearOverlay();


    const radius =
      pickerState.previewRadius;


    const fillColour =
      sample?.transparent
        ? "rgba(255, 255, 255, 0.18)"
        : sample?.hex ||
          "#ffffff";


    const contrastColour =
      sample?.transparent
        ? "#ff596d"
        : getPreviewContrastColour(
            sample
          );


    overlayContext.save();


    overlayContext.globalAlpha =
      1;


    overlayContext.globalCompositeOperation =
      "source-over";


    overlayContext.setLineDash(
      []
    );


    /*
     * Outer dark border.
     */

    overlayContext.beginPath();


    overlayContext.arc(
      point.x,
      point.y,
      radius +
        2,
      0,
      Math.PI *
        2
    );


    overlayContext.fillStyle =
      "rgba(0, 0, 0, 0.82)";


    overlayContext.fill();


    /*
     * Sampled-colour circle.
     */

    overlayContext.beginPath();


    overlayContext.arc(
      point.x,
      point.y,
      radius,
      0,
      Math.PI *
        2
    );


    overlayContext.fillStyle =
      fillColour;


    overlayContext.fill();


    overlayContext.strokeStyle =
      "rgba(255, 255, 255, 0.92)";


    overlayContext.lineWidth =
      1.5;


    overlayContext.stroke();


    /*
     * Centre pip.
     */

    overlayContext.beginPath();


    overlayContext.arc(
      point.x,
      point.y,
      2,
      0,
      Math.PI *
        2
    );


    overlayContext.fillStyle =
      contrastColour;


    overlayContext.fill();


    if (
      sample?.transparent
    ) {

      overlayContext.strokeStyle =
        "#ff596d";


      overlayContext.lineWidth =
        2;


      overlayContext.beginPath();


      overlayContext.moveTo(
        point.x -
          radius *
          0.55,
        point.y -
          radius *
          0.55
      );


      overlayContext.lineTo(
        point.x +
          radius *
          0.55,
        point.y +
          radius *
          0.55
      );


      overlayContext.stroke();

    }


    overlayContext.restore();


    pickerState.previewVisible =
      true;


    pickerState.lastPoint =
      copyPoint(
        point
      );


    pickerState.lastSample =
      sample
        ? {
            ...sample
          }
        : null;


    return true;

  }


  function updatePickerPreview(
    payload
  ) {

    if (
      !pickerState.active ||
      !payload?.point?.inside
    ) {

      clearOverlay();


      return false;

    }


    const source =
      payload.altKey
        ? "active-layer"
        : "composite";


    const sample =
      samplePixel(
        payload.point,
        {
          source
        }
      );


    drawPickerPreview(
      payload.point,
      sample
    );


    return Boolean(
      sample
    );

  }


  /* =======================================================
     10. POINTER HANDLERS
  ======================================================= */

  function pointerDown(
    payload
  ) {

    if (
      !pickerState.active
    ) {

      return false;

    }


    pickerState.sampling =
      true;


    const source =
      payload.altKey
        ? "active-layer"
        : "composite";


    pickerState.sampleSource =
      source;


    const sample =
      samplePixel(
        payload.point,
        {
          source
        }
      );


    const changed =
      applySample(
        sample,
        {
          secondary:
            Boolean(
              payload.shiftKey
            )
        }
      );


    drawPickerPreview(
      payload.point,
      sample
    );


    return {

      changed:
        false,

      preventDefault:
        true,

      capturePointer:
        true,

      statusMessage:
        changed
          ? null
          : sample?.transparent
            ? "That pixel is transparent."
            : "No colour could be sampled."

    };

  }


  function pointerMove(
    payload
  ) {

    if (
      !pickerState.active
    ) {

      return false;

    }


    const source =
      payload.altKey
        ? "active-layer"
        : "composite";


    const sample =
      samplePixel(
        payload.point,
        {
          source
        }
      );


    drawPickerPreview(
      payload.point,
      sample
    );


    /*
     * While holding the pointer down, continuously sample.
     * This feels natural on phones and drawing tablets.
     */

    if (
      pickerState.sampling &&
      !sample?.transparent
    ) {

      applySample(
        sample,
        {
          secondary:
            Boolean(
              payload.shiftKey
            ),

          remember:
            false,

          announce:
            false
        }
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
      !pickerState.active
    ) {

      return false;

    }


    pickerState.sampling =
      false;


    updatePickerPreview(
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

    pickerState.sampling =
      false;


    clearOverlay();


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
      !pickerState.active
    ) {

      return false;

    }


    updatePickerPreview(
      payload
    );


    return false;

  }


  function pointerEnter(
    payload
  ) {

    if (
      !pickerState.active
    ) {

      return false;

    }


    updatePickerPreview(
      payload
    );


    return false;

  }


  function pointerLeave() {

    pickerState.sampling =
      false;


    clearOverlay();


    return false;

  }


  /* =======================================================
     11. TOOL ACTIVATION
  ======================================================= */

  function activate() {

    pickerState.active =
      true;


    pickerState.sampling =
      false;


    getCore()
      ?.showToolOptions?.(
        []
      );


    getCore()
      ?.setCanvasCursor?.(
        "none"
      );


    sendStatusMessage(
      "Picker ready. Shift-click chooses the secondary colour."
    );


    return true;

  }


  function deactivate() {

    pickerState.active =
      false;


    pickerState.sampling =
      false;


    clearOverlay();


    getCore()
      ?.setCanvasCursor?.(
        "default"
      );


    return true;

  }


  /* =======================================================
     12. DOM AND EVENTS
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


    dom.cursorPosition =
      document.getElementById(
        "cursor-position"
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
      "paintless:history-restored",
      () => {

        pickerState.sampling =
          false;


        clearOverlay();

      }
    );


    document.addEventListener(
      "paintless:document-reset",
      () => {

        pickerState.sampling =
          false;


        clearOverlay();

      }
    );


    document.addEventListener(
      "paintless:document-resized",
      () => {

        pickerState.sampling =
          false;


        clearOverlay();

      }
    );


    window.addEventListener(
      "keydown",
      (event) => {

        if (
          tools.getActiveTool() !==
          "eyedropper"
        ) {

          return;

        }


        if (
          event.key ===
          "Escape"
        ) {

          pickerState.sampling =
            false;


          clearOverlay();

        }

      }
    );

  }


  /* =======================================================
     13. PICKER MODULE
  ======================================================= */

  const pickerModule = {

    name:
      "Colour Picker",

    label:
      "Colour Picker",

    initialised:
      false,


    async initialise() {

      if (
        pickerState.initialised
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
          "Paintless Picker could not find the editor canvases."
        );

      }


      connectEvents();


      pickerState.initialised =
        true;


      this.initialised =
        true;


      if (
        tools.getActiveTool() ===
        "eyedropper"
      ) {

        activate();

      }


      document.dispatchEvent(
        new CustomEvent(
          "paintless:picker-ready",
          {
            detail: {
              picker:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless Picker ready.",
        [
          "color:#35e7ff",
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
     14. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      pickerState,


    activate,

    deactivate,


    samplePixel,

    applySample,

    drawPickerPreview,

    updatePickerPreview,


    setSampleSource(
      source
    ) {

      if (
        ![
          "composite",
          "active-layer"
        ].includes(
          source
        )
      ) {

        return false;

      }


      pickerState.sampleSource =
        source;


      return source;

    },


    getSampleSource() {

      return pickerState.sampleSource;

    },


    getLastSample() {

      return pickerState.lastSample
        ? {
            ...pickerState.lastSample
          }
        : null;

    },


    setPreviewRadius(
      radius
    ) {

      pickerState.previewRadius =
        clamp(
          radius,
          5,
          40
        );


      return pickerState.previewRadius;

    }

  };


  window.PaintlessPicker =
    publicApi;


  pickerModule.api =
    publicApi;


  /*
   * Important:
   *
   * The toolbar calls this tool "eyedropper", so it must be
   * registered under that exact name even though the filename
   * is picker.js.
   */

  tools.registerModule(
    "eyedropper",
    pickerModule
  );

})();
