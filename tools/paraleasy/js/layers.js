"use strict";


/* =========================================================
   ParaL-Easy
   LAYER IMPORT + STACK MANAGEMENT
========================================================= */


/* =========================================================
   1. DOM REFERENCES
========================================================= */

const layerFileInput =
  document.querySelector(
    "#layer-file-input"
  );

const layerDropZone =
  document.querySelector(
    "#layer-drop-zone"
  );

const layerList =
  document.querySelector(
    "#layer-list"
  );

const emptyLayersMessage =
  document.querySelector(
    "#empty-layers-message"
  );

const duplicateLayerButton =
  document.querySelector(
    "#duplicate-layer-btn"
  );

const deleteLayerButton =
  document.querySelector(
    "#delete-layer-btn"
  );

const addLayerButton =
  document.querySelector(
    "#add-layer-btn"
  );

const layerCountElement =
  document.querySelector(
    "#layer-count"
  );


/* =========================================================
   2. ACCEPTED FILE TYPES
========================================================= */

const PARALEASY_ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp"
];


/* =========================================================
   3. TEMPORARY IMAGE CACHE
========================================================= */

/*
 * Each imported layer keeps a browser Image object here.
 *
 * project.js stores the image source string.
 * This cache keeps the decoded Image ready for fast canvas
 * rendering later inside parallax-engine.js.
 */

const paraleasyImageCache =
  new Map();


/* =========================================================
   4. IMPORT FILES
========================================================= */

async function importLayerFiles(
  fileList
) {

  const files =
    Array.from(
      fileList || []
    );


  if (
    files.length === 0
  ) {
    return [];
  }


  const validFiles =
    files.filter(
      isSupportedLayerFile
    );


  if (
    validFiles.length === 0
  ) {

    setLayerStatus(
      "No supported image files found."
    );

    return [];

  }


  setLayerStatus(
    `Importing ${validFiles.length} layer${
      validFiles.length === 1
        ? ""
        : "s"
    }...`
  );


  const importedLayers = [];


  for (
    const file
    of validFiles
  ) {

    try {

      const layer =
        await createLayerFromFile(
          file
        );


      addLayerToProject(
        layer
      );


      importedLayers.push(
        layer
      );

    } catch (error) {

      console.error(
        "ParaL-Easy could not import layer:",
        file?.name,
        error
      );

    }

  }


  renderLayerList();

  notifyLayerSelectionChanged();

  notifyLayersChanged();


  setLayerStatus(
    `${importedLayers.length} layer${
      importedLayers.length === 1
        ? ""
        : "s"
    } imported`
  );


  return importedLayers;

}


/* =========================================================
   5. CREATE LAYER FROM FILE
========================================================= */

async function createLayerFromFile(
  file
) {

  if (
    !isSupportedLayerFile(
      file
    )
  ) {

    throw new Error(
      "Unsupported image type."
    );

  }


  const dataUrl =
    await readFileAsDataUrl(
      file
    );


  const image =
    await loadImageFromSource(
      dataUrl
    );


  const layerName =
    makeLayerNameFromFile(
      file.name
    );


  const layer =
    createLayerFromImage({

      name:
        layerName,

      src:
        dataUrl,

      width:
        image.naturalWidth,

      height:
        image.naturalHeight

    });


  paraleasyImageCache.set(
    layer.id,
    image
  );


  return layer;

}


/* =========================================================
   6. SUPPORTED FILE CHECK
========================================================= */

function isSupportedLayerFile(
  file
) {

  if (!file) {
    return false;
  }


  if (
    PARALEASY_ACCEPTED_IMAGE_TYPES.includes(
      file.type
    )
  ) {
    return true;
  }


  /*
   * Some browsers or drag/drop situations can provide an
   * empty MIME type, so fall back to file extension.
   */

  const fileName =
    String(
      file.name || ""
    ).toLowerCase();


  return (
    fileName.endsWith(
      ".png"
    ) ||
    fileName.endsWith(
      ".jpg"
    ) ||
    fileName.endsWith(
      ".jpeg"
    ) ||
    fileName.endsWith(
      ".webp"
    )
  );

}


/* =========================================================
   7. READ FILE
========================================================= */

function readFileAsDataUrl(
  file
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const reader =
        new FileReader();


      reader.onload =
        () => {

          resolve(
            String(
              reader.result || ""
            )
          );

        };


      reader.onerror =
        () => {

          reject(
            reader.error ||
            new Error(
              "Image could not be read."
            )
          );

        };


      reader.readAsDataURL(
        file
      );

    }
  );

}


/* =========================================================
   8. LOAD IMAGE
========================================================= */

function loadImageFromSource(
  source
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const image =
        new Image();


      image.onload =
        () => {

          resolve(
            image
          );

        };


      image.onerror =
        () => {

          reject(
            new Error(
              "Image could not be decoded."
            )
          );

        };


      image.src =
        source;

    }
  );

}


/* =========================================================
   9. CLEAN FILE NAME
========================================================= */

function makeLayerNameFromFile(
  fileName
) {

  const name =
    String(
      fileName || "Layer"
    )

      .replace(
        /\.[^.]+$/,
        ""
      )

      .replace(
        /[_-]+/g,
        " "
      )

      .trim();


  return (
    name ||
    "Layer"
  );

}


/* =========================================================
   10. RENDER LAYER LIST
========================================================= */

function renderLayerList() {

  if (!layerList) {
    return;
  }


  const project =
    getProject();


  /*
   * Remove only generated layer items.
   * Keep the original empty-state element intact.
   */

  layerList
    .querySelectorAll(
      ".layer-item"
    )
    .forEach(
      (
        element
      ) => {

        element.remove();

      }
    );


  if (
    project.layers.length === 0
  ) {

    if (
      emptyLayersMessage
    ) {

      emptyLayersMessage.hidden =
        false;

    }


    updateLayerButtons();

    updateLayerCount();

    return;

  }


  if (
    emptyLayersMessage
  ) {

    emptyLayersMessage.hidden =
      true;

  }


  /*
   * Render top-most layer visually at the top.
   *
   * The project array stores layers in normal painter order:
   * index 0 is back,
   * final index is front.
   *
   * UI therefore displays the array reversed.
   */

  const displayLayers =
    [
      ...project.layers
    ].reverse();


  for (
    const layer
    of displayLayers
  ) {

    const layerElement =
      createLayerListItem(
        layer
      );


    layerList.appendChild(
      layerElement
    );

  }


  updateLayerButtons();

  updateLayerCount();

}


/* =========================================================
   11. CREATE LAYER LIST ITEM
========================================================= */

function createLayerListItem(
  layer
) {

  const element =
    document.createElement(
      "div"
    );


  element.className =
    "layer-item";


  element.dataset.layerId =
    layer.id;


  element.draggable =
    true;


  if (
    layer.id ===
    getProject().selectedLayerId
  ) {

    element.classList.add(
      "is-selected"
    );

  }


  /* ---------------------------------------------------------
     Drag handle
  --------------------------------------------------------- */

  const dragHandle =
    document.createElement(
      "span"
    );


  dragHandle.className =
    "layer-drag-handle";


  dragHandle.textContent =
    "⋮⋮";


  dragHandle.title =
    "Drag to reorder";


  /* ---------------------------------------------------------
     Thumbnail
  --------------------------------------------------------- */

  const thumbnail =
    document.createElement(
      "div"
    );


  thumbnail.className =
    "layer-thumb";


  const image =
    document.createElement(
      "img"
    );


  image.src =
    layer.src;


  image.alt =
    "";


  thumbnail.appendChild(
    image
  );


  /* ---------------------------------------------------------
     Information
  --------------------------------------------------------- */

  const info =
    document.createElement(
      "div"
    );


  info.className =
    "layer-info";


  const title =
    document.createElement(
      "strong"
    );


  title.textContent =
    layer.name;


  const detail =
    document.createElement(
      "span"
    );


  detail.textContent =
    buildLayerSummary(
      layer
    );


  info.append(
    title,
    detail
  );


  /* ---------------------------------------------------------
     Visibility
  --------------------------------------------------------- */

  const visibilityButton =
    document.createElement(
      "button"
    );


  visibilityButton.className =
    "layer-visibility";


  visibilityButton.type =
    "button";


  visibilityButton.dataset.action =
    "visibility";


  visibilityButton.title =
    layer.visible
      ? "Hide layer"
      : "Show layer";


  visibilityButton.setAttribute(
    "aria-label",
    visibilityButton.title
  );


  visibilityButton.textContent =
    layer.visible
      ? "◉"
      : "○";


  if (!layer.visible) {

    element.style.opacity =
      "0.55";

  }


  element.append(
    dragHandle,
    thumbnail,
    info,
    visibilityButton
  );


  return element;

}


/* =========================================================
   12. LAYER SUMMARY
========================================================= */

function buildLayerSummary(
  layer
) {

  const depth =
    Number(
      layer.depth
    ) || 0;


  const depthText =
    depth > 0
      ? `+${depth}`
      : String(
          depth
        );


  return (
    `Depth ${depthText} · ` +
    `${Math.round(
      layer.opacity * 100
    )}%`
  );

}


/* =========================================================
   13. SELECT LAYER
========================================================= */

function selectLayer(
  layerId
) {

  const layer =
    setSelectedLayerId(
      layerId
    );


  renderLayerList();

  notifyLayerSelectionChanged();


  return layer;

}


/* =========================================================
   14. VISIBILITY TOGGLE
========================================================= */

function toggleLayerVisibility(
  layerId
) {

  const layer =
    getLayerById(
      layerId
    );


  if (!layer) {
    return;
  }


  updateLayer(
    layerId,
    {
      visible:
        !layer.visible
    }
  );


  renderLayerList();

  notifyLayersChanged();

}


/* =========================================================
   15. DELETE SELECTED LAYER
========================================================= */

function deleteSelectedLayer() {

  const selected =
    getSelectedLayer();


  if (!selected) {
    return false;
  }


  paraleasyImageCache.delete(
    selected.id
  );


  const removed =
    removeLayerFromProject(
      selected.id
    );


  if (!removed) {
    return false;
  }


  renderLayerList();

  notifyLayerSelectionChanged();

  notifyLayersChanged();


  setLayerStatus(
    "Layer deleted"
  );


  return true;

}


/* =========================================================
   16. DUPLICATE SELECTED LAYER
========================================================= */

function duplicateSelectedLayer() {

  const selected =
    getSelectedLayer();


  if (!selected) {
    return null;
  }


  const duplicate =
    duplicateLayerInProject(
      selected.id
    );


  if (!duplicate) {
    return null;
  }


  /*
   * Duplicate the decoded browser image cache as well.
   */

  const cachedImage =
    paraleasyImageCache.get(
      selected.id
    );


  if (cachedImage) {

    paraleasyImageCache.set(
      duplicate.id,
      cachedImage
    );

  }


  renderLayerList();

  notifyLayerSelectionChanged();

  notifyLayersChanged();


  setLayerStatus(
    "Layer duplicated"
  );


  return duplicate;

}


/* =========================================================
   17. GET CACHED IMAGE
========================================================= */

function getCachedLayerImage(
  layerId
) {

  return (
    paraleasyImageCache.get(
      layerId
    ) ||
    null
  );

}


/* =========================================================
   18. REBUILD IMAGE CACHE
========================================================= */

/*
 * Needed after loading a saved project.
 *
 * project.js restores the image sources from JSON.
 * This function converts those sources back into Image objects
 * for the renderer.
 */

async function rebuildLayerImageCache() {

  paraleasyImageCache.clear();


  const project =
    getProject();


  const tasks =
    project.layers.map(
      async (
        layer
      ) => {

        if (!layer.src) {
          return;
        }


        try {

          const image =
            await loadImageFromSource(
              layer.src
            );


          paraleasyImageCache.set(
            layer.id,
            image
          );

        } catch (error) {

          console.warn(
            "ParaL-Easy could not restore layer image:",
            layer.name,
            error
          );

        }

      }
    );


  await Promise.all(
    tasks
  );


  notifyLayersChanged();

}


/* =========================================================
   19. UPDATE BUTTON STATE
========================================================= */

function updateLayerButtons() {

  const hasSelection =
    Boolean(
      getSelectedLayer()
    );


  if (
    duplicateLayerButton
  ) {

    duplicateLayerButton.disabled =
      !hasSelection;

  }


  if (
    deleteLayerButton
  ) {

    deleteLayerButton.disabled =
      !hasSelection;

  }

}


/* =========================================================
   20. UPDATE LAYER COUNT
========================================================= */

function updateLayerCount() {

  if (!layerCountElement) {
    return;
  }


  layerCountElement.textContent =
    String(
      getProject()
        .layers
        .length
    );

}


/* =========================================================
   21. DROP ZONE EVENTS
========================================================= */

function initialiseLayerDropZone() {

  if (!layerDropZone) {
    return;
  }


  layerDropZone.addEventListener(
    "dragenter",
    handleLayerDragEnter
  );


  layerDropZone.addEventListener(
    "dragover",
    handleLayerDragOver
  );


  layerDropZone.addEventListener(
    "dragleave",
    handleLayerDragLeave
  );


  layerDropZone.addEventListener(
    "drop",
    handleLayerDrop
  );

}


/* =========================================================
   22. DRAG ENTER
========================================================= */

function handleLayerDragEnter(
  event
) {

  event.preventDefault();


  layerDropZone?.classList.add(
    "is-dragging"
  );

}


/* =========================================================
   23. DRAG OVER
========================================================= */

function handleLayerDragOver(
  event
) {

  event.preventDefault();


  if (
    event.dataTransfer
  ) {

    event.dataTransfer.dropEffect =
      "copy";

  }


  layerDropZone?.classList.add(
    "is-dragging"
  );

}


/* =========================================================
   24. DRAG LEAVE
========================================================= */

function handleLayerDragLeave(
  event
) {

  if (
    !layerDropZone
  ) {
    return;
  }


  const related =
    event.relatedTarget;


  if (
    related &&
    layerDropZone.contains(
      related
    )
  ) {
    return;
  }


  layerDropZone.classList.remove(
    "is-dragging"
  );

}


/* =========================================================
   25. DROP
========================================================= */

async function handleLayerDrop(
  event
) {

  event.preventDefault();


  layerDropZone?.classList.remove(
    "is-dragging"
  );


  const files =
    event.dataTransfer?.files;


  if (!files) {
    return;
  }


  await importLayerFiles(
    files
  );

}


/* =========================================================
   26. FILE INPUT
========================================================= */

function initialiseLayerFileInput() {

  if (!layerFileInput) {
    return;
  }


  layerFileInput.addEventListener(
    "change",
    async () => {

      const files =
        layerFileInput.files;


      if (files) {

        await importLayerFiles(
          files
        );

      }


      /*
       * Clear value so selecting the same image again still
       * fires a change event.
       */

      layerFileInput.value =
        "";

    }
  );

}


/* =========================================================
   27. ADD LAYER BUTTON
========================================================= */

function initialiseAddLayerButton() {

  addLayerButton?.addEventListener(
    "click",
    () => {

      layerFileInput?.click();

    }
  );

}


/* =========================================================
   28. LAYER LIST CLICK
========================================================= */

function initialiseLayerListEvents() {

  if (!layerList) {
    return;
  }


  layerList.addEventListener(
    "click",
    (
      event
    ) => {

      const target =
        event.target;


      if (
        !(target instanceof Element)
      ) {
        return;
      }


      const layerElement =
        target.closest(
          ".layer-item"
        );


      if (!layerElement) {
        return;
      }


      const layerId =
        layerElement.dataset.layerId;


      if (!layerId) {
        return;
      }


      if (
        target.closest(
          '[data-action="visibility"]'
        )
      ) {

        event.stopPropagation();

        toggleLayerVisibility(
          layerId
        );

        return;

      }


      selectLayer(
        layerId
      );

    }
  );

}


/* =========================================================
   29. DUPLICATE / DELETE BUTTONS
========================================================= */

function initialiseLayerActionButtons() {

  duplicateLayerButton?.addEventListener(
    "click",
    () => {

      duplicateSelectedLayer();

    }
  );


  deleteLayerButton?.addEventListener(
    "click",
    () => {

      deleteSelectedLayer();

    }
  );

}


/* =========================================================
   30. DRAG REORDER STATE
========================================================= */

let draggedLayerId =
  null;


/* =========================================================
   31. DRAG REORDER EVENTS
========================================================= */

function initialiseLayerReordering() {

  if (!layerList) {
    return;
  }


  layerList.addEventListener(
    "dragstart",
    (
      event
    ) => {

      const target =
        event.target;


      if (
        !(target instanceof Element)
      ) {
        return;
      }


      const layerElement =
        target.closest(
          ".layer-item"
        );


      if (!layerElement) {
        return;
      }


      draggedLayerId =
        layerElement.dataset.layerId ||
        null;


      layerElement.classList.add(
        "is-dragging"
      );


      if (
        event.dataTransfer
      ) {

        event.dataTransfer.effectAllowed =
          "move";

      }

    }
  );


  layerList.addEventListener(
    "dragend",
    (
      event
    ) => {

      const target =
        event.target;


      if (
        target instanceof Element
      ) {

        target
          .closest(
            ".layer-item"
          )
          ?.classList.remove(
            "is-dragging"
          );

      }


      draggedLayerId =
        null;

    }
  );


  layerList.addEventListener(
    "dragover",
    (
      event
    ) => {

      if (!draggedLayerId) {
        return;
      }


      event.preventDefault();


      if (
        event.dataTransfer
      ) {

        event.dataTransfer.dropEffect =
          "move";

      }

    }
  );


  layerList.addEventListener(
    "drop",
    (
      event
    ) => {

      if (!draggedLayerId) {
        return;
      }


      event.preventDefault();


      const target =
        event.target;


      if (
        !(target instanceof Element)
      ) {
        return;
      }


      const targetLayerElement =
        target.closest(
          ".layer-item"
        );


      if (!targetLayerElement) {
        return;
      }


      const targetLayerId =
        targetLayerElement
          .dataset
          .layerId;


      if (
        !targetLayerId ||
        targetLayerId ===
          draggedLayerId
      ) {
        return;
      }


      reorderLayerByDisplayedPosition(
        draggedLayerId,
        targetLayerId
      );

    }
  );

}


/* =========================================================
   32. REORDER BY DISPLAY POSITION
========================================================= */

function reorderLayerByDisplayedPosition(
  draggedId,
  targetId
) {

  const project =
    getProject();


  const draggedIndex =
    project.layers.findIndex(
      (
        layer
      ) =>
        layer.id ===
        draggedId
    );


  const targetIndex =
    project.layers.findIndex(
      (
        layer
      ) =>
        layer.id ===
        targetId
    );


  if (
    draggedIndex === -1 ||
    targetIndex === -1
  ) {
    return;
  }


  /*
   * The UI is visually reversed compared with painter order.
   * Moving to the target project's actual array index still
   * produces the correct front/back result after rerender.
   */

  moveLayerInProject(
    draggedId,
    targetIndex
  );


  renderLayerList();

  notifyLayersChanged();


  setLayerStatus(
    "Layer order updated"
  );

}


/* =========================================================
   33. NOTIFY LAYER CHANGES
========================================================= */

/*
 * We use browser CustomEvents so layers.js doesn't need to
 * know how the inspector or canvas renderer work.
 *
 * app.js and parallax-engine.js can listen for these.
 */

function notifyLayersChanged() {

  window.dispatchEvent(
    new CustomEvent(
      "paraleasy:layerschanged",
      {
        detail: {
          project:
            getProject()
        }
      }
    )
  );

}


/* =========================================================
   34. NOTIFY SELECTION
========================================================= */

function notifyLayerSelectionChanged() {

  window.dispatchEvent(
    new CustomEvent(
      "paraleasy:selectionchanged",
      {
        detail: {
          layer:
            getSelectedLayer()
        }
      }
    )
  );

}


/* =========================================================
   35. STATUS MESSAGE
========================================================= */

function setLayerStatus(
  message
) {

  window.dispatchEvent(
    new CustomEvent(
      "paraleasy:status",
      {
        detail: {
          message:
            String(
              message || ""
            )
        }
      }
    )
  );

}


/* =========================================================
   36. INITIALISE
========================================================= */

function initialiseLayers() {

  initialiseLayerDropZone();

  initialiseLayerFileInput();

  initialiseAddLayerButton();

  initialiseLayerListEvents();

  initialiseLayerActionButtons();

  initialiseLayerReordering();


  renderLayerList();

}


/* =========================================================
   37. AUTO START
========================================================= */

if (
  document.readyState ===
    "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initialiseLayers
  );

} else {

  initialiseLayers();

}
