"use strict";

/* =========================================================
   PAINTLESS
   FILE OPENING, IMAGE IMPORT AND EXPORT SYSTEM — v0.3
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


  /*
   * Open Image creates a completely new document.
   */

  const imageFileInput =
    byId(
      "image-file-input"
    );


  const openImageButton =
    byId(
      "open-image-button"
    );


  /*
   * Import Image adds the selected image to the existing
   * document as a completely new layer.
   */

  const importImageFileInput =
    byId(
      "import-image-file-input"
    );


  const importImageButton =
    byId(
      "import-image-button"
    );


  const importLayerButton =
    byId(
      "import-layer-button"
    );


  const addLayerButton =
    byId(
      "add-layer-button"
    );


  /*
   * Export controls.
   */

  const exportButton =
    byId(
      "export-button"
    );


  const exportDialog =
    byId(
      "export-dialog"
    );


  const exportFileNameInput =
    byId(
      "export-file-name"
    );


  const exportFormatSelect =
    byId(
      "export-format"
    );


  const exportQualityInput =
    byId(
      "export-quality"
    );


  const confirmExportButton =
    byId(
      "confirm-export-button"
    );


  /*
   * Status and loading screen.
   */

  const saveStatus =
    byId(
      "save-status"
    );


  const loadingScreen =
    byId(
      "loading-screen"
    );


  const loadingMessage =
    byId(
      "loading-message"
    );


  const loadingProgress =
    byId(
      "loading-progress"
    );


  const loadingPercentage =
    byId(
      "loading-percentage"
    );


  /* =======================================================
     2. FILE STATE
  ======================================================= */

  const supportedImageTypes = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif"
  ];


  const maximumFileSize =
    40 *
    1024 *
    1024;


  let loadingSequenceId =
    0;


  let requestedFileAction =
    null;


  /* =======================================================
     3. PAINTLESS API HELPERS
  ======================================================= */

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


  function getHistoryApi() {

    return (
      window.PaintlessHistory ||
      null
    );

  }


  function dispatchFileEvent(
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


  function setStatusMessage(
    message
  ) {

    if (saveStatus) {

      saveStatus.textContent =
        message;

    }


    dispatchFileEvent(
      "paintless:status-message",
      {
        message
      }
    );

  }


  function delay(
    milliseconds
  ) {

    return new Promise(
      (resolve) => {

        window.setTimeout(
          resolve,
          milliseconds
        );

      }
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


  /* =======================================================
     4. FILE-NAME HELPERS
  ======================================================= */

  function cleanFileName(
    fileName
  ) {

    const withoutExtension =
      String(
        fileName ||
        ""
      )
        .replace(
          /\.[^/.]+$/,
          ""
        )
        .trim();


    const cleanedName =
      withoutExtension
        .replace(
          /[<>:"/\\|?*\u0000-\u001F]/g,
          "-"
        )
        .replace(
          /\s+/g,
          " "
        )
        .slice(
          0,
          120
        );


    return (
      cleanedName ||
      "Untitled Masterpiece"
    );

  }


  function createDownloadName(
    fileName,
    extension
  ) {

    const cleanedName =
      cleanFileName(
        fileName
      )
        .replace(
          /\s+/g,
          "-"
        )
        .replace(
          /-+/g,
          "-"
        )
        .replace(
          /^-+|-+$/g,
          ""
        )
        .toLowerCase();


    return (
      `${
        cleanedName ||
        "paintless-masterpiece"
      }.${extension}`
    );

  }


  function getExtensionForMimeType(
    mimeType
  ) {

    const extensionMap = {

      "image/png":
        "png",

      "image/jpeg":
        "jpg",

      "image/webp":
        "webp"

    };


    return (
      extensionMap[
        mimeType
      ] ||
      "png"
    );

  }


  /* =======================================================
     5. LOADING SCREEN
  ======================================================= */

  function updateLoadingScreen(
    percentage,
    message
  ) {

    const safePercentage =
      clamp(
        percentage,
        0,
        100
      );


    if (loadingProgress) {

      loadingProgress.style.width =
        `${safePercentage}%`;

    }


    if (loadingPercentage) {

      loadingPercentage.textContent =
        `${Math.round(
          safePercentage
        )}%`;

    }


    if (
      loadingMessage &&
      message
    ) {

      loadingMessage.textContent =
        message;

    }

  }


  function showLoadingScreen(
    message =
      "Loading creativity..."
  ) {

    loadingSequenceId +=
      1;


    updateLoadingScreen(
      0,
      message
    );


    loadingScreen?.classList.add(
      "is-visible"
    );


    loadingScreen?.setAttribute(
      "aria-hidden",
      "false"
    );


    return loadingSequenceId;

  }


  function hideLoadingScreen(
    sequenceId
  ) {

    if (
      sequenceId !== undefined &&
      sequenceId !== loadingSequenceId
    ) {

      return;

    }


    loadingScreen?.classList.remove(
      "is-visible"
    );


    loadingScreen?.setAttribute(
      "aria-hidden",
      "true"
    );

  }


  /*
   * This is intentionally slower than the old loading sequence.
   * The jokes now remain visible long enough to actually read.
   */

  async function playPaintlessLoadingSequence({
    openingMessage =
      "Loading creativity...",

    finalMessage =
      "Ready."
  } = {}) {

    const sequenceId =
      showLoadingScreen(
        openingMessage
      );


    const loadingSteps = [

      {
        percentage:
          12,

        message:
          "Waking up the pixels...",

        wait:
          620
      },

      {
        percentage:
          31,

        message:
          "Loading brushes...",

        wait:
          680
      },

      {
        percentage:
          57,

        message:
          "Politely asking layers to cooperate...",

        wait:
          760
      },

      {
        percentage:
          78,

        message:
          "Looking for Ctrl+Z...",

        wait:
          720
      },

      {
        percentage:
          99,

        message:
          "Loading creativity...",

        wait:
          700
      }

    ];


    for (
      const step of loadingSteps
    ) {

      if (
        sequenceId !==
        loadingSequenceId
      ) {

        return sequenceId;

      }


      await delay(
        step.wait
      );


      updateLoadingScreen(
        step.percentage,
        step.message
      );

    }


    await delay(
      850
    );


    updateLoadingScreen(
      99,
      "Just kidding..."
    );


    await delay(
      1200
    );


    updateLoadingScreen(
      100,
      finalMessage
    );


    await delay(
      600
    );


    hideLoadingScreen(
      sequenceId
    );


    return sequenceId;

  }


  /* =======================================================
     6. FILE VALIDATION
  ======================================================= */

  function validateImageFile(
    file
  ) {

    if (!file) {

      return {

        valid:
          false,

        message:
          "No file was selected."

      };

    }


    if (
      !supportedImageTypes.includes(
        file.type
      )
    ) {

      return {

        valid:
          false,

        message:
          "Paintless currently supports PNG, JPEG, WebP and GIF images."

      };

    }


    if (
      file.size >
      maximumFileSize
    ) {

      return {

        valid:
          false,

        message:
          "That image is larger than 40 MB. The pixels have become too powerful."

      };

    }


    return {

      valid:
        true,

      message:
        ""

    };

  }


  /* =======================================================
     7. IMAGE DECODING
  ======================================================= */

  function loadImageFromFile(
    file
  ) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const objectUrl =
          URL.createObjectURL(
            file
          );


        const image =
          new Image();


        image.decoding =
          "async";


        image.onload =
          () => {

            URL.revokeObjectURL(
              objectUrl
            );


            resolve(
              image
            );

          };


        image.onerror =
          () => {

            URL.revokeObjectURL(
              objectUrl
            );


            reject(
              new Error(
                "The image could not be decoded."
              )
            );

          };


        image.src =
          objectUrl;

      }
    );

  }


  function getImageDimensions(
    image
  ) {

    return {

      width:
        image.naturalWidth ||
        image.width ||
        0,

      height:
        image.naturalHeight ||
        image.height ||
        0

    };

  }


  /* =======================================================
     8. OPEN IMAGE AS NEW DOCUMENT
  ======================================================= */

  async function openImageFile(
    file
  ) {

    const validation =
      validateImageFile(
        file
      );


    if (!validation.valid) {

      setStatusMessage(
        validation.message
      );


      return false;

    }


    const layersApi =
      getLayersApi();


    const canvasApi =
      getCanvasApi();


    if (
      !layersApi ||
      !canvasApi
    ) {

      setStatusMessage(
        "Paintless is still assembling itself."
      );


      return false;

    }


    const sequenceId =
      showLoadingScreen(
        "Opening image..."
      );


    try {

      updateLoadingScreen(
        8,
        "Reading pixels..."
      );


      await delay(
        420
      );


      const image =
        await loadImageFromFile(
          file
        );


      updateLoadingScreen(
        28,
        "Measuring masterpiece..."
      );


      await delay(
        520
      );


      const {
        width:
          imageWidth,

        height:
          imageHeight
      } =
        getImageDimensions(
          image
        );


      if (
        !imageWidth ||
        !imageHeight
      ) {

        throw new Error(
          "The image has invalid dimensions."
        );

      }


      updateLoadingScreen(
        48,
        "Building a fresh canvas..."
      );


      await delay(
        560
      );


      layersApi.resetDocument({
        width:
          imageWidth,

        height:
          imageHeight,

        background:
          "transparent"
      });


      const baseLayer =
        layersApi.getActiveLayer();


      if (!baseLayer) {

        throw new Error(
          "Paintless could not create the image layer."
        );

      }


      baseLayer.name =
        cleanFileName(
          file.name
        );


      baseLayer.context.clearRect(
        0,
        0,
        imageWidth,
        imageHeight
      );


      baseLayer.context.drawImage(
        image,
        0,
        0,
        imageWidth,
        imageHeight
      );


      layersApi.renderLayerList?.();

      layersApi.renderLayers?.();


      canvasApi.setDocumentName?.(
        cleanFileName(
          file.name
        )
      );


      canvasApi.showCanvas?.();

      canvasApi.updateStageDimensions?.();

      canvasApi.updateDocumentInformation?.();


      updateLoadingScreen(
        72,
        "Teaching pixels to behave..."
      );


      await delay(
        700
      );


      canvasApi.fitCanvasToScreen?.();


      updateLoadingScreen(
        99,
        "Almost ready..."
      );


      await delay(
        900
      );


      updateLoadingScreen(
        99,
        "Just kidding..."
      );


      await delay(
        1250
      );


      updateLoadingScreen(
        100,
        "Image loaded."
      );


      await delay(
        550
      );


      hideLoadingScreen(
        sequenceId
      );


      getHistoryApi()
        ?.resetHistory?.(
          "Open image"
        );


      setStatusMessage(
        `${file.name} opened successfully.`
      );


      dispatchFileEvent(
        "paintless:file-opened",
        {
          file,

          width:
            imageWidth,

          height:
            imageHeight
        }
      );


      return true;

    } catch (error) {

      console.error(
        "Paintless could not open the image:",
        error
      );


      hideLoadingScreen(
        sequenceId
      );


      setStatusMessage(
        "Paintless could not open that image."
      );


      return false;

    } finally {

      if (imageFileInput) {

        imageFileInput.value =
          "";

      }

    }

  }


  function requestOpenImage() {

    requestedFileAction =
      "open";


    if (imageFileInput) {

      imageFileInput.value =
        "";

      imageFileInput.click();

    }

  }


  /* =======================================================
     9. CREATE A NEW IMPORT LAYER
  ======================================================= */

  function createImportedLayer(
    layerName
  ) {

    const layersApi =
      getLayersApi();


    if (!layersApi) {

      return null;

    }


    let createdLayer =
      null;


    /*
     * First try the public layer functions.
     */

    const possibleLayerFunctions = [
      "addLayer",
      "createLayer",
      "addBlankLayer",
      "newLayer"
    ];


    for (
      const functionName of
      possibleLayerFunctions
    ) {

      if (
        typeof layersApi[
          functionName
        ] ===
        "function"
      ) {

        const result =
          layersApi[
            functionName
          ](
            layerName
          );


        createdLayer =
          result ||
          layersApi.getActiveLayer?.() ||
          null;


        if (createdLayer) {

          break;

        }

      }

    }


    /*
     * Fallback:
     * use the existing Add Layer button because layers.js is
     * already listening to it.
     */

    if (
      !createdLayer &&
      addLayerButton
    ) {

      addLayerButton.click();


      createdLayer =
        layersApi.getActiveLayer?.() ||
        null;

    }


    if (
      createdLayer &&
      layerName
    ) {

      createdLayer.name =
        layerName;

    }


    return createdLayer;

  }


  /* =======================================================
     10. IMPORT IMAGE AS A NEW LAYER
  ======================================================= */

  async function importImageAsLayer(
    file
  ) {

    const validation =
      validateImageFile(
        file
      );


    if (!validation.valid) {

      setStatusMessage(
        validation.message
      );


      return false;

    }


    const layersApi =
      getLayersApi();


    const canvasApi =
      getCanvasApi();


    if (
      !layersApi ||
      !canvasApi
    ) {

      setStatusMessage(
        "Paintless is still assembling itself."
      );


      return false;

    }


    /*
     * Import needs an existing canvas.
     * If no document exists, opening as a new image is the
     * friendliest behaviour.
     */

    if (
      !canvasApi.isDocumentOpen?.()
    ) {

      return openImageFile(
        file
      );

    }


    const sequenceId =
      showLoadingScreen(
        "Importing image..."
      );


    try {

      updateLoadingScreen(
        10,
        "Reading imported pixels..."
      );


      await delay(
        450
      );


      const image =
        await loadImageFromFile(
          file
        );


      const {
        width:
          imageWidth,

        height:
          imageHeight
      } =
        getImageDimensions(
          image
        );


      if (
        !imageWidth ||
        !imageHeight
      ) {

        throw new Error(
          "The imported image has invalid dimensions."
        );

      }


      updateLoadingScreen(
        34,
        "Finding somewhere nice to put it..."
      );


      await delay(
        620
      );


      const documentSize =
        layersApi.getDocumentSize?.() ||
        {
          width:
            0,

          height:
            0
        };


      const documentWidth =
        Number(
          documentSize.width
        ) ||
        1;


      const documentHeight =
        Number(
          documentSize.height
        ) ||
        1;


      /*
       * Oversized images are reduced so that they fit inside
       * the current document while preserving their ratio.
       *
       * Smaller images remain at their original size.
       */

      const scale =
        Math.min(
          1,
          documentWidth /
            imageWidth,
          documentHeight /
            imageHeight
        );


      const drawWidth =
        Math.max(
          1,
          Math.round(
            imageWidth *
            scale
          )
        );


      const drawHeight =
        Math.max(
          1,
          Math.round(
            imageHeight *
            scale
          )
        );


      const drawX =
        Math.round(
          (
            documentWidth -
            drawWidth
          ) /
          2
        );


      const drawY =
        Math.round(
          (
            documentHeight -
            drawHeight
          ) /
          2
        );


      updateLoadingScreen(
        57,
        "Creating a brand-new layer..."
      );


      await delay(
        650
      );


      const importedLayer =
        createImportedLayer(
          cleanFileName(
            file.name
          )
        );


      if (
        !importedLayer ||
        !importedLayer.context
      ) {

        throw new Error(
          "Paintless could not create the imported layer."
        );

      }


      importedLayer.context.clearRect(
        0,
        0,
        importedLayer.canvas.width,
        importedLayer.canvas.height
      );


      importedLayer.context.drawImage(
        image,
        drawX,
        drawY,
        drawWidth,
        drawHeight
      );


      importedLayer.name =
        cleanFileName(
          file.name
        );


      layersApi.renderLayerList?.();

      layersApi.renderLayers?.();


      updateLoadingScreen(
        78,
        "Centring the masterpiece..."
      );


      await delay(
        700
      );


      updateLoadingScreen(
        99,
        "Almost imported..."
      );


      await delay(
        850
      );


      updateLoadingScreen(
        99,
        "Just kidding..."
      );


      await delay(
        1150
      );


      updateLoadingScreen(
        100,
        "Image imported."
      );


      await delay(
        550
      );


      hideLoadingScreen(
        sequenceId
      );


      /*
       * Save the result as one clean Undo step.
       */

      if (
        typeof getHistoryApi()
          ?.saveHistory ===
        "function"
      ) {

        getHistoryApi()
          .saveHistory(
            "Import image"
          );

      } else {

        dispatchFileEvent(
          "paintless:history-requested",
          {
            reason:
              "Import image"
          }
        );

      }


      setStatusMessage(
        `${file.name} imported as a new layer.`
      );


      dispatchFileEvent(
        "paintless:image-imported",
        {
          file,

          layer:
            importedLayer,

          originalWidth:
            imageWidth,

          originalHeight:
            imageHeight,

          width:
            drawWidth,

          height:
            drawHeight,

          x:
            drawX,

          y:
            drawY
        }
      );


      return true;

    } catch (error) {

      console.error(
        "Paintless could not import the image:",
        error
      );


      hideLoadingScreen(
        sequenceId
      );


      setStatusMessage(
        "Paintless could not import that image."
      );


      return false;

    } finally {

      if (importImageFileInput) {

        importImageFileInput.value =
          "";

      }

    }

  }


  function requestImportImage() {

    const canvasApi =
      getCanvasApi();


    /*
     * If no document exists, use the regular Open Image picker.
     */

    if (
      !canvasApi?.isDocumentOpen?.()
    ) {

      requestOpenImage();


      return;

    }


    requestedFileAction =
      "import";


    if (importImageFileInput) {

      importImageFileInput.value =
        "";

      importImageFileInput.click();

    }

  }


  /* =======================================================
     11. COMPOSITE EXPORT CANVAS
  ======================================================= */

  function createCompositeCanvas(
    mimeType
  ) {

    const layersApi =
      getLayersApi();


    if (!layersApi) {

      return null;

    }


    const {
      width,
      height
    } =
      layersApi.getDocumentSize();


    const exportCanvas =
      document.createElement(
        "canvas"
      );


    exportCanvas.width =
      width;

    exportCanvas.height =
      height;


    const exportContext =
      exportCanvas.getContext(
        "2d",
        {
          alpha:
            true
        }
      );


    /*
     * JPEG cannot preserve transparency.
     */

    if (
      mimeType ===
      "image/jpeg"
    ) {

      exportContext.fillStyle =
        "#ffffff";


      exportContext.fillRect(
        0,
        0,
        width,
        height
      );

    }


    layersApi.layers.forEach(
      (layer) => {

        if (
          !layer.visible ||
          layer.opacity <= 0
        ) {

          return;

        }


        exportContext.save();


        exportContext.globalAlpha =
          layer.opacity;


        exportContext.globalCompositeOperation =
          layer.blendMode;


        exportContext.drawImage(
          layer.canvas,
          0,
          0
        );


        exportContext.restore();

      }
    );


    return exportCanvas;

  }


  function canvasToBlob(
    canvas,
    mimeType,
    quality
  ) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        canvas.toBlob(
          (blob) => {

            if (!blob) {

              reject(
                new Error(
                  "The browser could not create the export file."
                )
              );


              return;

            }


            resolve(
              blob
            );

          },
          mimeType,
          quality
        );

      }
    );

  }


  function downloadBlob(
    blob,
    fileName
  ) {

    const downloadUrl =
      URL.createObjectURL(
        blob
      );


    const downloadLink =
      document.createElement(
        "a"
      );


    downloadLink.href =
      downloadUrl;


    downloadLink.download =
      fileName;


    document.body.appendChild(
      downloadLink
    );


    downloadLink.click();


    downloadLink.remove();


    window.setTimeout(
      () => {

        URL.revokeObjectURL(
          downloadUrl
        );

      },
      1000
    );

  }


  /* =======================================================
     12. EXPORT DIALOG
  ======================================================= */

  function openExportDialog() {

    const canvasApi =
      getCanvasApi();


    if (
      !canvasApi?.isDocumentOpen?.()
    ) {

      setStatusMessage(
        "Open or create a document before exporting."
      );


      return false;

    }


    if (exportFileNameInput) {

      exportFileNameInput.value =
        canvasApi.getDocumentName?.() ||
        "paintless-masterpiece";

    }


    if (
      exportDialog &&
      typeof exportDialog.showModal ===
        "function"
    ) {

      exportDialog.showModal();

    }


    return true;

  }


  function closeExportDialog() {

    if (
      exportDialog?.open
    ) {

      exportDialog.close();

    }

  }


  /* =======================================================
     13. EXPORT IMAGE
  ======================================================= */

  async function exportImage({
    fileName,
    mimeType,
    quality
  } = {}) {

    const canvasApi =
      getCanvasApi();


    if (
      !canvasApi?.isDocumentOpen?.()
    ) {

      setStatusMessage(
        "There is currently nothing to export."
      );


      return false;

    }


    const selectedMimeType =
      supportedImageTypes.includes(
        mimeType
      ) &&
      mimeType !==
        "image/gif"
        ? mimeType
        : "image/png";


    const selectedQuality =
      clamp(
        Number(
          quality
        ) ||
        0.92,
        0.1,
        1
      );


    const extension =
      getExtensionForMimeType(
        selectedMimeType
      );


    const downloadName =
      createDownloadName(
        fileName ||
        canvasApi.getDocumentName?.(),
        extension
      );


    const sequenceId =
      showLoadingScreen(
        "Preparing export..."
      );


    try {

      updateLoadingScreen(
        18,
        "Collecting layers..."
      );


      await delay(
        450
      );


      const compositeCanvas =
        createCompositeCanvas(
          selectedMimeType
        );


      if (!compositeCanvas) {

        throw new Error(
          "No canvas is available."
        );

      }


      updateLoadingScreen(
        48,
        "Compressing pixels..."
      );


      const blob =
        await canvasToBlob(
          compositeCanvas,
          selectedMimeType,
          selectedQuality
        );


      await delay(
        650
      );


      updateLoadingScreen(
        76,
        "Removing unnecessary nonsense..."
      );


      await delay(
        700
      );


      updateLoadingScreen(
        99,
        "Admiring it first..."
      );


      await delay(
        1050
      );


      updateLoadingScreen(
        100,
        "Export complete."
      );


      downloadBlob(
        blob,
        downloadName
      );


      await delay(
        550
      );


      hideLoadingScreen(
        sequenceId
      );


      closeExportDialog();


      setStatusMessage(
        `${downloadName} exported successfully.`
      );


      dispatchFileEvent(
        "paintless:file-exported",
        {
          fileName:
            downloadName,

          mimeType:
            selectedMimeType,

          size:
            blob.size
        }
      );


      return true;

    } catch (error) {

      console.error(
        "Paintless export failed:",
        error
      );


      hideLoadingScreen(
        sequenceId
      );


      setStatusMessage(
        "Export failed. The pixels have filed a complaint."
      );


      return false;

    }

  }


  async function confirmExport() {

    const mimeType =
      exportFormatSelect?.value ||
      "image/png";


    const qualityPercentage =
      Number(
        exportQualityInput?.value ||
        92
      );


    await exportImage({
      fileName:
        exportFileNameInput?.value ||
        "paintless-masterpiece",

      mimeType,

      quality:
        qualityPercentage /
        100
    });

  }


  /* =======================================================
     14. DRAG AND DROP
  ======================================================= */

  function containsImageFile(
    dataTransfer
  ) {

    if (!dataTransfer) {

      return false;

    }


    return Array.from(
      dataTransfer.items ||
      []
    ).some(
      (item) =>
        item.kind ===
          "file" &&
        supportedImageTypes.includes(
          item.type
        )
    );

  }


  function handleDragOver(
    event
  ) {

    if (
      !containsImageFile(
        event.dataTransfer
      )
    ) {

      return;

    }


    event.preventDefault();


    if (event.dataTransfer) {

      event.dataTransfer.dropEffect =
        "copy";

    }


    document.body.classList.add(
      "is-dragging-image"
    );

  }


  function handleDragLeave(
    event
  ) {

    if (
      event.relatedTarget
    ) {

      return;

    }


    document.body.classList.remove(
      "is-dragging-image"
    );

  }


  async function handleDrop(
    event
  ) {

    document.body.classList.remove(
      "is-dragging-image"
    );


    const files =
      Array.from(
        event.dataTransfer?.files ||
        []
      );


    const imageFile =
      files.find(
        (file) =>
          supportedImageTypes.includes(
            file.type
          )
      );


    if (!imageFile) {

      return;

    }


    event.preventDefault();


    const canvasApi =
      getCanvasApi();


    if (
      canvasApi?.isDocumentOpen?.()
    ) {

      await importImageAsLayer(
        imageFile
      );

    } else {

      await openImageFile(
        imageFile
      );

    }

  }


  /* =======================================================
     15. CLIPBOARD IMAGE PASTE
  ======================================================= */

  async function handleClipboardPaste(
    event
  ) {

    const activeElement =
      document.activeElement;


    const typing =
      activeElement &&
      (
        activeElement.tagName ===
          "INPUT" ||
        activeElement.tagName ===
          "TEXTAREA" ||
        activeElement.isContentEditable
      );


    if (typing) {

      return;

    }


    const clipboardItems =
      Array.from(
        event.clipboardData?.items ||
        []
      );


    const imageItem =
      clipboardItems.find(
        (item) =>
          item.kind ===
            "file" &&
          item.type.startsWith(
            "image/"
          )
      );


    if (!imageItem) {

      return;

    }


    const imageFile =
      imageItem.getAsFile();


    if (!imageFile) {

      return;

    }


    event.preventDefault();


    const canvasApi =
      getCanvasApi();


    if (
      canvasApi?.isDocumentOpen?.()
    ) {

      await importImageAsLayer(
        imageFile
      );

    } else {

      await openImageFile(
        imageFile
      );

    }

  }


  /* =======================================================
     16. FILE INPUT EVENTS
  ======================================================= */

  imageFileInput?.addEventListener(
    "change",
    async () => {

      const selectedFile =
        imageFileInput.files?.[0];


      if (selectedFile) {

        await openImageFile(
          selectedFile
        );

      }


      requestedFileAction =
        null;

    }
  );


  importImageFileInput?.addEventListener(
    "change",
    async () => {

      const selectedFile =
        importImageFileInput.files?.[0];


      if (selectedFile) {

        await importImageAsLayer(
          selectedFile
        );

      }


      requestedFileAction =
        null;

    }
  );


  /* =======================================================
     17. BUTTON EVENTS
  ======================================================= */

  openImageButton?.addEventListener(
    "click",
    requestOpenImage
  );


  importImageButton?.addEventListener(
    "click",
    requestImportImage
  );


  importLayerButton?.addEventListener(
    "click",
    requestImportImage
  );


  exportButton?.addEventListener(
    "click",
    openExportDialog
  );


  confirmExportButton?.addEventListener(
    "click",
    (event) => {

      event.preventDefault();


      confirmExport();

    }
  );


  exportFormatSelect?.addEventListener(
    "change",
    () => {

      if (!exportQualityInput) {

        return;

      }


      const losslessFormat =
        exportFormatSelect.value ===
        "image/png";


      exportQualityInput.disabled =
        losslessFormat;


      exportQualityInput.title =
        losslessFormat
          ? "PNG export is lossless."
          : "Export quality";

    }
  );


  /* =======================================================
     18. WINDOW EVENTS
  ======================================================= */

  window.addEventListener(
    "dragover",
    handleDragOver
  );


  window.addEventListener(
    "dragleave",
    handleDragLeave
  );


  window.addEventListener(
    "drop",
    handleDrop
  );


  window.addEventListener(
    "paste",
    handleClipboardPaste
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


      const modifierPressed =
        event.ctrlKey ||
        event.metaKey;


      if (
        modifierPressed &&
        event.key.toLowerCase() ===
          "o"
      ) {

        event.preventDefault();


        requestOpenImage();

      }


      if (
        modifierPressed &&
        event.key.toLowerCase() ===
          "s"
      ) {

        event.preventDefault();


        openExportDialog();

      }


      /*
       * Ctrl/Command + Shift + O imports an image as a layer.
       */

      if (
        modifierPressed &&
        event.shiftKey &&
        event.key.toLowerCase() ===
          "o"
      ) {

        event.preventDefault();


        requestImportImage();

      }

    }
  );


  /* =======================================================
     19. PUBLIC API
  ======================================================= */

  window.PaintlessFiles = {

    requestOpenImage,

    requestImportImage,

    openImageFile,

    importImageAsLayer,

    openExportDialog,

    closeExportDialog,

    exportImage,

    validateImageFile,

    showLoadingScreen,

    hideLoadingScreen,

    updateLoadingScreen,

    playPaintlessLoadingSequence,

    cleanFileName,


    getSupportedImageTypes() {

      return [
        ...supportedImageTypes
      ];

    }

  };


  /* =======================================================
     20. INITIAL STATE
  ======================================================= */

  if (
    exportFormatSelect &&
    exportQualityInput
  ) {

    exportQualityInput.disabled =
      exportFormatSelect.value ===
      "image/png";

  }


  console.log(
    "%cPaintless files ready — Open and Import are connected.",
    [
      "color:#69f59c",
      "font-weight:bold",
      "font-size:13px"
    ].join(";")
  );

})();
