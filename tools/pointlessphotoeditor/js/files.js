"use strict";

/* =========================================================
   PAINTLESS
   FILE OPENING AND EXPORT SYSTEM
========================================================= */

(() => {

  /* =======================================================
     1. DOM REFERENCES
  ======================================================= */

  const imageFileInput =
    document.getElementById(
      "image-file-input"
    );

  const openImageButton =
    document.getElementById(
      "open-image-button"
    );

  const exportButton =
    document.getElementById(
      "export-button"
    );

  const exportDialog =
    document.getElementById(
      "export-dialog"
    );

  const exportFileNameInput =
    document.getElementById(
      "export-file-name"
    );

  const exportFormatSelect =
    document.getElementById(
      "export-format"
    );

  const exportQualityInput =
    document.getElementById(
      "export-quality"
    );

  const confirmExportButton =
    document.getElementById(
      "confirm-export-button"
    );

  const saveStatus =
    document.getElementById(
      "save-status"
    );

  const loadingScreen =
    document.getElementById(
      "loading-screen"
    );

  const loadingMessage =
    document.getElementById(
      "loading-message"
    );

  const loadingProgress =
    document.getElementById(
      "loading-progress"
    );

  const loadingPercentage =
    document.getElementById(
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
    40 * 1024 * 1024;

  let loadingSequenceId = 0;


  /* =======================================================
     3. HELPERS
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


  function cleanFileName(
    fileName
  ) {

    const withoutExtension =
      String(fileName || "")
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
      `${cleanedName || "paintless-masterpiece"}.${extension}`
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
     4. LOADING SCREEN
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

    loadingSequenceId += 1;


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


  async function playPaintlessLoadingSequence(
    {
      openingMessage =
        "Loading creativity...",

      finalMessage =
        "Ready."
    } = {}
  ) {

    const sequenceId =
      showLoadingScreen(
        openingMessage
      );


    const loadingSteps = [

      {
        percentage:
          12,

        message:
          "Waking up the pixels..."
      },

      {
        percentage:
          31,

        message:
          "Loading brushes..."
      },

      {
        percentage:
          57,

        message:
          "Politely asking layers to cooperate..."
      },

      {
        percentage:
          78,

        message:
          "Looking for Ctrl+Z..."
      },

      {
        percentage:
          99,

        message:
          "Loading creativity..."
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
        115
      );


      updateLoadingScreen(
        step.percentage,
        step.message
      );

    }


    await delay(
      420
    );


    updateLoadingScreen(
      99,
      "Just kidding..."
    );


    await delay(
      650
    );


    updateLoadingScreen(
      100,
      finalMessage
    );


    await delay(
      260
    );


    hideLoadingScreen(
      sequenceId
    );


    return sequenceId;

  }


  /* =======================================================
     5. FILE VALIDATION
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
     6. IMAGE LOADING
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
        12,
        "Reading pixels..."
      );


      const image =
        await loadImageFromFile(
          file
        );


      updateLoadingScreen(
        35,
        "Measuring masterpiece..."
      );


      const imageWidth =
        image.naturalWidth ||
        image.width;

      const imageHeight =
        image.naturalHeight ||
        image.height;


      if (
        !imageWidth ||
        !imageHeight
      ) {

        throw new Error(
          "The image has invalid dimensions."
        );

      }


      updateLoadingScreen(
        55,
        "Building layers..."
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


      if (baseLayer) {

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

      }


      layersApi.renderLayerList();

      layersApi.renderLayers();


      canvasApi.setDocumentName(
        cleanFileName(
          file.name
        )
      );


      canvasApi.showCanvas();

      canvasApi.updateStageDimensions();

      canvasApi.updateDocumentInformation();


      updateLoadingScreen(
        79,
        "Teaching pixels to behave..."
      );


      await delay(
        150
      );


      canvasApi.fitCanvasToScreen();


      updateLoadingScreen(
        99,
        "Almost ready..."
      );


      await delay(
        260
      );


      updateLoadingScreen(
        99,
        "Just kidding..."
      );


      await delay(
        520
      );


      updateLoadingScreen(
        100,
        "Image loaded."
      );


      await delay(
        220
      );


      hideLoadingScreen(
        sequenceId
      );


      getHistoryApi()
        ?.resetHistory(
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

    imageFileInput?.click();

  }


  /* =======================================================
     7. COMPOSITE EXPORT CANVAS
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
     8. EXPORT DIALOG
  ======================================================= */

  function openExportDialog() {

    const canvasApi =
      getCanvasApi();


    if (
      !canvasApi?.isDocumentOpen()
    ) {

      setStatusMessage(
        "Open or create a document before exporting."
      );

      return false;

    }


    if (exportFileNameInput) {

      exportFileNameInput.value =
        canvasApi.getDocumentName() ||
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
     9. EXPORT IMAGE
  ======================================================= */

  async function exportImage({
    fileName,
    mimeType,
    quality
  } = {}) {

    const canvasApi =
      getCanvasApi();


    if (
      !canvasApi?.isDocumentOpen()
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
        ) || 0.92,
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
        canvasApi.getDocumentName(),
        extension
      );


    const sequenceId =
      showLoadingScreen(
        "Preparing export..."
      );


    try {

      updateLoadingScreen(
        20,
        "Collecting layers..."
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


      await delay(
        120
      );


      updateLoadingScreen(
        54,
        "Compressing pixels..."
      );


      const blob =
        await canvasToBlob(
          compositeCanvas,
          selectedMimeType,
          selectedQuality
        );


      updateLoadingScreen(
        83,
        "Removing unnecessary nonsense..."
      );


      await delay(
        160
      );


      updateLoadingScreen(
        99,
        "Admiring it first..."
      );


      await delay(
        460
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
        220
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
     10. DRAG AND DROP
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


    await openImageFile(
      imageFile
    );

  }


  /* =======================================================
     11. CLIPBOARD IMAGE PASTE
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
          "TEXTAREA"
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


    await openImageFile(
      imageFile
    );

  }


  /* =======================================================
     12. EVENT LISTENERS
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

    }
  );


  openImageButton?.addEventListener(
    "click",
    requestOpenImage
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
            "SELECT"
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

    }
  );


  /* =======================================================
     13. PUBLIC API
  ======================================================= */

  window.PaintlessFiles = {

    requestOpenImage,

    openImageFile,

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
     14. INITIAL STATE
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
    "%cPaintless files ready.",
    [
      "color:#69f59c",
      "font-weight:bold",
      "font-size:13px"
    ].join(";")
  );

})();
