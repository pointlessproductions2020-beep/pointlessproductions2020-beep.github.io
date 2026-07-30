"use strict";

/* =========================================================
   PAINTLESS3D
   LIVE ANAGLYPH RENDERER — v0.2

   File:
   js/paintless3d/renderer.js

   New behaviour:
   - Entering 3D mode automatically enables live rendering
   - No Preview on/off requirement
   - Original Paintless tools remain interactive
   - The preview canvas never receives pointer input
   - The overlay canvas always remains above the renderer
   - Flat layers remain on the screen plane
   - Only stereo3dEnabled layers use their depth3d value
   - Layer changes and painting automatically refresh
   - Full-resolution export remains supported
========================================================= */

(() => {

  /* =======================================================
     1. SYSTEM CHECK
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
     2. STATE
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

    animationFrame:
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

    liveRendering:
      true,

    previewOpacity:
      1,

    depthScale:
      1,

    alphaMode:
      "maximum",

    maximumPreviewPixels:
      24000000,

    backgroundColour:
      null,

    renderDebounce:
      0

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
     4. INTERNAL RENDER TARGETS
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
    width = 1,
    height = 1
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
      willReadFrequently = false
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


  function resizeCanvas(
    canvas,
    width,
    height
  ) {

    if (!canvas) {

      return false;

    }


    const safeWidth =
      Math.max(
        1,
        Math.round(
          width
        )
      );


    const safeHeight =
      Math.max(
        1,
        Math.round(
          height
        )
      );


    if (
      canvas.width !==
      safeWidth
    ) {

      canvas.width =
        safeWidth;

    }


    if (
      canvas.height !==
      safeHeight
    ) {

      canvas.height =
        safeHeight;

    }


    return true;

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
     7. DOCUMENT AND LAYER ACCESS
  ======================================================= */

  function getDocumentSize() {

    const layersApi =
      getLayersApi();


    const size =
      layersApi
        ?.getDocumentSize?.();


    return {

      width:
        Math.max(
          1,
          Math.round(
            Number(
              size?.width
            ) ||
            dom.editorCanvas?.width ||
            1
          )
        ),

      height:
        Math.max(
          1,
          Math.round(
            Number(
              size?.height
            ) ||
            dom.editorCanvas?.height ||
            1
          )
        )

    };

  }


  function getLayers() {

    const layersApi =
      getLayersApi();


    if (
      Array.isArray(
        layersApi?.layers
      )
    ) {

      return layersApi.layers;

    }


    if (
      typeof layersApi?.getLayers ===
      "function"
    ) {

      const result =
        layersApi.getLayers();


      if (
        Array.isArray(
          result
        )
      ) {

        return result;

      }

    }


    return [];

  }


  function layerIsVisible(
    layer
  ) {

    return Boolean(
      layer &&
      layer.visible !==
        false &&
      layer.hidden !==
        true &&
      getLayerOpacity(
        layer
      ) >
        0
    );

  }


  function getLayerOpacity(
    layer
  ) {

    const value =
      Number(
        layer?.opacity
      );


    if (
      !Number.isFinite(
        value
      )
    ) {

      return 1;

    }


    return value >
      1
      ? clamp(
          value /
          100,
          0,
          1
        )
      : clamp(
          value,
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
          "lighter",
          "copy"
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


    return null;

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


  function layerStereoIsEnabled(
    layer
  ) {

    return Boolean(
      layer?.stereo3dEnabled
    );

  }


  function getLayerDepth(
    layer
  ) {

    if (
      !layerStereoIsEnabled(
        layer
      )
    ) {

      return 0;

    }


    const depth =
      Number(
        layer?.depth3d
      );


    return Number.isFinite(
      depth
    )
      ? clamp(
          depth,
          -300,
          300
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

    if (
      !layerStereoIsEnabled(
        layer
      )
    ) {

      return 0;

    }


    const depth =
      getLayerDepth(
        layer
      );


    const settings =
      getStereoSettings();


    const maximumComfortableOffset =
      Math.max(
        1,
        width *
        0.20
      );


    const strengthRatio =
      settings.strength /
      100;


    const convergenceDepth =
      depth -
      settings.convergence;


    const depthRatio =
      convergenceDepth /
      100;


    return clamp(
      maximumComfortableOffset *
      strengthRatio *
      depthRatio *
      rendererState.depthScale,
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


    let leftOffset =
      -separation /
      2;


    let rightOffset =
      separation /
      2;


    if (
      getStereoSettings()
        .swapEyes
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
        "paintless3d-live-renderer-styles"
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
      "paintless3d-live-renderer-styles";


    style.textContent = `
      #canvas-stage,
      .canvas-stage {
        position: relative;
        isolation: isolate;
      }

      #editor-canvas {
        position: relative;
        z-index: 2;
      }

      #paintless3d-preview-canvas {
        position: absolute;
        left: 0;
        top: 0;
        display: none;
        margin: 0;
        padding: 0;
        border: 0;
        opacity: 1;
        pointer-events: none !important;
        touch-action: none;
        user-select: none;
        image-rendering: auto;
        z-index: 6;
      }

      #overlay-canvas {
        position: absolute;
        z-index: 20 !important;
        pointer-events: none !important;
        touch-action: none;
      }

      html[data-paintless-mode="3d"]
      #paintless3d-preview-canvas,
      body.paintless-3d-mode
      #paintless3d-preview-canvas,
      body.paintless3d-editor-active
      #paintless3d-preview-canvas {
        display: block;
      }

      html[data-paintless-mode="3d"]
      #editor-canvas,
      body.paintless-3d-mode
      #editor-canvas,
      body.paintless3d-editor-active
      #editor-canvas {
        opacity: 0;
        visibility: visible;
        pointer-events: auto;
      }

      html[data-paintless-mode="2d"]
      #editor-canvas,
      body:not(.paintless-3d-mode)
      #editor-canvas {
        opacity: 1;
      }

      html[data-paintless-mode="3d"]
      #paintless3d-preview-canvas {
        box-shadow:
          -4px 0 18px rgba(255, 49, 92, 0.13),
          4px 0 18px rgba(37, 230, 255, 0.13);
      }

      body.paintless3d-rendering
      #paintless3d-preview-canvas {
        filter: brightness(0.99);
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
      "live-anaglyph";


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


    resizeCanvas(
      dom.previewCanvas,
      dom.editorCanvas.width,
      dom.editorCanvas.height
    );


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


    if (dom.overlayCanvas) {

      dom.overlayCanvas.style.zIndex =
        "20";


      dom.overlayCanvas.style.pointerEvents =
  "none";

    }


    return true;

  }


  /* =======================================================
     12. INTERNAL CANVASES
  ======================================================= */

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


    resizeCanvas(
      internal.leftCanvas,
      width,
      height
    );


    resizeCanvas(
      internal.rightCanvas,
      width,
      height
    );


    resizeCanvas(
      internal.combinedCanvas,
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


    internal.rightContext =
      getCanvasContext(
        internal.rightCanvas,
        {
          willReadFrequently:
            true
        }
      );


    internal.combinedContext =
      getCanvasContext(
        internal.combinedCanvas,
        {
          willReadFrequently:
            true
        }
      );


    return Boolean(
      internal.leftContext &&
      internal.rightContext &&
      internal.combinedContext
    );

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


    context.save();


    context.globalAlpha =
      opacity;


    context.globalCompositeOperation =
      getLayerBlendMode(
        layer
      );


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


    return clamp(
      Math.round(
        value -
        opposingValue *
        reduction *
        0.28
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
        left[index] *
          0.299 +
        left[index + 1] *
          0.587 +
        left[index + 2] *
          0.114
      );


    output[index] =
      reduceGhosting(
        Math.round(
          leftLuminance
        ),
        right[index],
        ghostReduction
      );


    output[index + 1] =
      reduceGhosting(
        right[index + 1],
        left[index + 1],
        ghostReduction
      );


    output[index + 2] =
      reduceGhosting(
        right[index + 2],
        left[index + 2],
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
        left[index] *
          0.299 +
        left[index + 1] *
          0.587 +
        left[index + 2] *
          0.114
      );


    const rightLuminance =
      (
        right[index] *
          0.299 +
        right[index + 1] *
          0.587 +
        right[index + 2] *
          0.114
      );


    output[index] =
      reduceGhosting(
        Math.round(
          leftLuminance
        ),
        right[index],
        ghostReduction
      );


    output[index + 1] =
      0;


    output[index + 2] =
      reduceGhosting(
        Math.round(
          rightLuminance
        ),
        left[index + 2],
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

    output[index] =
      reduceGhosting(
        right[index],
        left[index],
        ghostReduction
      );


    output[index + 1] =
      reduceGhosting(
        left[index + 1],
        right[index + 1],
        ghostReduction
      );


    output[index + 2] =
      reduceGhosting(
        right[index + 2],
        left[index + 2],
        ghostReduction
      );

  }


  function combineEyeCanvases(
    width,
    height
  ) {

    const settings =
      getStereoSettings();


    const leftImageData =
      internal.leftContext
        .getImageData(
          0,
          0,
          width,
          height
        );


    const rightImageData =
      internal.rightContext
        .getImageData(
          0,
          0,
          width,
          height
        );


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


      output[index + 3] =
        getCombinedAlpha(
          left[index + 3],
          right[index + 3]
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
     15. FULL RENDER
  ======================================================= */

  function renderToCanvas({
    width = null,
    height = null,
    targetCanvas = null,
    reason = "manual"
  } = {}) {

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


    const pixelCount =
      renderWidth *
      renderHeight;


    if (
      pixelCount >
      rendererState.maximumPreviewPixels
    ) {

      console.warn(
        `Paintless3D is rendering a large image: ${renderWidth} × ${renderHeight}`
      );

    }


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


    rendererState.lastRenderReason =
      reason;


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


    return targetCanvas;

  }


  function renderLive(
    reason = "live-render"
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


      rendererState.lastRenderReason =
        reason;


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
        "Paintless3D live render failed:",
        error
      );


      dispatch(
        "paintless3d:render-failed",
        {
          reason,

          error
        }
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
    reason = "requested"
  ) {

    rendererState.lastRenderReason =
      reason;


    if (
      !rendererState.automaticRendering ||
      !rendererState.enabled ||
      !paintless3d.is3DMode?.()
    ) {

      return false;

    }


    if (
      rendererState.animationFrame !==
      null
    ) {

      window.cancelAnimationFrame(
        rendererState.animationFrame
      );

    }


    rendererState.animationFrame =
      window.requestAnimationFrame(
        () => {

          rendererState.animationFrame =
            null;


          renderLive(
            reason
          );

        }
      );


    return true;

  }


  /* =======================================================
     16. ENABLE AND DISABLE
  ======================================================= */

  function enableLiveRendering({
    announce = false
  } = {}) {

    rendererState.enabled =
      true;


    document.body
      ?.classList.add(
        "paintless3d-live-rendering"
      );


    synchronisePreviewCanvas();


    requestRender(
      "3d-mode-enabled"
    );


    if (announce) {

      sendStatusMessage(
        "Live Paintless3D rendering enabled."
      );

    }


    dispatch(
      "paintless3d:live-rendering-changed",
      {
        enabled:
          true
      }
    );


    return true;

  }


  function disableLiveRendering({
    announce = false
  } = {}) {

    rendererState.enabled =
      false;


    document.body
      ?.classList.remove(
        "paintless3d-live-rendering",
        "paintless3d-rendering"
      );


    if (
      rendererState.animationFrame !==
      null
    ) {

      window.cancelAnimationFrame(
        rendererState.animationFrame
      );


      rendererState.animationFrame =
        null;

    }


    if (announce) {

      sendStatusMessage(
        "Paintless returned to normal 2D rendering."
      );

    }


    dispatch(
      "paintless3d:live-rendering-changed",
      {
        enabled:
          false
      }
    );


    return true;

  }


  function setEnabled(
    enabled
  ) {

    return enabled
      ? enableLiveRendering()
      : disableLiveRendering();

  }


  function showPreview() {

    return enableLiveRendering();

  }


  function hidePreview() {

    /*
     * The old Preview button must no longer disable the
     * renderer while Paintless remains in 3D mode.
     */

    if (
      paintless3d.is3DMode?.()
    ) {

      return true;

    }


    return disableLiveRendering();

  }


  /* =======================================================
     17. OBSERVERS
  ======================================================= */

  function installResizeObserver() {

    if (
      rendererState.resizeObserverInstalled ||
      typeof ResizeObserver !==
        "function" ||
      !dom.canvasStage
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
      dom.canvasStage
    );


    if (dom.editorCanvas) {

      internal.resizeObserver.observe(
        dom.editorCanvas
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

  function handleModeChanged(
    event
  ) {

    if (
      event.detail?.mode ===
      "3d"
    ) {

      enableLiveRendering({
        announce:
          false
      });

    } else {

      disableLiveRendering({
        announce:
          false
      });

    }

  }


  function handlePreviewChanged() {

    /*
     * Preview is now permanently live in 3D mode.
     * The Preview control will later become a settings button.
     */

    if (
      paintless3d.is3DMode?.()
    ) {

      enableLiveRendering();

    }

  }


  function handleRenderRequested(
    event
  ) {

    requestRender(
      event.detail?.reason ||
      "external-render-request"
    );

  }


  function handleArtworkChanged(
    event
  ) {

    requestRender(
      event.type
    );

  }


  function handleStereoSettingChanged(
    event
  ) {

    requestRender(
      event.type
    );

  }


  function connectEvents() {

    document.addEventListener(
      "paintless3d:mode-changed",
      handleModeChanged
    );


    document.addEventListener(
      "paintless3d:preview-changed",
      handlePreviewChanged
    );


    document.addEventListener(
      "paintless3d:render-requested",
      handleRenderRequested
    );


    [
      "paintless3d:layer-stereo-changed",
      "paintless3d:layer-depth-changed",
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
      "paintless:layers-rendered",
      "paintless:layer-created",
      "paintless:image-layer-created",
      "paintless:layer-deleted",
      "paintless:layer-duplicated",
      "paintless:layer-order-changed",
      "paintless:layer-visibility-changed",
      "paintless:layer-opacity-changed",
      "paintless:layer-blend-changed",
      "paintless:layer-cleared",
      "paintless:layers-merged",
      "paintless:image-flattened",
      "paintless:layers-restored",
      "paintless:document-reset",
      "paintless:document-resized",
      "paintless:stroke-completed",
      "paintless:shape-committed",
      "paintless:text-committed",
      "paintless:fill-completed",
      "paintless:artwork-changed",
      "paintless:canvas-rendered",
      "paintless:history-restored"
    ].forEach(
      (eventName) => {

        document.addEventListener(
          eventName,
          handleArtworkChanged
        );

      }
    );

  }


  function disconnectEvents() {

    document.removeEventListener(
      "paintless3d:mode-changed",
      handleModeChanged
    );


    document.removeEventListener(
      "paintless3d:preview-changed",
      handlePreviewChanged
    );


    document.removeEventListener(
      "paintless3d:render-requested",
      handleRenderRequested
    );


    [
      "paintless3d:layer-stereo-changed",
      "paintless3d:layer-depth-changed",
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
      "paintless:layers-rendered",
      "paintless:layer-created",
      "paintless:image-layer-created",
      "paintless:layer-deleted",
      "paintless:layer-duplicated",
      "paintless:layer-order-changed",
      "paintless:layer-visibility-changed",
      "paintless:layer-opacity-changed",
      "paintless:layer-blend-changed",
      "paintless:layer-cleared",
      "paintless:layers-merged",
      "paintless:image-flattened",
      "paintless:layers-restored",
      "paintless:document-reset",
      "paintless:document-resized",
      "paintless:stroke-completed",
      "paintless:shape-committed",
      "paintless:text-committed",
      "paintless:fill-completed",
      "paintless:artwork-changed",
      "paintless:canvas-rendered",
      "paintless:history-restored"
    ].forEach(
      (eventName) => {

        document.removeEventListener(
          eventName,
          handleArtworkChanged
        );

      }
    );

  }


  /* =======================================================
     19. INITIALISE
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


    if (
      !installPreviewCanvas()
    ) {

      throw new Error(
        "Paintless3D Renderer could not install its live canvas."
      );

    }


    const size =
      getDocumentSize();


    ensureInternalCanvases(
      size.width,
      size.height
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


    if (
      paintless3d.is3DMode?.()
    ) {

      enableLiveRendering();

    }


    dispatch(
      "paintless3d:renderer-ready",
      {
        renderer:
          publicApi
      }
    );


    console.log(
      "%cPaintless3D Live Renderer ready.",
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

    disableLiveRendering();


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


    renderPreview:
      renderLive,

    renderLive,

    requestRender,

    renderToCanvas,


    enableLiveRendering,

    disableLiveRendering,


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


      return rendererState.backgroundColour;

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


    setHideOriginalDuringPreview() {

      /*
       * Kept for backwards compatibility.
       * The original canvas now remains interactive.
       */

      return false;

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
        "Paintless3D Live Anaglyph Renderer",

      initialised:
        false,

      initialise,

      destroy,

      api:
        publicApi

    }
  );

})();
