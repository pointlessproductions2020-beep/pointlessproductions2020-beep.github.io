"use strict";

/* =========================================================
   PAINTLESS3D
   ANAGLYPH RENDERER — v0.1

   File:
   js/paintless3d/renderer.js

   Purpose:
   - Renders Paintless layers as stereoscopic red/cyan artwork
   - Uses each layer's layer.depth3d value
   - Positive depth moves forward
   - Negative depth moves behind the screen
   - Zero depth remains on the screen plane
   - Creates a dedicated preview canvas
   - Never permanently changes the original artwork
   - Supports layer visibility, opacity and blend modes
   - Supports red/cyan, red/blue and green/magenta modes
   - Supports eye swapping
   - Supports convergence and depth-strength settings
   - Re-renders automatically when artwork or depth changes
   - Produces full-resolution output for the future exporter

   This renderer listens for:

   paintless3d:preview-changed
   paintless3d:layer-depth-changed
   paintless3d:render-requested
   paintless3d:strength-changed
   paintless3d:convergence-changed
   paintless3d:channel-mode-changed
   paintless3d:swap-eyes-changed
   paintless3d:ghost-reduction-changed
========================================================= */

(() => {

  /* =======================================================
     1. PAINTLESS3D CHECK
  ======================================================= */

  const paintless3d =
    window.Paintless3D;


  if (
    !paintless3d ||
    typeof paintless3d.registerModule !==
      "function"
  ) {

    console.error(
      "Paintless3D Renderer could not start because paintless3d.js has not loaded."
    );


    return;

  }


  /* =======================================================
     2. RENDERER STATE
  ======================================================= */

  const rendererState = {

    initialised:
      false,

    destroyed:
      false,

    enabled:
      false,

    rendering:
      false,

    renderQueued:
      false,

    renderFrame:
      null,

    renderCount:
      0,

    lastRenderReason:
      null,

    lastRenderDuration:
      0,

    lastWidth:
      0,

    lastHeight:
      0,

    lastError:
      null,

    canvasInstalled:
      false,

    stylesInstalled:
      false,

    resizeObserverInstalled:
      false,

    mutationObserverInstalled:
      false,

    automaticRendering:
      true,

    hideOriginalDuringPreview:
      true,

    maximumPreviewPixels:
      24000000,

    depthScale:
      1,

    alphaMode:
      "maximum",

    previewOpacity:
      1,

    previewQuality:
      "full",

    backgroundColour:
      null

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    canvasViewport:
      null,

    canvasStage:
      null,

    editorCanvas:
      null,

    overlayCanvas:
      null,

    previewCanvas:
      null,

    styles:
      null

  };


  /* =======================================================
     4. INTERNAL CANVASES
  ======================================================= */

  const internal = {

    leftCanvas:
      null,

    leftContext:
      null,

    rightCanvas:
      null,

    rightContext:
      null,

    combinedCanvas:
      null,

    combinedContext:
      null,

    temporaryCanvas:
      null,

    temporaryContext:
      null,

    resizeObserver:
      null,

    mutationObserver:
      null

  };


  /* =======================================================
     5. SHARED APIS
  ======================================================= */

  function getCoreApi() {

    return (
      window.Paintless3DCore ||
      paintless3d.getModule?.(
        "core"
      )?.api ||
      null
    );

  }


  function getModeApi() {

    return (
      window.Paintless3DMode ||
      paintless3d.getModule?.(
        "mode"
      )?.api ||
      null
    );

  }


  function getDepthApi() {

    return (
      window.Paintless3DDepth ||
      paintless3d.getModule?.(
        "depth"
      )?.api ||
      null
    );

  }


  function getLayersApi() {

    return (
      window.PaintlessLayers ||
      null
    );

  }


  function getToolCore() {

    return (
      window.PaintlessToolCore ||
      null
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


  function dispatch(
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


  function sendStatusMessage(
    message
  ) {

    if (
      typeof getToolCore()
        ?.sendStatusMessage ===
      "function"
    ) {

      getToolCore()
        .sendStatusMessage(
          message
        );


      return;

    }


    dispatch(
      "paintless:status-message",
      {
        message
      }
    );

  }


  function findFirst(
    selectors
  ) {

    for (
      const selector of
      selectors
    ) {

      const element =
        document.querySelector(
          selector
        );


      if (element) {

        return element;

      }

    }


    return null;

  }


  function createCanvas(
    width =
      1,
    height =
      1
  ) {

    const canvas =
      document.createElement(
        "canvas"
      );


    canvas.width =
      Math.max(
        1,
        Math.round(
          width
        )
      );


    canvas.height =
      Math.max(
        1,
        Math.round(
          height
        )
      );


    return canvas;

  }


  function getCanvasContext(
    canvas,
    {
      willReadFrequently =
        false
    } = {}
  ) {

    return canvas?.getContext(
      "2d",
      {
        alpha:
          true,

        willReadFrequently
      }
    ) || null;

  }


  function getDocumentSize() {

    const layersApi =
      getLayersApi();


    const size =
      layersApi?.getDocumentSize?.() ||
      getToolCore()
        ?.getDocumentSize?.();


    const width =
      Number(
        size?.width
      ) ||
      dom.editorCanvas?.width ||
      1;


    const height =
      Number(
        size?.height
      ) ||
      dom.editorCanvas?.height ||
      1;


    return {

      width:
        Math.max(
          1,
          Math.round(
            width
          )
        ),

      height:
        Math.max(
          1,
          Math.round(
            height
          )
        )

    };

  }


  function getLayerName(
    layer,
    index
  ) {

    return (
      layer?.name ||
      layer?.label ||
      `Layer ${index + 1}`
    );

  }


  function layerIsVisible(
    layer
  ) {

    if (!layer) {

      return false;

    }


    if (
      layer.visible ===
      false ||
      layer.hidden ===
      true
    ) {

      return false;

    }


    return true;

  }


  function getLayerOpacity(
    layer
  ) {

    const opacity =
      Number(
        layer?.opacity
      );


    if (
      !Number.isFinite(
        opacity
      )
    ) {

      return 1;

    }


    /*
     * Accept either 0–1 or 0–100 layer opacity values.
     */

    return opacity >
      1
      ? clamp(
          opacity /
          100,
          0,
          1
        )
      : clamp(
          opacity,
          0,
          1
        );

  }


  function getLayerBlendMode(
    layer
  ) {

    const mode =
      String(
        layer?.blendMode ||
        layer?.compositeOperation ||
        "source-over"
      );


    const supportedModes =
      new Set(
        [
          "source-over",
          "multiply",
          "screen",
          "overlay",
          "darken",
          "lighten",
          "color-dodge",
          "color-burn",
          "hard-light",
          "soft-light",
          "difference",
          "exclusion",
          "hue",
          "saturation",
          "color",
          "luminosity",
          "copy",
          "lighter"
        ]
      );


    return supportedModes.has(
      mode
    )
      ? mode
      : "source-over";

  }


  function getLayerCanvas(
    layer
  ) {

    if (
      layer?.canvas instanceof
      HTMLCanvasElement
    ) {

      return layer.canvas;

    }


    if (
      layer?.image instanceof
      HTMLImageElement ||
      layer?.image instanceof
      ImageBitmap
    ) {

      return layer.image;

    }


    return null;

  }


  /* =======================================================
     7. LAYER COLLECTION
  ======================================================= */

  function getLayers() {

    const layersApi =
      getLayersApi();


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


    if (
      Array.isArray(
        layersApi?.layers
      )
    ) {

      return layersApi.layers;

    }


    if (
      Array.isArray(
        layersApi?.state?.layers
      )
    ) {

      return layersApi.state.layers;

    }


    return [];

  }


  function getRenderableLayers() {

    return getLayers()
      .filter(
        (layer) =>
          layerIsVisible(
            layer
          ) &&
          Boolean(
            getLayerCanvas(
              layer
            )
          )
      );

  }


  function getLayerDepth(
    layer
  ) {

    if (
      typeof getDepthApi()
        ?.getLayerDepth ===
      "function"
    ) {

      return getDepthApi()
        .getLayerDepth(
          layer
        );

    }


    const depth =
      Number(
        layer?.depth3d ??
        layer?.depth ??
        0
      );


    return Number.isFinite(
      depth
    )
      ? clamp(
          depth,
          -100,
          100
        )
      : 0;

  }


  /* =======================================================
     8. STEREO SETTINGS
  ======================================================= */

  function getStereoSettings() {

    const settings =
      getCoreApi()
        ?.getStereoSettings?.() ||
      {};


    return {

      strength:
        clamp(
          settings.strength ??
          12,
          0,
          100
        ),

      convergence:
        clamp(
          settings.convergence ??
          0,
          -100,
          100
        ),

      channelMode:
        settings.channelMode ||
        "red-cyan",

      swapEyes:
        Boolean(
          settings.swapEyes
        ),

      ghostReduction:
        clamp(
          settings.ghostReduction ??
          0,
          0,
          100
        )

    };

  }


  function calculateLayerSeparation(
    layer,
    width
  ) {

    const depth =
      getLayerDepth(
        layer
      );


    const settings =
      getStereoSettings();


    /*
     * Strength represents the maximum separation as a
     * percentage of approximately 8% of the document width.

     * At the default strength of 12, maximum layer separation
     * remains comfortable rather than extreme.
     */

    const maximumComfortableOffset =
      Math.max(
        1,
        width *
        0.08
      );


    const strengthRatio =
      settings.strength /
      100;


    const depthRatio =
      (
        depth -
        settings.convergence
      ) /
      100;


    const separation =
      maximumComfortableOffset *
      strengthRatio *
      depthRatio *
      rendererState.depthScale;


    return clamp(
      separation,
      -maximumComfortableOffset,
      maximumComfortableOffset
    );

  }


  function calculateEyeOffsets(
    layer,
    width
  ) {

    const separation =
      calculateLayerSeparation(
        layer,
        width
      );


    const settings =
      getStereoSettings();


    /*
     * Each eye receives half of the total separation.
     */

    let leftOffset =
      -separation /
      2;


    let rightOffset =
      separation /
      2;


    if (
      settings.swapEyes
    ) {

      const temporaryOffset =
        leftOffset;


      leftOffset =
        rightOffset;


      rightOffset =
        temporaryOffset;

    }


    return {

      separation,

      leftOffset,

      rightOffset

    };

  }


  /* =======================================================
     9. DOM COLLECTION
  ======================================================= */

  function collectDomReferences() {

    dom.canvasViewport =
      findFirst(
        [
          "#canvas-viewport",
          ".canvas-viewport",
          ".editor-viewport"
        ]
      );


    dom.canvasStage =
      findFirst(
        [
          "#canvas-stage",
          ".canvas-stage",
          ".editor-stage"
        ]
      );


    dom.editorCanvas =
      document.getElementById(
        "editor-canvas"
      );


    dom.overlayCanvas =
      document.getElementById(
        "overlay-canvas"
      );

  }


  /* =======================================================
     10. STYLES
  ======================================================= */

  function installStyles() {

    if (
      rendererState.stylesInstalled ||
      document.getElementById(
        "paintless3d-renderer-styles"
      )
    ) {

      rendererState.stylesInstalled =
        true;


      return true;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "paintless3d-renderer-styles";


    style.textContent = `
      #paintless3d-preview-canvas {
        position: absolute;
        left: 0;
        top: 0;
        display: none;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        border: 0;
        opacity: 1;
        pointer-events: none;
        image-rendering: auto;
        z-index: 7;
      }

      body.paintless3d-preview-active
      #paintless3d-preview-canvas {
        display: block;
      }

      body.paintless3d-preview-active
      #editor-canvas.paintless3d-original-hidden {
        visibility: hidden;
      }

      body.paintless3d-preview-active
      #paintless3d-preview-canvas {
        box-shadow:
          -4px 0 18px rgba(255, 49, 92, 0.12),
          4px 0 18px rgba(37, 230, 255, 0.12);
      }

      #canvas-stage,
      .canvas-stage {
        isolation: isolate;
      }

      body.paintless3d-rendering
      #paintless3d-preview-canvas {
        filter: brightness(0.985);
      }
    `;


    document.head.appendChild(
      style
    );


    dom.styles =
      style;


    rendererState.stylesInstalled =
      true;


    return true;

  }


  /* =======================================================
     11. PREVIEW CANVAS
  ======================================================= */

  function createPreviewCanvas() {

    const canvas =
      createCanvas();


    canvas.id =
      "paintless3d-preview-canvas";


    canvas.setAttribute(
      "aria-hidden",
      "true"
    );


    canvas.dataset.paintless3dRenderer =
      "anaglyph";


    return canvas;

  }


  function installPreviewCanvas() {

    const existingCanvas =
      document.getElementById(
        "paintless3d-preview-canvas"
      );


    if (existingCanvas) {

      dom.previewCanvas =
        existingCanvas;


      rendererState.canvasInstalled =
        true;


      synchronisePreviewCanvas();


      return true;

    }


    if (
      !dom.canvasStage ||
      !dom.editorCanvas
    ) {

      return false;

    }


    const previewCanvas =
      createPreviewCanvas();


    /*
     * Place the preview canvas above the editor image but below
     * the normal interactive overlay canvas.
     */

    if (
      dom.overlayCanvas &&
      dom.overlayCanvas.parentElement ===
        dom.canvasStage
    ) {

      dom.canvasStage.insertBefore(
        previewCanvas,
        dom.overlayCanvas
      );

    } else {

      dom.canvasStage.appendChild(
        previewCanvas
      );

    }


    dom.previewCanvas =
      previewCanvas;


    rendererState.canvasInstalled =
      true;


    synchronisePreviewCanvas();


    return true;

  }


  function synchronisePreviewCanvas() {

    if (
      !dom.previewCanvas ||
      !dom.editorCanvas
    ) {

      return false;

    }


    const width =
      Math.max(
        1,
        dom.editorCanvas.width
      );


    const height =
      Math.max(
        1,
        dom.editorCanvas.height
      );


    if (
      dom.previewCanvas.width !==
      width
    ) {

      dom.previewCanvas.width =
        width;

    }


    if (
      dom.previewCanvas.height !==
      height
    ) {

      dom.previewCanvas.height =
        height;

    }


    /*
     * Match any inline dimensions or transforms used by the
     * existing Paintless canvas.
     */

    const editorStyle =
      window.getComputedStyle(
        dom.editorCanvas
      );


    dom.previewCanvas.style.width =
      editorStyle.width;


    dom.previewCanvas.style.height =
      editorStyle.height;


    dom.previewCanvas.style.transform =
      editorStyle.transform ===
        "none"
        ? ""
        : editorStyle.transform;


    dom.previewCanvas.style.transformOrigin =
      editorStyle.transformOrigin;


    dom.previewCanvas.style.borderRadius =
      editorStyle.borderRadius;


    dom.previewCanvas.style.opacity =
      String(
        rendererState.previewOpacity
      );


    return true;

  }


  /* =======================================================
     12. INTERNAL RENDER TARGETS
  ======================================================= */

  function resizeCanvas(
    canvas,
    width,
    height
  ) {

    if (!canvas) {

      return false;

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


    return true;

  }


  function ensureInternalCanvases(
    width,
    height
  ) {

    if (!internal.leftCanvas) {

      internal.leftCanvas =
        createCanvas(
          width,
          height
        );


      internal.leftContext =
        getCanvasContext(
          internal.leftCanvas,
          {
            willReadFrequently:
              true
          }
        );

    }


    if (!internal.rightCanvas) {

      internal.rightCanvas =
        createCanvas(
          width,
          height
        );


      internal.rightContext =
        getCanvasContext(
          internal.rightCanvas,
          {
            willReadFrequently:
              true
          }
        );

    }


    if (!internal.combinedCanvas) {

      internal.combinedCanvas =
        createCanvas(
          width,
          height
        );


      internal.combinedContext =
        getCanvasContext(
          internal.combinedCanvas,
          {
            willReadFrequently:
              true
          }
        );

    }


    if (!internal.temporaryCanvas) {

      internal.temporaryCanvas =
        createCanvas(
          width,
          height
        );


      internal.temporaryContext =
        getCanvasContext(
          internal.temporaryCanvas
        );

    }


    [
      internal.leftCanvas,
      internal.rightCanvas,
      internal.combinedCanvas,
      internal.temporaryCanvas
    ].forEach(
      (canvas) => {

        resizeCanvas(
          canvas,
          width,
          height
        );

      }
    );


    return Boolean(
      internal.leftContext &&
      internal.rightContext &&
      internal.combinedContext &&
      internal.temporaryContext
    );

  }


  function clearContext(
    context,
    width,
    height
  ) {

    if (!context) {

      return;

    }


    context.save();


    context.setTransform(
      1,
      0,
      0,
      1,
      0,
      0
    );


    context.globalAlpha =
      1;


    context.globalCompositeOperation =
      "source-over";


    context.clearRect(
      0,
      0,
      width,
      height
    );


    context.restore();

  }


  /* =======================================================
     13. EYE RENDERING
  ======================================================= */

  function drawLayerToEye(
    context,
    layer,
    offsetX,
    width,
    height
  ) {

    const layerCanvas =
      getLayerCanvas(
        layer
      );


    if (
      !context ||
      !layerCanvas
    ) {

      return false;

    }


    const opacity =
      getLayerOpacity(
        layer
      );


    if (
      opacity <=
      0
    ) {

      return false;

    }


    const blendMode =
      getLayerBlendMode(
        layer
      );


    context.save();


    context.globalAlpha =
      opacity;


    context.globalCompositeOperation =
      blendMode;


    /*
     * Paintless layers normally use document-sized canvases.
     * Scaling here also supports imported layers whose backing
     * canvas dimensions differ from the current document.
     */

    context.drawImage(
      layerCanvas,
      offsetX,
      0,
      width,
      height
    );


    context.restore();


    return true;

  }


  function renderEyeCanvases(
    layers,
    width,
    height
  ) {

    clearContext(
      internal.leftContext,
      width,
      height
    );


    clearContext(
      internal.rightContext,
      width,
      height
    );


    if (
      rendererState.backgroundColour
    ) {

      [
        internal.leftContext,
        internal.rightContext
      ].forEach(
        (context) => {

          context.save();


          context.fillStyle =
            rendererState.backgroundColour;


          context.fillRect(
            0,
            0,
            width,
            height
          );


          context.restore();

        }
      );

    }


    layers.forEach(
      (layer) => {

        const offsets =
          calculateEyeOffsets(
            layer,
            width
          );


        drawLayerToEye(
          internal.leftContext,
          layer,
          offsets.leftOffset,
          width,
          height
        );


        drawLayerToEye(
          internal.rightContext,
          layer,
          offsets.rightOffset,
          width,
          height
        );

      }
    );


    return true;

  }


  /* =======================================================
     14. CHANNEL COMBINATION
  ======================================================= */

  function getCombinedAlpha(
    leftAlpha,
    rightAlpha
  ) {

    if (
      rendererState.alphaMode ===
      "average"
    ) {

      return Math.round(
        (
          leftAlpha +
          rightAlpha
        ) /
        2
      );

    }


    if (
      rendererState.alphaMode ===
      "left"
    ) {

      return leftAlpha;

    }


    if (
      rendererState.alphaMode ===
      "right"
    ) {

      return rightAlpha;

    }


    return Math.max(
      leftAlpha,
      rightAlpha
    );

  }


  function reduceGhosting(
    value,
    opposingValue,
    amount
  ) {

    if (
      amount <=
      0
    ) {

      return value;

    }


    const reduction =
      amount /
      100;


    const contamination =
      opposingValue *
      reduction *
      0.28;


    return clamp(
      Math.round(
        value -
        contamination
      ),
      0,
      255
    );

  }


  function combineRedCyan(
    left,
    right,
    output,
    index,
    ghostReduction
  ) {

    const leftLuminance =
      (
        left[
          index
        ] *
          0.299 +
        left[
          index +
          1
        ] *
          0.587 +
        left[
          index +
          2
        ] *
          0.114
      );


    output[
      index
    ] =
      reduceGhosting(
        Math.round(
          leftLuminance
        ),
        right[
          index
        ],
        ghostReduction
      );


    output[
      index +
      1
    ] =
      reduceGhosting(
        right[
          index +
          1
        ],
        left[
          index +
          1
        ],
        ghostReduction
      );


    output[
      index +
      2
    ] =
      reduceGhosting(
        right[
          index +
          2
        ],
        left[
          index +
          2
        ],
        ghostReduction
      );

  }


  function combineRedBlue(
    left,
    right,
    output,
    index,
    ghostReduction
  ) {

    const leftLuminance =
      (
        left[
          index
        ] *
          0.299 +
        left[
          index +
          1
        ] *
          0.587 +
        left[
          index +
          2
        ] *
          0.114
      );


    const rightLuminance =
      (
        right[
          index
        ] *
          0.299 +
        right[
          index +
          1
        ] *
          0.587 +
        right[
          index +
          2
        ] *
          0.114
      );


    output[
      index
    ] =
      reduceGhosting(
        Math.round(
          leftLuminance
        ),
        right[
          index
        ],
        ghostReduction
      );


    output[
      index +
      1
    ] =
      0;


    output[
      index +
      2
    ] =
      reduceGhosting(
        Math.round(
          rightLuminance
        ),
        left[
          index +
          2
        ],
        ghostReduction
      );

  }


  function combineGreenMagenta(
    left,
    right,
    output,
    index,
    ghostReduction
  ) {

    output[
      index
    ] =
      reduceGhosting(
        right[
          index
        ],
        left[
          index
        ],
        ghostReduction
      );


    output[
      index +
      1
    ] =
      reduceGhosting(
        left[
          index +
          1
        ],
        right[
          index +
          1
        ],
        ghostReduction
      );


    output[
      index +
      2
    ] =
      reduceGhosting(
        right[
          index +
          2
        ],
        left[
          index +
          2
        ],
        ghostReduction
      );

  }


  function combineEyeCanvases(
    width,
    height
  ) {

    const settings =
      getStereoSettings();


    let leftImageData;
    let rightImageData;


    try {

      leftImageData =
        internal.leftContext
          .getImageData(
            0,
            0,
            width,
            height
          );


      rightImageData =
        internal.rightContext
          .getImageData(
            0,
            0,
            width,
            height
          );

    } catch (error) {

      throw new Error(
        `Paintless3D could not read canvas pixels: ${error.message}`
      );

    }


    const outputImageData =
      internal.combinedContext
        .createImageData(
          width,
          height
        );


    const left =
      leftImageData.data;


    const right =
      rightImageData.data;


    const output =
      outputImageData.data;


    for (
      let index = 0;
      index < output.length;
      index += 4
    ) {

      if (
        settings.channelMode ===
        "red-blue"
      ) {

        combineRedBlue(
          left,
          right,
          output,
          index,
          settings.ghostReduction
        );

      } else if (
        settings.channelMode ===
        "green-magenta"
      ) {

        combineGreenMagenta(
          left,
          right,
          output,
          index,
          settings.ghostReduction
        );

      } else {

        combineRedCyan(
          left,
          right,
          output,
          index,
          settings.ghostReduction
        );

      }


      output[
        index +
        3
      ] =
        getCombinedAlpha(
          left[
            index +
            3
          ],
          right[
            index +
            3
          ]
        );

    }


    internal.combinedContext
      .putImageData(
        outputImageData,
        0,
        0
      );


    return internal.combinedCanvas;

  }


  /* =======================================================
     15. COMPLETE RENDER
  ======================================================= */

  function validateRenderSize(
    width,
    height
  ) {

    const pixelCount =
      width *
      height;


    if (
      pixelCount >
      rendererState.maximumPreviewPixels
    ) {

      console.warn(
        `Paintless3D is rendering a large document: ${width} × ${height}`
      );

    }


    return true;

  }


  function renderToCanvas(
    {
      width =
        null,

      height =
        null,

      targetCanvas =
        null,

      reason =
        "manual"
    } = {}
  ) {

    const documentSize =
      getDocumentSize();


    const renderWidth =
      Math.max(
        1,
        Math.round(
          width ||
          documentSize.width
        )
      );


    const renderHeight =
      Math.max(
        1,
        Math.round(
          height ||
          documentSize.height
        )
      );


    validateRenderSize(
      renderWidth,
      renderHeight
    );


    const layers =
      getRenderableLayers();


    ensureInternalCanvases(
      renderWidth,
      renderHeight
    );


    renderEyeCanvases(
      layers,
      renderWidth,
      renderHeight
    );


    const combinedCanvas =
      combineEyeCanvases(
        renderWidth,
        renderHeight
      );


    if (!targetCanvas) {

      return combinedCanvas;

    }


    resizeCanvas(
      targetCanvas,
      renderWidth,
      renderHeight
    );


    const targetContext =
      getCanvasContext(
        targetCanvas
      );


    clearContext(
      targetContext,
      renderWidth,
      renderHeight
    );


    targetContext.drawImage(
      combinedCanvas,
      0,
      0,
      renderWidth,
      renderHeight
    );


    rendererState.lastRenderReason =
      reason;


    return targetCanvas;

  }


  function renderPreview(
    reason =
      "manual"
  ) {

    if (
      !rendererState.initialised ||
      !rendererState.enabled ||
      !paintless3d.is3DMode?.()
    ) {

      return false;

    }


    if (
      rendererState.rendering
    ) {

      rendererState.renderQueued =
        true;


      return false;

    }


    rendererState.rendering =
      true;


    rendererState.renderQueued =
      false;


    rendererState.lastError =
      null;


    document.body
      ?.classList.add(
        "paintless3d-rendering"
      );


    const startedAt =
      performance.now();


    try {

      synchronisePreviewCanvas();


      const size =
        getDocumentSize();


      renderToCanvas(
        {
          width:
            size.width,

          height:
            size.height,

          targetCanvas:
            dom.previewCanvas,

          reason
        }
      );


      rendererState.renderCount +=
        1;


      rendererState.lastWidth =
        size.width;


      rendererState.lastHeight =
        size.height;


      rendererState.lastRenderDuration =
        performance.now() -
        startedAt;


      dispatch(
        "paintless3d:render-completed",
        {
          reason,

          canvas:
            dom.previewCanvas,

          width:
            size.width,

          height:
            size.height,

          duration:
            rendererState.lastRenderDuration,

          renderCount:
            rendererState.renderCount,

          layers:
            getRenderableLayers().length
        }
      );


      return true;

    } catch (error) {

      rendererState.lastError =
        error;


      console.error(
        "Paintless3D render failed:",
        error
      );


      dispatch(
        "paintless3d:render-failed",
        {
          reason,

          error
        }
      );


      sendStatusMessage(
        "Paintless3D could not render this preview."
      );


      return false;

    } finally {

      rendererState.rendering =
        false;


      document.body
        ?.classList.remove(
          "paintless3d-rendering"
        );


      if (
        rendererState.renderQueued
      ) {

        rendererState.renderQueued =
          false;


        requestRender(
          "queued-render"
        );

      }

    }

  }


  function requestRender(
    reason =
      "requested"
  ) {

    rendererState.lastRenderReason =
      reason;


    if (
      !rendererState.automaticRendering ||
      !rendererState.enabled
    ) {

      return false;

    }


    if (
      rendererState.renderFrame !==
      null
    ) {

      window.cancelAnimationFrame(
        rendererState.renderFrame
      );

    }


    rendererState.renderFrame =
      window.requestAnimationFrame(
        () => {

          rendererState.renderFrame =
            null;


          renderPreview(
            reason
          );

        }
      );


    return true;

  }


  /* =======================================================
     16. PREVIEW ENABLE / DISABLE
  ======================================================= */

  function showPreview() {

    if (
      !dom.previewCanvas
    ) {

      return false;

    }


    rendererState.enabled =
      true;


    document.body
      ?.classList.add(
        "paintless3d-preview-active"
      );


    if (
      rendererState.hideOriginalDuringPreview
    ) {

      dom.editorCanvas
        ?.classList.add(
          "paintless3d-original-hidden"
        );

    }


    synchronisePreviewCanvas();


    requestRender(
      "preview-enabled"
    );


    return true;

  }


  function hidePreview() {

    rendererState.enabled =
      false;


    document.body
      ?.classList.remove(
        "paintless3d-preview-active"
      );


    dom.editorCanvas
      ?.classList.remove(
        "paintless3d-original-hidden"
      );


    if (
      rendererState.renderFrame !==
      null
    ) {

      window.cancelAnimationFrame(
        rendererState.renderFrame
      );


      rendererState.renderFrame =
        null;

    }


    return true;

  }


  function setEnabled(
    enabled
  ) {

    return Boolean(
      enabled
    )
      ? showPreview()
      : hidePreview();

  }


  /* =======================================================
     17. OBSERVERS
  ======================================================= */

  function installResizeObserver() {

    if (
      rendererState.resizeObserverInstalled ||
      typeof ResizeObserver !==
        "function" ||
      !dom.editorCanvas
    ) {

      return false;

    }


    internal.resizeObserver =
      new ResizeObserver(
        () => {

          synchronisePreviewCanvas();


          requestRender(
            "canvas-resized"
          );

        }
      );


    internal.resizeObserver.observe(
      dom.editorCanvas
    );


    if (
      dom.canvasStage
    ) {

      internal.resizeObserver.observe(
        dom.canvasStage
      );

    }


    rendererState.resizeObserverInstalled =
      true;


    return true;

  }


  function installMutationObserver() {

    if (
      rendererState.mutationObserverInstalled ||
      typeof MutationObserver !==
        "function" ||
      !dom.editorCanvas
    ) {

      return false;

    }


    internal.mutationObserver =
      new MutationObserver(
        () => {

          synchronisePreviewCanvas();

        }
      );


    internal.mutationObserver.observe(
      dom.editorCanvas,
      {
        attributes:
          true,

        attributeFilter:
          [
            "style",
            "class",
            "width",
            "height"
          ]
      }
    );


    rendererState.mutationObserverInstalled =
      true;


    return true;

  }


  function removeObservers() {

    internal.resizeObserver
      ?.disconnect();


    internal.mutationObserver
      ?.disconnect();


    internal.resizeObserver =
      null;


    internal.mutationObserver =
      null;


    rendererState.resizeObserverInstalled =
      false;


    rendererState.mutationObserverInstalled =
      false;

  }


  /* =======================================================
     18. EVENT HANDLERS
  ======================================================= */

  function handlePreviewChanged(
    event
  ) {

    setEnabled(
      event.detail?.enabled
    );

  }


  function handleModeChanged(
    event
  ) {

    if (
      event.detail?.mode !==
      "3d"
    ) {

      hidePreview();


      return;

    }


    if (
      getCoreApi()
        ?.isPreviewEnabled?.()
    ) {

      showPreview();

    }

  }


  function handleRenderRequested(
    event
  ) {

    requestRender(
      event.detail?.reason ||
      "external-request"
    );

  }


  function handleDepthChanged() {

    requestRender(
      "depth-changed"
    );

  }


  function handleStereoSettingChanged(
    event
  ) {

    requestRender(
      event.type
    );

  }


  function handleLayerChanged(
    event
  ) {

    requestRender(
      event.type
    );

  }


  function handleDocumentChanged(
    event
  ) {

    synchronisePreviewCanvas();


    requestRender(
      event.type
    );

  }


  function connectEvents() {

    document.addEventListener(
      "paintless3d:preview-changed",
      handlePreviewChanged
    );


    document.addEventListener(
      "paintless3d:mode-changed",
      handleModeChanged
    );


    document.addEventListener(
      "paintless3d:render-requested",
      handleRenderRequested
    );


    document.addEventListener(
      "paintless3d:layer-depth-changed",
      handleDepthChanged
    );


    [
      "paintless3d:strength-changed",
      "paintless3d:convergence-changed",
      "paintless3d:channel-mode-changed",
      "paintless3d:swap-eyes-changed",
      "paintless3d:ghost-reduction-changed"
    ].forEach(
      (eventName) => {

        document.addEventListener(
          eventName,
          handleStereoSettingChanged
        );

      }
    );


    [
      "paintless:layer-created",
      "paintless:layer-added",
      "paintless:layer-removed",
      "paintless:layer-deleted",
      "paintless:layer-duplicated",
      "paintless:layer-reordered",
      "paintless:layer-visibility-changed",
      "paintless:layer-opacity-changed",
      "paintless:layer-blend-mode-changed",
      "paintless:history-saved"
    ].forEach(
      (eventName) => {

        document.addEventListener(
          eventName,
          handleLayerChanged
        );

      }
    );


    [
      "paintless:history-restored",
      "paintless:document-reset",
      "paintless:document-resized",
      "paintless:canvas-rendered",
      "paintless:artwork-changed",
      "paintless:stroke-completed",
      "paintless:text-committed",
      "paintless:shape-committed",
      "paintless:fill-completed"
    ].forEach(
      (eventName) => {

        document.addEventListener(
          eventName,
          handleDocumentChanged
        );

      }
    );

  }


  function disconnectEvents() {

    document.removeEventListener(
      "paintless3d:preview-changed",
      handlePreviewChanged
    );


    document.removeEventListener(
      "paintless3d:mode-changed",
      handleModeChanged
    );


    document.removeEventListener(
      "paintless3d:render-requested",
      handleRenderRequested
    );


    document.removeEventListener(
      "paintless3d:layer-depth-changed",
      handleDepthChanged
    );


    [
      "paintless3d:strength-changed",
      "paintless3d:convergence-changed",
      "paintless3d:channel-mode-changed",
      "paintless3d:swap-eyes-changed",
      "paintless3d:ghost-reduction-changed"
    ].forEach(
      (eventName) => {

        document.removeEventListener(
          eventName,
          handleStereoSettingChanged
        );

      }
    );


    [
      "paintless:layer-created",
      "paintless:layer-added",
      "paintless:layer-removed",
      "paintless:layer-deleted",
      "paintless:layer-duplicated",
      "paintless:layer-reordered",
      "paintless:layer-visibility-changed",
      "paintless:layer-opacity-changed",
      "paintless:layer-blend-mode-changed",
      "paintless:history-saved"
    ].forEach(
      (eventName) => {

        document.removeEventListener(
          eventName,
          handleLayerChanged
        );

      }
    );


    [
      "paintless:history-restored",
      "paintless:document-reset",
      "paintless:document-resized",
      "paintless:canvas-rendered",
      "paintless:artwork-changed",
      "paintless:stroke-completed",
      "paintless:text-committed",
      "paintless:shape-committed",
      "paintless:fill-completed"
    ].forEach(
      (eventName) => {

        document.removeEventListener(
          eventName,
          handleDocumentChanged
        );

      }
    );

  }


  /* =======================================================
     19. INITIALISATION
  ======================================================= */

  async function initialise() {

    if (
      rendererState.initialised
    ) {

      return true;

    }


    collectDomReferences();


    if (
      !dom.editorCanvas ||
      !dom.canvasStage
    ) {

      throw new Error(
        "Paintless3D Renderer could not find the Paintless canvas."
      );

    }


    installStyles();


    const previewInstalled =
      installPreviewCanvas();


    if (!previewInstalled) {

      throw new Error(
        "Paintless3D Renderer could not install its preview canvas."
      );

    }


    ensureInternalCanvases(
      dom.editorCanvas.width,
      dom.editorCanvas.height
    );


    connectEvents();


    installResizeObserver();

    installMutationObserver();


    rendererState.initialised =
      true;


    rendererState.destroyed =
      false;


    getModeApi()
      ?.updateModuleReadiness?.(
        "renderer",
        true
      );


    dispatch(
      "paintless3d:renderer-ready",
      {
        renderer:
          publicApi
      }
    );


    console.log(
      "%cPaintless3D Renderer ready.",
      [
        "color:#ff315c",
        "font-weight:bold",
        "font-size:14px",
        "text-shadow:2px 0 #25e6ff"
      ].join(";")
    );


    return true;

  }


  /* =======================================================
     20. DESTROY
  ======================================================= */

  async function destroy() {

    hidePreview();


    disconnectEvents();


    removeObservers();


    dom.previewCanvas
      ?.remove();


    dom.styles
      ?.remove();


    internal.leftCanvas =
      null;


    internal.leftContext =
      null;


    internal.rightCanvas =
      null;


    internal.rightContext =
      null;


    internal.combinedCanvas =
      null;


    internal.combinedContext =
      null;


    internal.temporaryCanvas =
      null;


    internal.temporaryContext =
      null;


    rendererState.initialised =
      false;


    rendererState.destroyed =
      true;


    rendererState.canvasInstalled =
      false;


    rendererState.stylesInstalled =
      false;


    getModeApi()
      ?.updateModuleReadiness?.(
        "renderer",
        false
      );


    dispatch(
      "paintless3d:renderer-destroyed"
    );


    return true;

  }


  /* =======================================================
     21. PUBLIC API
  ======================================================= */

  const publicApi = {

    state:
      rendererState,

    dom,

    internal,


    initialise,

    destroy,


    renderPreview,

    requestRender,

    renderToCanvas,


    showPreview,

    hidePreview,

    setEnabled,


    synchronisePreviewCanvas,

    calculateLayerSeparation,

    calculateEyeOffsets,


    getLayers,

    getRenderableLayers,

    getLayerDepth,

    getStereoSettings,


    getPreviewCanvas() {

      return dom.previewCanvas;

    },


    getCombinedCanvas() {

      return internal.combinedCanvas;

    },


    getLeftEyeCanvas() {

      return internal.leftCanvas;

    },


    getRightEyeCanvas() {

      return internal.rightCanvas;

    },


    setAutomaticRendering(
      enabled
    ) {

      rendererState.automaticRendering =
        Boolean(
          enabled
        );


      return rendererState
        .automaticRendering;

    },


    setHideOriginalDuringPreview(
      enabled
    ) {

      rendererState
        .hideOriginalDuringPreview =
        Boolean(
          enabled
        );


      if (
        rendererState.enabled
      ) {

        dom.editorCanvas
          ?.classList.toggle(
            "paintless3d-original-hidden",
            rendererState
              .hideOriginalDuringPreview
          );

      }


      return rendererState
        .hideOriginalDuringPreview;

    },


    setDepthScale(
      value
    ) {

      rendererState.depthScale =
        clamp(
          value,
          0,
          5
        );


      requestRender(
        "depth-scale-changed"
      );


      return rendererState.depthScale;

    },


    setPreviewOpacity(
      value
    ) {

      rendererState.previewOpacity =
        clamp(
          value,
          0,
          1
        );


      if (
        dom.previewCanvas
      ) {

        dom.previewCanvas.style.opacity =
          String(
            rendererState.previewOpacity
          );

      }


      return rendererState.previewOpacity;

    },


    setBackgroundColour(
      colour
    ) {

      rendererState.backgroundColour =
        colour ||
        null;


      requestRender(
        "background-colour-changed"
      );


      return rendererState
        .backgroundColour;

    },


    setAlphaMode(
      mode
    ) {

      const safeMode =
        String(
          mode ||
          ""
        ).toLowerCase();


      if (
        ![
          "maximum",
          "average",
          "left",
          "right"
        ].includes(
          safeMode
        )
      ) {

        return false;

      }


      rendererState.alphaMode =
        safeMode;


      requestRender(
        "alpha-mode-changed"
      );


      return rendererState.alphaMode;

    },


    isEnabled() {

      return rendererState.enabled;

    },


    isRendering() {

      return rendererState.rendering;

    },


    isInitialised() {

      return rendererState.initialised;

    },


    getStatistics() {

      return {

        renderCount:
          rendererState.renderCount,

        lastRenderReason:
          rendererState.lastRenderReason,

        lastRenderDuration:
          rendererState.lastRenderDuration,

        lastWidth:
          rendererState.lastWidth,

        lastHeight:
          rendererState.lastHeight,

        lastError:
          rendererState.lastError,

        enabled:
          rendererState.enabled,

        rendering:
          rendererState.rendering

      };

    }

  };


  window.Paintless3DRenderer =
    publicApi;


  /* =======================================================
     22. REGISTER MODULE
  ======================================================= */

  paintless3d.registerModule(
    "renderer",
    {

      label:
        "Paintless3D Anaglyph Renderer",

      initialised:
        false,

      initialise,

      destroy,

      api:
        publicApi

    }
  );

})();
