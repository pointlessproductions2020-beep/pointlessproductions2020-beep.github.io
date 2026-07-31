"use strict";

/* =========================================================
   PAINTLESS
   LAYERS SYSTEM
========================================================= */

(() => {

  /* =======================================================
     1. DOM REFERENCES
  ======================================================= */

  const editorCanvas =
    document.getElementById("editor-canvas");

  const editorContext =
    editorCanvas?.getContext(
      "2d",
      {
        alpha: true,
        willReadFrequently: true
      }
    );

  const overlayCanvas =
    document.getElementById("overlay-canvas");

  const canvasStage =
    document.getElementById("canvas-stage");

  const layerList =
    document.getElementById("layer-list");

  const addLayerButton =
    document.getElementById("add-layer-button");

  const deleteLayerButton =
    document.getElementById("delete-layer-button");

   const duplicateLayerButton =
  document.createElement("button");


duplicateLayerButton.id =
  "duplicate-layer-button";


duplicateLayerButton.type =
  "button";


duplicateLayerButton.className =
  addLayerButton?.className ||
  deleteLayerButton?.className ||
  "";


duplicateLayerButton.innerHTML =
  "⧉";


duplicateLayerButton.title =
  "Duplicate active layer";


duplicateLayerButton.setAttribute(
  "aria-label",
  "Duplicate active layer"
);


if (
  deleteLayerButton?.parentElement
) {

  deleteLayerButton.parentElement.insertBefore(
    duplicateLayerButton,
    deleteLayerButton
  );

}

  const layerBlendMode =
    document.getElementById("layer-blend-mode");

  const layerOpacity =
    document.getElementById("layer-opacity");


  /* =======================================================
     2. LAYER STATE
  ======================================================= */

  const layers = [];

  let activeLayerId = null;

  let nextLayerNumber = 1;

  let documentWidth =
    editorCanvas?.width || 1280;

  let documentHeight =
    editorCanvas?.height || 720;


  /* =======================================================
     3. HELPERS
  ======================================================= */

  function createUniqueId() {

    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {

      return crypto.randomUUID();

    }

    return (
      "layer-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2)
    );

  }


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


  function escapeHtml(value) {

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }


  function getLayerById(layerId) {

    return (
      layers.find(
        (layer) =>
          layer.id === layerId
      ) || null
    );

  }


  function getLayerIndex(layerId) {

    return layers.findIndex(
      (layer) =>
        layer.id === layerId
    );

  }


  function getActiveLayer() {

    return getLayerById(
      activeLayerId
    );

  }


  function dispatchLayerEvent(
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


  /* =======================================================
     4. LAYER CLASS
  ======================================================= */

  class PaintlessLayer {

    constructor({
      id = createUniqueId(),
      name = `Layer ${nextLayerNumber}`,
      width = documentWidth,
      height = documentHeight,
      visible = true,
      opacity = 1,
      blendMode = "source-over",
      locked = false,
      stereo3dEnabled = true,
      depth3d = 0
    } = {}) {

      this.id = id;

      this.name = name;

      this.visible =
        Boolean(visible);

      this.opacity =
        clamp(
          opacity,
          0,
          1
        );

      this.blendMode =
        blendMode;

      this.locked =
        Boolean(locked);

      this.stereo3dEnabled =
        Boolean(stereo3dEnabled);

      this.depth3d =
        clamp(
          depth3d,
          -300,
          300
        );


      this.canvas =
        document.createElement(
          "canvas"
        );

      this.canvas.width =
        width;

      this.canvas.height =
        height;


      this.context =
        this.canvas.getContext(
          "2d",
          {
            alpha: true,
            willReadFrequently: true
          }
        );


      this.context.imageSmoothingEnabled =
        true;

      this.context.imageSmoothingQuality =
        "high";

    }


    clear() {

      this.context.clearRect(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

    }


    drawImage(
      image,
      ...drawArguments
    ) {

      this.context.drawImage(
        image,
        ...drawArguments
      );

    }


    resize(
      width,
      height,
      preserveContent = true
    ) {

      const safeWidth =
        Math.max(
          1,
          Math.round(width)
        );

      const safeHeight =
        Math.max(
          1,
          Math.round(height)
        );


      let backupCanvas = null;


      if (preserveContent) {

        backupCanvas =
          document.createElement(
            "canvas"
          );

        backupCanvas.width =
          this.canvas.width;

        backupCanvas.height =
          this.canvas.height;

        backupCanvas
          .getContext("2d")
          .drawImage(
            this.canvas,
            0,
            0
          );

      }


      this.canvas.width =
        safeWidth;

      this.canvas.height =
        safeHeight;


      this.context =
        this.canvas.getContext(
          "2d",
          {
            alpha: true,
            willReadFrequently: true
          }
        );


      this.context.imageSmoothingEnabled =
        true;

      this.context.imageSmoothingQuality =
        "high";


      if (
        preserveContent &&
        backupCanvas
      ) {

        this.context.drawImage(
          backupCanvas,
          0,
          0
        );

      }

    }


    duplicate() {

      const duplicateLayer =
        new PaintlessLayer({
          name:
            `${this.name} copy`,
          width:
            this.canvas.width,
          height:
            this.canvas.height,
          visible:
            this.visible,
          opacity:
            this.opacity,
          blendMode:
            this.blendMode,
          locked:
            false,
          stereo3dEnabled:
            this.stereo3dEnabled,
          depth3d:
            this.depth3d
        });


      duplicateLayer.context.drawImage(
        this.canvas,
        0,
        0
      );


      return duplicateLayer;

    }


    createSnapshot() {

      return {
        id:
          this.id,

        name:
          this.name,

        visible:
          this.visible,

        opacity:
          this.opacity,

        blendMode:
          this.blendMode,

        locked:
          this.locked,

        stereo3dEnabled:
          this.stereo3dEnabled,

        depth3d:
          this.depth3d,

        width:
          this.canvas.width,

        height:
          this.canvas.height,

        imageData:
          this.context.getImageData(
            0,
            0,
            this.canvas.width,
            this.canvas.height
          )
      };

    }

  }


  /* =======================================================
     5. COMPOSITE RENDERING
  ======================================================= */

  function renderLayers() {

    if (
      !editorCanvas ||
      !editorContext
    ) {
      return;
    }


    editorContext.save();


    editorContext.setTransform(
      1,
      0,
      0,
      1,
      0,
      0
    );


    editorContext.globalAlpha =
      1;

    editorContext.globalCompositeOperation =
      "source-over";


    editorContext.clearRect(
      0,
      0,
      editorCanvas.width,
      editorCanvas.height
    );


    /*
     * The layers array is stored from bottom to top.
     */

    layers.forEach(
      (layer) => {

        if (
          !layer.visible ||
          layer.opacity <= 0
        ) {
          return;
        }


        editorContext.globalAlpha =
          layer.opacity;

        editorContext.globalCompositeOperation =
          layer.blendMode;


        editorContext.drawImage(
          layer.canvas,
          0,
          0
        );

      }
    );


    editorContext.restore();


    updateLayerThumbnails();


    dispatchLayerEvent(
      "paintless:layers-rendered",
      {
        activeLayer:
          getActiveLayer(),

        layerCount:
          layers.length
      }
    );

  }


  /* =======================================================
     6. CREATE LAYERS
  ======================================================= */

  function createLayer({
    name,
    select = true,
    insertAboveActive = true
  } = {}) {

    const layerName =
      name ||
      `Layer ${nextLayerNumber}`;


    nextLayerNumber += 1;


    const newLayer =
      new PaintlessLayer({
        name:
          layerName,

        width:
          documentWidth,

        height:
          documentHeight
      });


    const activeIndex =
      getLayerIndex(
        activeLayerId
      );


    if (
      insertAboveActive &&
      activeIndex >= 0
    ) {

      layers.splice(
        activeIndex + 1,
        0,
        newLayer
      );

    } else {

      layers.push(
        newLayer
      );

    }


    if (select) {

      activeLayerId =
        newLayer.id;

    }


    renderLayerList();

    renderLayers();


    dispatchLayerEvent(
      "paintless:layer-created",
      {
        layer:
          newLayer
      }
    );


    return newLayer;

  }


  function createBackgroundLayer({
    name = "Background",
    colour = "#ffffff",
    transparent = false
  } = {}) {

    const backgroundLayer =
      new PaintlessLayer({
        name,
        width:
          documentWidth,
        height:
          documentHeight
      });


    if (!transparent) {

      backgroundLayer.context.fillStyle =
        colour;

      backgroundLayer.context.fillRect(
        0,
        0,
        documentWidth,
        documentHeight
      );

    }


    layers.unshift(
      backgroundLayer
    );


    activeLayerId =
      backgroundLayer.id;


    renderLayerList();

    renderLayers();


    return backgroundLayer;

  }


  function createLayerFromImage(
    image,
    {
      name = "Imported Image",
      fit = "contain",
      select = true
    } = {}
  ) {

    const imageLayer =
      createLayer({
        name,
        select,
        insertAboveActive:
          true
      });


    const imageWidth =
      image.naturalWidth ||
      image.videoWidth ||
      image.width;

    const imageHeight =
      image.naturalHeight ||
      image.videoHeight ||
      image.height;


    if (
      !imageWidth ||
      !imageHeight
    ) {

      throw new Error(
        "The imported image has invalid dimensions."
      );

    }


    let drawWidth =
      imageWidth;

    let drawHeight =
      imageHeight;

    let drawX = 0;
    let drawY = 0;


    if (
      fit === "contain" ||
      fit === "cover"
    ) {

      const horizontalScale =
        documentWidth /
        imageWidth;

      const verticalScale =
        documentHeight /
        imageHeight;


      const scale =
        fit === "cover"
          ? Math.max(
              horizontalScale,
              verticalScale
            )
          : Math.min(
              horizontalScale,
              verticalScale
            );


      drawWidth =
        imageWidth *
        scale;

      drawHeight =
        imageHeight *
        scale;


      drawX =
        (
          documentWidth -
          drawWidth
        ) / 2;

      drawY =
        (
          documentHeight -
          drawHeight
        ) / 2;

    }


    imageLayer.context.drawImage(
      image,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );


    renderLayers();

    renderLayerList();


    dispatchLayerEvent(
      "paintless:image-layer-created",
      {
        layer:
          imageLayer
      }
    );


    return imageLayer;

  }


  /* =======================================================
     7. SELECT LAYER
  ======================================================= */

  function selectLayer(
    layerId
  ) {

    const layer =
      getLayerById(
        layerId
      );


    if (!layer) {
      return false;
    }


    activeLayerId =
      layer.id;


    renderLayerList();

    updateLayerControls();


    dispatchLayerEvent(
      "paintless:active-layer-changed",
      {
        layer
      }
    );


    return true;

  }


  /* =======================================================
     8. DELETE LAYERS
  ======================================================= */

  function deleteLayer(
    layerId = activeLayerId
  ) {

    const layerIndex =
      getLayerIndex(
        layerId
      );


    if (layerIndex < 0) {
      return false;
    }


    const deletedLayer =
      layers[layerIndex];


    layers.splice(
      layerIndex,
      1
    );


    if (layers.length === 0) {

      activeLayerId =
        null;

    } else {

      const replacementIndex =
        Math.min(
          layerIndex,
          layers.length - 1
        );


      activeLayerId =
        layers[
          replacementIndex
        ].id;

    }


    renderLayerList();

    renderLayers();


    dispatchLayerEvent(
      "paintless:layer-deleted",
      {
        layer:
          deletedLayer
      }
    );


    return true;

  }


  /* =======================================================
     9. DUPLICATE LAYER
  ======================================================= */

  function duplicateLayer(
    layerId = activeLayerId
  ) {

    const sourceLayer =
      getLayerById(
        layerId
      );


    if (!sourceLayer) {
      return null;
    }


    const duplicate =
      sourceLayer.duplicate();


    const sourceIndex =
      getLayerIndex(
        sourceLayer.id
      );


    layers.splice(
      sourceIndex + 1,
      0,
      duplicate
    );


    activeLayerId =
      duplicate.id;


    renderLayerList();

    renderLayers();


    dispatchLayerEvent(
      "paintless:layer-duplicated",
      {
        sourceLayer,
        duplicateLayer:
          duplicate
      }
    );


    return duplicate;

  }


  /* =======================================================
     10. LAYER ORDER
  ======================================================= */

  function moveLayer(
    layerId,
    targetIndex
  ) {

    const currentIndex =
      getLayerIndex(
        layerId
      );


    if (currentIndex < 0) {
      return false;
    }


    const safeTargetIndex =
      clamp(
        Math.round(targetIndex),
        0,
        layers.length - 1
      );


    if (
      currentIndex ===
      safeTargetIndex
    ) {
      return true;
    }


    const [layer] =
      layers.splice(
        currentIndex,
        1
      );


    layers.splice(
      safeTargetIndex,
      0,
      layer
    );


    renderLayerList();

    renderLayers();


    dispatchLayerEvent(
      "paintless:layer-order-changed",
      {
        layer,
        index:
          safeTargetIndex
      }
    );


    return true;

  }


  function moveLayerUp(
    layerId = activeLayerId
  ) {

    const index =
      getLayerIndex(
        layerId
      );


    if (
      index < 0 ||
      index >=
        layers.length - 1
    ) {
      return false;
    }


    return moveLayer(
      layerId,
      index + 1
    );

  }


  function moveLayerDown(
    layerId = activeLayerId
  ) {

    const index =
      getLayerIndex(
        layerId
      );


    if (index <= 0) {
      return false;
    }


    return moveLayer(
      layerId,
      index - 1
    );

  }


  /* =======================================================
     11. VISIBILITY
  ======================================================= */

  function setLayerVisibility(
    layerId,
    visible
  ) {

    const layer =
      getLayerById(
        layerId
      );


    if (!layer) {
      return false;
    }


    layer.visible =
      Boolean(visible);


    renderLayerList();

    renderLayers();


    dispatchLayerEvent(
      "paintless:layer-visibility-changed",
      {
        layer
      }
    );


    return true;

  }


  function toggleLayerVisibility(
    layerId
  ) {

    const layer =
      getLayerById(
        layerId
      );


    if (!layer) {
      return false;
    }


    return setLayerVisibility(
      layerId,
      !layer.visible
    );

  }


  /* =======================================================
     12. PAINTLESS3D LAYER STATE
  ======================================================= */

  function setLayerStereo3D(
    layerId,
    enabled,
    {
      initialDepth = -300
    } = {}
  ) {

    const layer =
      getLayerById(
        layerId
      );


    if (!layer) {
      return false;
    }


    const nextEnabled =
      Boolean(enabled);


    const wasEnabled =
      Boolean(
        layer.stereo3dEnabled
      );


    layer.stereo3dEnabled =
      nextEnabled;


    if (
      nextEnabled &&
      !wasEnabled &&
      Number(layer.depth3d) === 0
    ) {

      layer.depth3d =
        clamp(
          initialDepth,
          -300,
          300
        );

    }


    renderLayerList();

    renderLayers();


    dispatchLayerEvent(
      "paintless3d:layer-stereo-changed",
      {
        layer,
        enabled:
          layer.stereo3dEnabled,
        depth:
          layer.depth3d
      }
    );


    dispatchLayerEvent(
      "paintless3d:render-requested",
      {
        reason:
          "layer-stereo-changed",
        layer
      }
    );


    return true;

  }


  function toggleLayerStereo3D(
    layerId
  ) {

    const layer =
      getLayerById(
        layerId
      );


    if (!layer) {
      return false;
    }


    return setLayerStereo3D(
      layerId,
      !layer.stereo3dEnabled
    );

  }


  function setLayerDepth3D(
  layerId,
  depth,
  {
    refreshLayerList = false
  } = {}
) {

  const layer =
    getLayerById(
      layerId
    );


  if (!layer) {

    return false;

  }


  const previousDepth =
    Number(layer.depth3d) || 0;


  const numericDepth =
    Number(depth);


  layer.depth3d =
    clamp(
      Number.isFinite(numericDepth)
        ? Math.round(numericDepth)
        : 0,
      -300,
      300
    );


  /*
   * Every layer always participates in Paintless3D.
   * A depth of zero means the layer sits on the screen plane.
   */

  layer.stereo3dEnabled =
    true;


  const layerItem =
    layerList?.querySelector(
      `[data-layer-id="${layer.id}"]`
    );


  if (layerItem) {

    const slider =
      layerItem.querySelector(
        `[data-layer-depth-slider="${layer.id}"]`
      );


    const value =
      layerItem.querySelector(
        `[data-layer-depth-value="${layer.id}"]`
      );


    if (
      slider &&
      slider !== document.activeElement
    ) {

      slider.value =
        String(layer.depth3d);

    }


    if (value) {

  value.textContent =
    `Z ${
      layer.depth3d > 0
        ? "+"
        : ""
    }${layer.depth3d}`;

}


    layerItem.classList.toggle(
      "is-depth-behind",
      layer.depth3d < 0
    );


    layerItem.classList.toggle(
      "is-depth-forward",
      layer.depth3d > 0
    );


    layerItem.classList.toggle(
      "is-depth-screen",
      layer.depth3d === 0
    );

  }


  if (refreshLayerList) {

    renderLayerList();

  }


  dispatchLayerEvent(
    "paintless3d:layer-depth-changed",
    {
      layer,

      depth:
        layer.depth3d,

      previousDepth,

      source:
        "layers"
    }
  );


  dispatchLayerEvent(
    "paintless3d:render-requested",
    {
      reason:
        "layer-depth-changed",

      layer
    }
  );


  return layer.depth3d;

}


  /* =======================================================
     13. OPACITY
  ======================================================= */

  function setLayerOpacity(
    layerId,
    opacity
  ) {

    const layer =
      getLayerById(
        layerId
      );


    if (!layer) {
      return false;
    }


    const normalisedOpacity =
      Number(opacity) > 1
        ? Number(opacity) / 100
        : Number(opacity);


    layer.opacity =
      clamp(
        normalisedOpacity,
        0,
        1
      );


    updateLayerControls();

    renderLayers();


    dispatchLayerEvent(
      "paintless:layer-opacity-changed",
      {
        layer
      }
    );


    return true;

  }


  /* =======================================================
     14. BLEND MODE
  ======================================================= */

  function setLayerBlendMode(
    layerId,
    blendMode
  ) {

    const layer =
      getLayerById(
        layerId
      );


    if (!layer) {
      return false;
    }


    const validBlendModes =
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
        "luminosity"
      ];


    layer.blendMode =
      validBlendModes.includes(
        blendMode
      )
        ? blendMode
        : "source-over";


    updateLayerControls();

    renderLayers();


    dispatchLayerEvent(
      "paintless:layer-blend-changed",
      {
        layer
      }
    );


    return true;

  }


  /* =======================================================
     15. RENAME
  ======================================================= */

  function renameLayer(
    layerId,
    newName
  ) {

    const layer =
      getLayerById(
        layerId
      );


    if (!layer) {
      return false;
    }


    const cleanedName =
      String(newName)
        .trim()
        .slice(
          0,
          80
        );


    if (!cleanedName) {
      return false;
    }


    layer.name =
      cleanedName;


    renderLayerList();


    dispatchLayerEvent(
      "paintless:layer-renamed",
      {
        layer
      }
    );


    return true;

  }


  /* =======================================================
     16. LOCKING
  ======================================================= */

  function setLayerLocked(
    layerId,
    locked
  ) {

    const layer =
      getLayerById(
        layerId
      );


    if (!layer) {
      return false;
    }


    layer.locked =
      Boolean(locked);


    renderLayerList();


    dispatchLayerEvent(
      "paintless:layer-lock-changed",
      {
        layer
      }
    );


    return true;

  }


  /* =======================================================
     17. CLEAR ACTIVE LAYER
  ======================================================= */

  function clearActiveLayer() {

    const layer =
      getActiveLayer();


    if (
      !layer ||
      layer.locked
    ) {
      return false;
    }


    layer.clear();

    renderLayers();


    dispatchLayerEvent(
      "paintless:layer-cleared",
      {
        layer
      }
    );


    return true;

  }


  /* =======================================================
     18. MERGE DOWN
  ======================================================= */

  function mergeLayerDown(
    layerId = activeLayerId
  ) {

    const upperIndex =
      getLayerIndex(
        layerId
      );


    if (upperIndex <= 0) {
      return false;
    }


    const upperLayer =
      layers[
        upperIndex
      ];

    const lowerLayer =
      layers[
        upperIndex - 1
      ];


    lowerLayer.context.save();


    lowerLayer.context.globalAlpha =
      upperLayer.opacity;

    lowerLayer.context.globalCompositeOperation =
      upperLayer.blendMode;


    if (upperLayer.visible) {

      lowerLayer.context.drawImage(
        upperLayer.canvas,
        0,
        0
      );

    }


    lowerLayer.context.restore();


    layers.splice(
      upperIndex,
      1
    );


    activeLayerId =
      lowerLayer.id;


    renderLayerList();

    renderLayers();


    dispatchLayerEvent(
      "paintless:layers-merged",
      {
        upperLayer,
        lowerLayer
      }
    );


    return true;

  }


  /* =======================================================
     19. FLATTEN IMAGE
  ======================================================= */

  function flattenImage() {

    if (
      layers.length === 0
    ) {
      return null;
    }


    const flattenedLayer =
      new PaintlessLayer({
        name:
          "Flattened Image",

        width:
          documentWidth,

        height:
          documentHeight
      });


    layers.forEach(
      (layer) => {

        if (
          !layer.visible ||
          layer.opacity <= 0
        ) {
          return;
        }


        flattenedLayer.context.save();


        flattenedLayer.context.globalAlpha =
          layer.opacity;

        flattenedLayer.context.globalCompositeOperation =
          layer.blendMode;


        flattenedLayer.context.drawImage(
          layer.canvas,
          0,
          0
        );


        flattenedLayer.context.restore();

      }
    );


    layers.splice(
      0,
      layers.length,
      flattenedLayer
    );


    activeLayerId =
      flattenedLayer.id;


    renderLayerList();

    renderLayers();


    dispatchLayerEvent(
      "paintless:image-flattened",
      {
        layer:
          flattenedLayer
      }
    );


    return flattenedLayer;

  }


  /* =======================================================
     20. DOCUMENT SIZE
  ======================================================= */

  function resizeDocument(
    width,
    height,
    {
      preserveContent = true
    } = {}
  ) {

    const safeWidth =
      Math.max(
        1,
        Math.round(width)
      );

    const safeHeight =
      Math.max(
        1,
        Math.round(height)
      );


    documentWidth =
      safeWidth;

    documentHeight =
      safeHeight;


    if (editorCanvas) {

      editorCanvas.width =
        safeWidth;

      editorCanvas.height =
        safeHeight;

    }


    if (overlayCanvas) {

      overlayCanvas.width =
        safeWidth;

      overlayCanvas.height =
        safeHeight;

    }


    if (canvasStage) {

      canvasStage.style.width =
        `${safeWidth}px`;

      canvasStage.style.height =
        `${safeHeight}px`;

    }


    layers.forEach(
      (layer) => {

        layer.resize(
          safeWidth,
          safeHeight,
          preserveContent
        );

      }
    );


    renderLayers();

    renderLayerList();


    dispatchLayerEvent(
      "paintless:document-resized",
      {
        width:
          safeWidth,

        height:
          safeHeight
      }
    );

  }


  function resetDocument({
    width = 1280,
    height = 720,
    background = "transparent",
    backgroundColour = "#ffffff"
  } = {}) {

    layers.splice(
      0,
      layers.length
    );


    activeLayerId =
      null;

    nextLayerNumber =
      1;


    resizeDocument(
      width,
      height,
      {
        preserveContent:
          false
      }
    );


    if (
      background ===
      "transparent"
    ) {

      createLayer({
        name:
          "Layer 1",

        select:
          true,

        insertAboveActive:
          false
      });

    } else {

      let colour =
        backgroundColour;


      if (
        background ===
        "white"
      ) {
        colour = "#ffffff";
      }


      if (
        background ===
        "black"
      ) {
        colour = "#000000";
      }


      createBackgroundLayer({
        colour,
        transparent:
          false
      });

    }


    renderLayerList();

    renderLayers();


    dispatchLayerEvent(
      "paintless:document-reset",
      {
        width:
          documentWidth,

        height:
          documentHeight
      }
    );

  }


  /* =======================================================
     21. LAYER THUMBNAILS
  ======================================================= */

  function createThumbnailDataUrl(
    layer
  ) {

    const thumbnailCanvas =
      document.createElement(
        "canvas"
      );


    thumbnailCanvas.width =
      84;

    thumbnailCanvas.height =
      72;


    const thumbnailContext =
      thumbnailCanvas.getContext(
        "2d"
      );


    const scale =
      Math.min(
        thumbnailCanvas.width /
          layer.canvas.width,

        thumbnailCanvas.height /
          layer.canvas.height
      );


    const drawWidth =
      layer.canvas.width *
      scale;

    const drawHeight =
      layer.canvas.height *
      scale;


    const drawX =
      (
        thumbnailCanvas.width -
        drawWidth
      ) / 2;

    const drawY =
      (
        thumbnailCanvas.height -
        drawHeight
      ) / 2;


    thumbnailContext.clearRect(
      0,
      0,
      thumbnailCanvas.width,
      thumbnailCanvas.height
    );


    thumbnailContext.drawImage(
      layer.canvas,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );


    return thumbnailCanvas.toDataURL(
      "image/png"
    );

  }


  function updateLayerThumbnails() {

    if (!layerList) {
      return;
    }


    layers.forEach(
      (layer) => {

        const thumbnail =
          layerList.querySelector(
            `[data-layer-thumbnail="${layer.id}"]`
          );


        if (!thumbnail) {
          return;
        }


        thumbnail.style.backgroundImage =
          [
            `url("${createThumbnailDataUrl(layer)}")`,
            "linear-gradient(45deg, #d4d4d4 25%, transparent 25%)",
            "linear-gradient(-45deg, #d4d4d4 25%, transparent 25%)",
            "linear-gradient(45deg, transparent 75%, #d4d4d4 75%)",
            "linear-gradient(-45deg, transparent 75%, #d4d4d4 75%)"
          ].join(",");


        thumbnail.style.backgroundPosition =
          [
            "center",
            "0 0",
            "0 6px",
            "6px -6px",
            "-6px 0"
          ].join(",");


        thumbnail.style.backgroundRepeat =
          [
            "no-repeat",
            "repeat",
            "repeat",
            "repeat",
            "repeat"
          ].join(",");


        thumbnail.style.backgroundSize =
          [
            "contain",
            "12px 12px",
            "12px 12px",
            "12px 12px",
            "12px 12px"
          ].join(",");

      }
    );

  }


  /* =======================================================
     22. LAYER LIST UI
  ======================================================= */

function renderLayerList() {

  if (!layerList) {

    return;

  }


  layerList.innerHTML =
    "";


  /*
   * Layers are stored bottom-to-top,
   * but displayed topmost-first.
   */

  [...layers]
    .reverse()
    .forEach(
      (layer) => {

        /*
         * Every layer automatically belongs to Paintless3D.
         * Zero depth means screen level, not disabled.
         */




         


        const safeDepth =
          clamp(
            Math.round(
              Number(layer.depth3d) || 0
            ),
            -300,
            300
          );


        layer.depth3d =
          safeDepth;


        const depthText =
          `${
            safeDepth > 0
              ? "+"
              : ""
          }${safeDepth}`;


        const layerItem =
          document.createElement(
            "article"
          );


        layerItem.className =
          "layer-item paintless-layer-row";


        layerItem.classList.toggle(
          "is-active",
          layer.id === activeLayerId
        );


        layerItem.classList.toggle(
          "is-depth-behind",
          safeDepth < 0
        );


        layerItem.classList.toggle(
          "is-depth-forward",
          safeDepth > 0
        );


        layerItem.classList.toggle(
          "is-depth-screen",
          safeDepth === 0
        );


        layerItem.dataset.layerId =
          layer.id;


        layerItem.setAttribute(
          "role",
          "listitem"
        );


        layerItem.tabIndex =
          0;


         layerItem.innerHTML = `
          <button
            class="layer-visibility"
            type="button"
            data-layer-visibility="${layer.id}"
            aria-label="${
              layer.visible
                ? "Hide"
                : "Show"
            } ${escapeHtml(layer.name)}"
            title="${
              layer.visible
                ? "Hide layer"
                : "Show layer"
            }"
          >
            ${
              layer.visible
                ? "◉"
                : "○"
            }
          </button>

          <button
            class="layer-thumbnail"
            type="button"
            data-layer-thumbnail="${layer.id}"
            aria-label="Select ${escapeHtml(layer.name)}"
            title="Select layer"
          ></button>

          <button
            class="layer-name"
            type="button"
            data-layer-name="${layer.id}"
            title="Double-click to rename"
          >
            ${
              layer.locked
                ? "🔒 "
                : ""
            }${escapeHtml(layer.name)}
          </button>

          <button
              class="paintless-layer-stereo${
              layer.stereo3dEnabled
               ? " is-enabled"
               : ""
                }"
                type="button"
                data-layer-stereo="${layer.id}"
                aria-pressed="${layer.stereo3dEnabled}"
                aria-label="Toggle 3D depth for ${escapeHtml(layer.name)}"
                title="${
                   layer.stereo3dEnabled
                   ? "Disable layer depth"
                   : "Enable layer depth"
                   }"
                   >
                      ◼
                   </button>

          <input
            class="paintless-depth-slider"
            type="range"
            min="-300"
            max="300"
            step="1"
            value="${safeDepth}"
            data-layer-depth-slider="${layer.id}"
            aria-label="Depth for ${escapeHtml(layer.name)}"
          >

          <output
            class="paintless-depth-value"
            data-layer-depth-value="${layer.id}"
            title="Current layer depth"
          >
            Z ${depthText}
          </output>
        `;


        const selectThisLayer =
          () => {

            if (
              activeLayerId !==
              layer.id
            ) {

              selectLayer(
                layer.id
              );

            }

          };


        const commitDepthHistory =
          () => {

            dispatchLayerEvent(
              "paintless:history-requested",
              {
                reason:
                  "Change layer depth"
              }
            );

          };


        layerItem.addEventListener(
          "click",
          (event) => {

            const visibilityButton =
              event.target.closest(
                "[data-layer-visibility]"
              );


            if (visibilityButton) {

              toggleLayerVisibility(
                layer.id
              );

              return;

            }

          const stereoButton =
              event.target.closest(
                "[data-layer-stereo]"
              );


            if (stereoButton) {

              selectThisLayer();


              toggleLayerStereo3D(
                layer.id
              );


              commitDepthHistory();

              return;

            }

            const minusButton =
              event.target.closest(
                "[data-layer-depth-minus]"
              );


            if (minusButton) {

              selectThisLayer();


              setLayerDepth3D(
                layer.id,
                Number(layer.depth3d) - 1
              );


              commitDepthHistory();

              return;

            }


            const plusButton =
              event.target.closest(
                "[data-layer-depth-plus]"
              );


            if (plusButton) {

              selectThisLayer();


              setLayerDepth3D(
                layer.id,
                Number(layer.depth3d) + 1
              );


              commitDepthHistory();

              return;

            }


            const settingsButton =
              event.target.closest(
                "[data-layer-settings]"
              );


            if (settingsButton) {

              selectThisLayer();


              dispatchLayerEvent(
                "paintless3d:layer-settings-requested",
                {
                  layer
                }
              );


              return;

            }


            const slider =
              event.target.closest(
                "[data-layer-depth-slider]"
              );


            if (slider) {

              selectThisLayer();

              return;

            }


            selectThisLayer();

          }
        );


        const depthSlider =
          layerItem.querySelector(
            `[data-layer-depth-slider="${layer.id}"]`
          );


        depthSlider?.addEventListener(
          "pointerdown",
          (event) => {

            event.stopPropagation();

            selectThisLayer();

          }
        );


        depthSlider?.addEventListener(
          "click",
          (event) => {

            event.stopPropagation();

          }
        );


        depthSlider?.addEventListener(
          "input",
          () => {

            setLayerDepth3D(
              layer.id,
              Number(depthSlider.value)
            );

          }
        );


        depthSlider?.addEventListener(
          "change",
          commitDepthHistory
        );


        layerItem.addEventListener(
          "dblclick",
          (event) => {

            const nameButton =
              event.target.closest(
                "[data-layer-name]"
              );


            if (!nameButton) {

              return;

            }


            const newName =
              window.prompt(
                "Rename layer:",
                layer.name
              );


            if (newName !== null) {

              renameLayer(
                layer.id,
                newName
              );

            }

          }
        );


        layerItem.addEventListener(
          "keydown",
          (event) => {

            if (
              event.target.matches(
                "input, button"
              )
            ) {

              return;

            }


            if (
              event.key === "Enter" ||
              event.key === " "
            ) {

              event.preventDefault();


              selectLayer(
                layer.id
              );

            }

          }
        );


        layerList.appendChild(
          layerItem
        );

      }
    );


  updateLayerControls();

  updateLayerThumbnails();

}


  /* =======================================================
     23. PROPERTY CONTROLS
  ======================================================= */

  function updateLayerControls() {

    const activeLayer =
      getActiveLayer();


    if (!activeLayer) {

      if (layerBlendMode) {

        layerBlendMode.disabled =
          true;

      }


      if (layerOpacity) {

        layerOpacity.disabled =
          true;

      }


      if (deleteLayerButton) {

        deleteLayerButton.disabled =
          true;

      }


      return;

    }


    if (layerBlendMode) {

      layerBlendMode.disabled =
        false;

      layerBlendMode.value =
        activeLayer.blendMode;

    }


    if (layerOpacity) {

      layerOpacity.disabled =
        false;

      layerOpacity.value =
        Math.round(
          activeLayer.opacity *
          100
        );

    }


    if (deleteLayerButton) {

      deleteLayerButton.disabled =
        false;

    }

  }


  /* =======================================================
     24. SNAPSHOTS
  ======================================================= */

  function createLayersSnapshot() {

    return {
      activeLayerId,

      nextLayerNumber,

      documentWidth,

      documentHeight,

      layers:
        layers.map(
          (layer) =>
            layer.createSnapshot()
        )
    };

  }


  function restoreLayersSnapshot(
    snapshot
  ) {

    if (
      !snapshot ||
      !Array.isArray(
        snapshot.layers
      )
    ) {

      throw new Error(
        "Invalid Paintless layer snapshot."
      );

    }


    layers.splice(
      0,
      layers.length
    );


    documentWidth =
      snapshot.documentWidth;

    documentHeight =
      snapshot.documentHeight;


    resizeDocument(
      documentWidth,
      documentHeight,
      {
        preserveContent:
          false
      }
    );


    snapshot.layers.forEach(
      (savedLayer) => {

        const restoredLayer =
          new PaintlessLayer({
            id:
              savedLayer.id,

            name:
              savedLayer.name,

            width:
              savedLayer.width,

            height:
              savedLayer.height,

            visible:
              savedLayer.visible,

            opacity:
              savedLayer.opacity,

            blendMode:
              savedLayer.blendMode,

            locked:
              savedLayer.locked,

            stereo3dEnabled:
              savedLayer.stereo3dEnabled ?? false,

            depth3d:
              savedLayer.depth3d ?? 0
          });


        restoredLayer.context.putImageData(
          savedLayer.imageData,
          0,
          0
        );


        layers.push(
          restoredLayer
        );

      }
    );


    activeLayerId =
      snapshot.activeLayerId;

    nextLayerNumber =
      snapshot.nextLayerNumber ||
      layers.length + 1;


    if (
      !getActiveLayer() &&
      layers.length > 0
    ) {

      activeLayerId =
        layers[
          layers.length - 1
        ].id;

    }


    renderLayerList();

    renderLayers();


    dispatchLayerEvent(
      "paintless:layers-restored",
      {
        activeLayer:
          getActiveLayer()
      }
    );

  }


  /* =======================================================
     25. EVENT LISTENERS
  ======================================================= */

  document.addEventListener(
    "paintless3d:mode-changed",
    () => {

      renderLayerList();

    }
  );


  addLayerButton?.addEventListener(
    "click",
    () => {

      createLayer();

      dispatchLayerEvent(
        "paintless:history-requested",
        {
          reason:
            "Add layer"
        }
      );

    }
  );


  deleteLayerButton?.addEventListener(
    "click",
    () => {

      if (!getActiveLayer()) {
        return;
      }


      deleteLayer();


      dispatchLayerEvent(
        "paintless:history-requested",
        {
          reason:
            "Delete layer"
        }
      );

    }
  );


   duplicateLayerButton?.addEventListener(
  "click",
  () => {

    if (!getActiveLayer()) {
      return;
    }


    duplicateLayer();


    dispatchLayerEvent(
      "paintless:history-requested",
      {
        reason:
          "Duplicate layer"
      }
    );

  }
);

  layerBlendMode?.addEventListener(
    "change",
    () => {

      if (!activeLayerId) {
        return;
      }


      setLayerBlendMode(
        activeLayerId,
        layerBlendMode.value
      );


      dispatchLayerEvent(
        "paintless:history-requested",
        {
          reason:
            "Change blend mode"
        }
      );

    }
  );


  layerOpacity?.addEventListener(
    "input",
    () => {

      if (!activeLayerId) {
        return;
      }


      setLayerOpacity(
        activeLayerId,
        Number(
          layerOpacity.value
        )
      );

    }
  );


  layerOpacity?.addEventListener(
    "change",
    () => {

      dispatchLayerEvent(
        "paintless:history-requested",
        {
          reason:
            "Change layer opacity"
        }
      );

    }
  );


  /* =======================================================
     26. PAINTLESS3D LAYER BUTTON STYLES
  ======================================================= */

  function installPaintless3DLayerStyles() {

  const existingStyle =
    document.getElementById(
      "paintless-layer-stereo3d-styles"
    );


  existingStyle?.remove();


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "paintless-layer-stereo3d-styles";


  style.textContent = `
    .paintless-layer-row {
      display: block;
      width: 100%;
      min-width: 0;
      padding: 7px;
      overflow: hidden;
    }

    .paintless-layer-main {
      display: grid;
      grid-template-columns:
        auto
        42px
        minmax(0, 1fr)
        31px;
      align-items: center;
      gap: 7px;
      min-width: 0;
    }

    .paintless-layer-row .layer-thumbnail {
      width: 42px;
      height: 36px;
      min-width: 42px;
      border-radius: 8px;
    }

    .paintless-layer-row .layer-name {
      min-width: 0;
      overflow: hidden;
      text-align: left;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .paintless-layer-settings {
      display: grid;
      place-items: center;
      width: 31px;
      height: 31px;
      padding: 0;
      border:
        1px solid
        rgba(255, 255, 255, 0.11);
      border-radius: 8px;
      color:
        rgba(255, 255, 255, 0.64);
      background:
        rgba(255, 255, 255, 0.035);
      font-size: 13px;
      line-height: 1;
      cursor: pointer;
      touch-action: manipulation;
    }

    .paintless-layer-settings:hover {
      border-color:
        rgba(37, 230, 255, 0.42);
      color: #ffffff;
      background:
        rgba(37, 230, 255, 0.08);
    }

    .paintless-layer-depth {
      display: grid;
      grid-template-columns:
        27px
        minmax(58px, 1fr)
        27px
        42px;
      align-items: center;
      gap: 5px;
      width: 100%;
      min-width: 0;
      margin-top: 6px;
    }

    .paintless-depth-nudge {
      display: grid;
      place-items: center;
      width: 27px;
      height: 25px;
      padding: 0;
      border:
        1px solid
        rgba(255, 255, 255, 0.11);
      border-radius: 7px;
      color:
        rgba(255, 255, 255, 0.75);
      background:
        rgba(255, 255, 255, 0.035);
      font:
        800 15px/1
        Arial,
        sans-serif;
      cursor: pointer;
      user-select: none;
      touch-action: manipulation;
    }

    .paintless-depth-nudge:hover {
      border-color:
        rgba(255, 255, 255, 0.3);
      color: #ffffff;
      background:
        rgba(255, 255, 255, 0.08);
    }

    .paintless-depth-slider {
      width: 100%;
      min-width: 0;
      height: 25px;
      margin: 0;
      accent-color: #a84cff;
      cursor: ew-resize;
      touch-action: pan-y;
    }

    .paintless-depth-value {
      display: grid;
      place-items: center;
      min-width: 42px;
      height: 25px;
      padding: 0 5px;
      overflow: hidden;
      border:
        1px solid
        rgba(255, 255, 255, 0.1);
      border-radius: 7px;
      color:
        rgba(255, 255, 255, 0.8);
      background:
        rgba(0, 0, 0, 0.18);
      font:
        800 10px/1
        "Segoe UI",
        Arial,
        sans-serif;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .paintless-layer-row.is-depth-behind
    .paintless-depth-value {
      color: #ff6684;
      border-color:
        rgba(255, 49, 92, 0.34);
    }

    .paintless-layer-row.is-depth-forward
    .paintless-depth-value {
      color: #67efff;
      border-color:
        rgba(37, 230, 255, 0.34);
    }

    .paintless-layer-row.is-depth-screen
    .paintless-depth-value {
      color:
        rgba(255, 255, 255, 0.7);
    }

    .paintless-layer-row.is-active
    .paintless-layer-depth {
      opacity: 1;
    }

    .paintless-layer-row:not(.is-active)
    .paintless-layer-depth {
      opacity: 0.72;
    }

    .paintless-layer-row:focus-visible,
    .paintless-layer-settings:focus-visible,
    .paintless-depth-nudge:focus-visible,
    .paintless-depth-slider:focus-visible {
      outline:
        2px solid
        #25e6ff;
      outline-offset: 2px;
    }

    /*
     * Compact tablet layout.
     */

    @media (max-width: 1000px) {

      .paintless-layer-row {
        padding: 6px;
      }

      .paintless-layer-main {
        grid-template-columns:
          auto
          36px
          minmax(0, 1fr)
          29px;
        gap: 5px;
      }

      .paintless-layer-row
      .layer-thumbnail {
        width: 36px;
        min-width: 36px;
        height: 32px;
      }

      .paintless-layer-depth {
        grid-template-columns:
          27px
          minmax(48px, 1fr)
          27px
          38px;
        gap: 4px;
      }

      .paintless-depth-value {
        min-width: 38px;
      }

    }

    /*
     * Mobile:
     * non-active layers stay compact;
     * only the selected layer shows its depth controls.
     */

    @media (max-width: 700px) {

      .paintless-layer-row {
        padding: 6px;
      }

      .paintless-layer-main {
        grid-template-columns:
          29px
          38px
          minmax(0, 1fr)
          30px;
      }

      .paintless-layer-row
      .layer-thumbnail {
        width: 38px;
        min-width: 38px;
        height: 32px;
      }

      .paintless-layer-row:not(.is-active)
      .paintless-layer-depth {
        display: none;
      }

      .paintless-layer-row.is-active
      .paintless-layer-depth {
        display: grid;
        grid-template-columns:
          30px
          minmax(72px, 1fr)
          30px
          42px;
        margin-top: 7px;
      }

      .paintless-depth-nudge {
        width: 30px;
        height: 29px;
      }

      .paintless-depth-slider {
        height: 29px;
      }

      .paintless-depth-value {
        height: 29px;
      }

    }

    /*
     * Very narrow phones.
     */

    @media (max-width: 430px) {

      .paintless-layer-row.is-active
      .paintless-layer-depth {
        grid-template-columns:
          30px
          minmax(50px, 1fr)
          30px;
      }

      .paintless-layer-row.is-active
      .paintless-depth-value {
        grid-column:
          1 / -1;
        width: 100%;
      }

    }
  `;


  document.head.appendChild(
    style
  );

}
  /* =======================================================
     28. INITIAL UI
  ======================================================= */

  renderLayerList();

updateLayerControls();


/* =======================================================
   29. PUBLIC API
======================================================= */

window.PaintlessLayers = {

  PaintlessLayer,

  getLayers() {

    return layers;

  },

  getLayerById,

  getLayerIndex,

  getActiveLayer,

  getActiveLayerId() {

    return activeLayerId;

  },

  getDocumentSize() {

    return {
      width:
        documentWidth,

      height:
        documentHeight
    };

  },

  createLayer,

  createBackgroundLayer,

  createLayerFromImage,

  selectLayer,

  deleteLayer,

  duplicateLayer,

  moveLayer,

  moveLayerUp,

  moveLayerDown,

  setLayerVisibility,

  toggleLayerVisibility,

  setLayerStereo3D,

  toggleLayerStereo3D,

  setLayerDepth3D,

  setLayerOpacity,

  setLayerBlendMode,

  renameLayer,

  setLayerLocked,

  clearActiveLayer,

  mergeLayerDown,

  flattenImage,

  resizeDocument,

  resetDocument,

  renderLayers,

  renderLayerList,

  updateLayerControls,

  updateLayerThumbnails,

  createLayersSnapshot,

  restoreLayersSnapshot,

  installPaintless3DLayerStyles

};


console.log(
  "%cPaintless layers ready.",
  [
    "color:#d49aff",
    "font-weight:bold",
    "font-size:13px"
  ].join(";")
);

})();
