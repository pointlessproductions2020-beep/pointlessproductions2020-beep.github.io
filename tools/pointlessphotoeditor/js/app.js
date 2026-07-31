"use strict";

/* =========================================================
   PAINTLESS
   MAIN APPLICATION CONTROLLER
========================================================= */

(() => {

  /* =======================================================
     1. DOM REFERENCES
  ======================================================= */

  const newCanvasButton =
    document.getElementById(
      "new-canvas-button"
    );

  const newCanvasDialog =
    document.getElementById(
      "new-canvas-dialog"
    );

  const createCanvasButton =
    document.getElementById(
      "create-canvas-button"
    );

  const newDocumentNameInput =
    document.getElementById(
      "new-document-name"
    );

  const newCanvasWidthInput =
    document.getElementById(
      "new-canvas-width"
    );

  const newCanvasHeightInput =
    document.getElementById(
      "new-canvas-height"
    );

  const newCanvasBackgroundSelect =
    document.getElementById(
      "new-canvas-background"
    );


  const brightnessControl =
    document.getElementById(
      "brightness-control"
    );

  const brightnessOutput =
    document.getElementById(
      "brightness-output"
    );

  const contrastControl =
    document.getElementById(
      "contrast-control"
    );

  const contrastOutput =
    document.getElementById(
      "contrast-output"
    );

  const saturationControl =
    document.getElementById(
      "saturation-control"
    );

  const saturationOutput =
    document.getElementById(
      "saturation-output"
    );

  const hueControl =
    document.getElementById(
      "hue-control"
    );

  const hueOutput =
    document.getElementById(
      "hue-output"
    );

  const resetAdjustmentsButton =
    document.getElementById(
      "reset-adjustments-button"
    );


  const fileMenuButton =
    document.getElementById(
      "file-menu-button"
    );

  const editMenuButton =
    document.getElementById(
      "edit-menu-button"
    );

  const imageMenuButton =
    document.getElementById(
      "image-menu-button"
    );

  const layerMenuButton =
    document.getElementById(
      "layer-menu-button"
    );

  const helpMenuButton =
    document.getElementById(
      "help-menu-button"
    );


  const saveStatus =
    document.getElementById(
      "save-status"
    );

  const rightSidebar =
    document.querySelector(
      ".right-sidebar"
    );


  /* =======================================================
     2. APPLICATION STATE
  ======================================================= */

  let applicationReady =
    false;

  let activeMenu =
    null;

  let adjustmentSourceCanvas =
    null;

  let adjustmentLayerId =
    null;

  let adjustmentsChanged =
    false;

  let adjustmentHistoryTimer =
    null;


  const adjustmentValues = {

    brightness:
      0,

    contrast:
      0,

    saturation:
      0,

    hue:
      0

  };


  /* =======================================================
     3. API HELPERS
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


  function getToolsApi() {

    return (
      window.PaintlessTools ||
      null
    );

  }


  function getHistoryApi() {

    return (
      window.PaintlessHistory ||
      null
    );

  }


  function getFilesApi() {

    return (
      window.PaintlessFiles ||
      null
    );

  }


  function dispatchAppEvent(
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
     4. GENERAL HELPERS
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


  function setStatusMessage(
    message
  ) {

    if (saveStatus) {

      saveStatus.textContent =
        message;

    }


    dispatchAppEvent(
      "paintless:status-message",
      {
        message
      }
    );

  }


  function isTyping() {

    const activeElement =
      document.activeElement;


    return Boolean(
      activeElement &&
      (
        activeElement.tagName ===
          "INPUT" ||
        activeElement.tagName ===
          "TEXTAREA" ||
        activeElement.tagName ===
          "SELECT" ||
        activeElement.isContentEditable
      )
    );

  }


  function sanitiseDimension(
    value,
    fallback
  ) {

    const numericValue =
      Number(value);


    if (
      !Number.isFinite(
        numericValue
      )
    ) {

      return fallback;

    }


    return clamp(
      Math.round(
        numericValue
      ),
      1,
      10000
    );

  }


  /* =======================================================
     5. NEW CANVAS DIALOG
  ======================================================= */

  function openNewCanvasDialog() {

    closeApplicationMenu();


    if (
      newCanvasDialog &&
      typeof newCanvasDialog.showModal ===
        "function"
    ) {

      newCanvasDialog.showModal();


      requestAnimationFrame(
        () => {

          newDocumentNameInput?.focus();

          newDocumentNameInput?.select();

        }
      );

    }

  }


  function closeNewCanvasDialog() {

    if (
      newCanvasDialog?.open
    ) {

      newCanvasDialog.close();

    }

  }


  function getCustomBackgroundColour() {

    const selectedColour =
      window.prompt(
        "Choose a background colour:",
        "#a84cff"
      );


    if (
      selectedColour ===
      null
    ) {

      return null;

    }


    const normalisedColour =
      String(
        selectedColour
      )
        .trim()
        .toLowerCase();


    if (
      !/^#[0-9a-f]{6}$/.test(
        normalisedColour
      )
    ) {

      setStatusMessage(
        "That background colour is not a valid six-digit hex colour."
      );

      return null;

    }


    return normalisedColour;

  }


  async function createNewDocument() {

    const layersApi =
      getLayersApi();

    const canvasApi =
      getCanvasApi();

    const filesApi =
      getFilesApi();


    if (
      !layersApi ||
      !canvasApi
    ) {

      setStatusMessage(
        "Paintless has misplaced part of itself."
      );

      return false;

    }


    const width =
      sanitiseDimension(
        newCanvasWidthInput?.value,
        1280
      );


    const height =
      sanitiseDimension(
        newCanvasHeightInput?.value,
        720
      );


    const documentName =
      String(
        newDocumentNameInput?.value ||
        "Untitled Masterpiece"
      )
        .trim()
        .slice(
          0,
          120
        ) ||
      "Untitled Masterpiece";


    const selectedBackground =
      newCanvasBackgroundSelect?.value ||
      "white";


    let backgroundColour =
      "#ffffff";


    if (
      selectedBackground ===
      "black"
    ) {

      backgroundColour =
        "#000000";

    }


    if (
      selectedBackground ===
      "custom"
    ) {

      const customColour =
        getCustomBackgroundColour();


      if (!customColour) {
        return false;
      }


      backgroundColour =
        customColour;

    }


    closeNewCanvasDialog();


    const sequenceId =
      filesApi?.showLoadingScreen?.(
        "Creating canvas..."
      );


    try {

      filesApi?.updateLoadingScreen?.(
        18,
        "Measuring empty space..."
      );


      await new Promise(
        (resolve) =>
          window.setTimeout(
            resolve,
            120
          )
      );


      filesApi?.updateLoadingScreen?.(
        46,
        "Preparing layers..."
      );


      layersApi.resetDocument({
        width,
        height,

        background:
          selectedBackground,

        backgroundColour
      });


      canvasApi.setDocumentName(
        documentName
      );


      canvasApi.showCanvas();

      canvasApi.updateStageDimensions();

      canvasApi.updateDocumentInformation();


      resetAdjustmentControls({
        apply:
          false
      });


      filesApi?.updateLoadingScreen?.(
        77,
        "Sharpening imaginary pencils..."
      );


      await new Promise(
        (resolve) =>
          window.setTimeout(
            resolve,
            170
          )
      );


      filesApi?.updateLoadingScreen?.(
        99,
        "Loading creativity..."
      );


      await new Promise(
        (resolve) =>
          window.setTimeout(
            resolve,
            310
          )
      );


      filesApi?.updateLoadingScreen?.(
        99,
        "Just kidding..."
      );


      await new Promise(
        (resolve) =>
          window.setTimeout(
            resolve,
            560
          )
      );


      filesApi?.updateLoadingScreen?.(
        100,
        "Canvas ready."
      );


      await new Promise(
        (resolve) =>
          window.setTimeout(
            resolve,
            220
          )
      );


      filesApi?.hideLoadingScreen?.(
        sequenceId
      );


      canvasApi.fitCanvasToScreen();


      getHistoryApi()
        ?.resetHistory(
          "Create document"
        );


      setStatusMessage(
        `${documentName} created. Try not to ruin it immediately.`
      );


      dispatchAppEvent(
        "paintless:new-document-created",
        {
          name:
            documentName,

          width,

          height,

          background:
            selectedBackground
        }
      );


      return true;

    } catch (error) {

      console.error(
        "Paintless could not create the document:",
        error
      );


      filesApi?.hideLoadingScreen?.(
        sequenceId
      );


      setStatusMessage(
        "The canvas refused to exist."
      );


      return false;

    }

  }


  /* =======================================================
     6. ADJUSTMENT SOURCE
  ======================================================= */

  function captureAdjustmentSource() {

    const activeLayer =
      getLayersApi()
        ?.getActiveLayer();


    if (!activeLayer) {

      adjustmentSourceCanvas =
        null;

      adjustmentLayerId =
        null;

      return false;

    }


    adjustmentSourceCanvas =
      document.createElement(
        "canvas"
      );


    adjustmentSourceCanvas.width =
      activeLayer.canvas.width;

    adjustmentSourceCanvas.height =
      activeLayer.canvas.height;


    adjustmentSourceCanvas
      .getContext(
        "2d",
        {
          alpha:
            true
        }
      )
      .drawImage(
        activeLayer.canvas,
        0,
        0
      );


    adjustmentLayerId =
      activeLayer.id;


    return true;

  }


  function ensureAdjustmentSource() {

    const activeLayer =
      getLayersApi()
        ?.getActiveLayer();


    if (!activeLayer) {
      return false;
    }


    if (
      !adjustmentSourceCanvas ||
      adjustmentLayerId !==
        activeLayer.id
    ) {

      return captureAdjustmentSource();

    }


    return true;

  }


  /* =======================================================
     7. ADJUSTMENT CONTROLS
  ======================================================= */

  function updateAdjustmentOutputs() {

    if (brightnessOutput) {

      brightnessOutput.textContent =
        String(
          adjustmentValues.brightness
        );

    }


    if (contrastOutput) {

      contrastOutput.textContent =
        String(
          adjustmentValues.contrast
        );

    }


    if (saturationOutput) {

      saturationOutput.textContent =
        String(
          adjustmentValues.saturation
        );

    }


    if (hueOutput) {

      hueOutput.textContent =
        `${adjustmentValues.hue}°`;

    }

  }


  function syncAdjustmentInputs() {

    if (brightnessControl) {

      brightnessControl.value =
        String(
          adjustmentValues.brightness
        );

    }


    if (contrastControl) {

      contrastControl.value =
        String(
          adjustmentValues.contrast
        );

    }


    if (saturationControl) {

      saturationControl.value =
        String(
          adjustmentValues.saturation
        );

    }


    if (hueControl) {

      hueControl.value =
        String(
          adjustmentValues.hue
        );

    }


    updateAdjustmentOutputs();

  }


  function buildAdjustmentFilter() {

    const brightness =
      clamp(
        100 +
        adjustmentValues.brightness,
        0,
        200
      );


    const contrast =
      clamp(
        100 +
        adjustmentValues.contrast,
        0,
        200
      );


    const saturation =
      clamp(
        100 +
        adjustmentValues.saturation,
        0,
        300
      );


    const hue =
      clamp(
        adjustmentValues.hue,
        -180,
        180
      );


    return [
      `brightness(${brightness}%)`,
      `contrast(${contrast}%)`,
      `saturate(${saturation}%)`,
      `hue-rotate(${hue}deg)`
    ].join(" ");

  }


  function applyAdjustments() {

    const layersApi =
      getLayersApi();

    const activeLayer =
      layersApi?.getActiveLayer();


    if (
      !activeLayer ||
      activeLayer.locked
    ) {

      if (
        activeLayer?.locked
      ) {

        setStatusMessage(
          "Unlock the layer before adjusting it."
        );

      }

      return false;

    }


    if (
      !ensureAdjustmentSource()
    ) {
      return false;
    }


    activeLayer.context.save();


    activeLayer.context.setTransform(
      1,
      0,
      0,
      1,
      0,
      0
    );


    activeLayer.context.globalAlpha =
      1;

    activeLayer.context.globalCompositeOperation =
      "source-over";


    activeLayer.context.clearRect(
      0,
      0,
      activeLayer.canvas.width,
      activeLayer.canvas.height
    );


    activeLayer.context.filter =
      buildAdjustmentFilter();


    activeLayer.context.drawImage(
      adjustmentSourceCanvas,
      0,
      0
    );


    activeLayer.context.restore();


    layersApi.renderLayers();


    adjustmentsChanged =
      Object.values(
        adjustmentValues
      ).some(
        (value) =>
          value !== 0
      );


    return true;

  }


  function commitAdjustments(
    reason =
      "Adjust image"
  ) {

    window.clearTimeout(
      adjustmentHistoryTimer
    );


    if (!adjustmentsChanged) {
      return false;
    }


    getHistoryApi()
      ?.saveHistory(
        reason
      );


    captureAdjustmentSource();


    adjustmentsChanged =
      false;


    setStatusMessage(
      `${reason} applied.`
    );


    return true;

  }


  function queueAdjustmentCommit() {

    window.clearTimeout(
      adjustmentHistoryTimer
    );


    adjustmentHistoryTimer =
      window.setTimeout(
        () => {

          commitAdjustments(
            "Adjust image"
          );

        },
        280
      );

  }


  function resetAdjustmentControls({
    apply = true,
    saveHistory = false
  } = {}) {

    adjustmentValues.brightness =
      0;

    adjustmentValues.contrast =
      0;

    adjustmentValues.saturation =
      0;

    adjustmentValues.hue =
      0;


    syncAdjustmentInputs();


    if (
      apply &&
      adjustmentSourceCanvas
    ) {

      const activeLayer =
        getLayersApi()
          ?.getActiveLayer();


      if (
        activeLayer &&
        activeLayer.id ===
          adjustmentLayerId
      ) {

        activeLayer.context.clearRect(
          0,
          0,
          activeLayer.canvas.width,
          activeLayer.canvas.height
        );


        activeLayer.context.drawImage(
          adjustmentSourceCanvas,
          0,
          0
        );


        getLayersApi()
          ?.renderLayers();

      }

    }


    if (saveHistory) {

      getHistoryApi()
        ?.saveHistory(
          "Reset adjustments"
        );

    }


    adjustmentsChanged =
      false;

  }


  function handleAdjustmentInput(
    adjustmentName,
    value
  ) {

    adjustmentValues[
      adjustmentName
    ] =
      Number(value);


    updateAdjustmentOutputs();

    applyAdjustments();

    queueAdjustmentCommit();

  }


  /* =======================================================
     8. APPLICATION MENUS
  ======================================================= */

  function closeApplicationMenu() {

    if (!activeMenu) {
      return;
    }


    activeMenu.remove();

    activeMenu =
      null;


    document
      .querySelectorAll(
        ".menu-button"
      )
      .forEach(
        (button) => {

          button.setAttribute(
            "aria-expanded",
            "false"
          );

        }
      );

  }


  function createMenuItem({
    label,
    shortcut = "",
    danger = false,
    disabled = false,
    action
  }) {

    const button =
      document.createElement(
        "button"
      );


    button.type =
      "button";

    button.className =
      "paintless-menu-item";


    if (danger) {

      button.classList.add(
        "is-danger"
      );

    }


    button.disabled =
      disabled;


    const labelSpan =
      document.createElement(
        "span"
      );


    labelSpan.textContent =
      label;


    const shortcutSpan =
      document.createElement(
        "small"
      );


    shortcutSpan.textContent =
      shortcut;


    button.append(
      labelSpan,
      shortcutSpan
    );


    button.addEventListener(
      "click",
      () => {

        closeApplicationMenu();

        action?.();

      }
    );


    return button;

  }


  function showApplicationMenu(
    anchorButton,
    items
  ) {

    const sameMenuOpen =
      activeMenu?.dataset.menuOwner ===
      anchorButton.id;


    closeApplicationMenu();


    if (sameMenuOpen) {
      return;
    }


    const menu =
      document.createElement(
        "div"
      );


    menu.className =
      "paintless-popup-menu";

    menu.dataset.menuOwner =
      anchorButton.id;

    menu.setAttribute(
      "role",
      "menu"
    );


    items.forEach(
      (item) => {

        if (
          item ===
          "separator"
        ) {

          const separator =
            document.createElement(
              "span"
            );


          separator.className =
            "paintless-menu-separator";

          menu.appendChild(
            separator
          );

          return;

        }


        menu.appendChild(
          createMenuItem(
            item
          )
        );

      }
    );


    document.body.appendChild(
      menu
    );


    const buttonRectangle =
      anchorButton.getBoundingClientRect();


    menu.style.left =
      `${Math.max(
        8,
        buttonRectangle.left
      )}px`;

    menu.style.top =
      `${buttonRectangle.bottom + 5}px`;


    const menuRectangle =
      menu.getBoundingClientRect();


    if (
      menuRectangle.right >
      window.innerWidth - 8
    ) {

      menu.style.left =
        `${Math.max(
          8,
          window.innerWidth -
          menuRectangle.width -
          8
        )}px`;

    }


    anchorButton.setAttribute(
      "aria-expanded",
      "true"
    );


    activeMenu =
      menu;

  }


  function showFileMenu() {

    showApplicationMenu(
      fileMenuButton,
      [
        {
          label:
            "New Canvas",

          shortcut:
            "Ctrl+N",

          action:
            openNewCanvasDialog
        },

        {
          label:
            "Open Image",

          shortcut:
            "Ctrl+O",

          action() {

            getFilesApi()
              ?.requestOpenImage();

          }
        },

        "separator",

        {
          label:
            "Export Image",

          shortcut:
            "Ctrl+S",

          action() {

            getFilesApi()
              ?.openExportDialog();

          }
        }
      ]
    );

  }


  function showEditMenu() {

    const historyInformation =
      getHistoryApi()
        ?.getHistoryInformation();


    showApplicationMenu(
      editMenuButton,
      [
        {
          label:
            "Undo",

          shortcut:
            "Ctrl+Z",

          disabled:
            !historyInformation?.canUndo,

          action() {

            getHistoryApi()
              ?.undo();

          }
        },

        {
          label:
            "Redo",

          shortcut:
            "Ctrl+Y",

          disabled:
            !historyInformation?.canRedo,

          action() {

            getHistoryApi()
              ?.redo();

          }
        },

        "separator",

        {
          label:
            "Clear Active Layer",

          action() {

            const cleared =
              getLayersApi()
                ?.clearActiveLayer();


            if (cleared) {

              getHistoryApi()
                ?.saveHistory(
                  "Clear layer"
                );

            }

          }
        }
      ]
    );

  }


  function showImageMenu() {

    const documentOpen =
      getCanvasApi()
        ?.isDocumentOpen();


    showApplicationMenu(
      imageMenuButton,
      [
        {
          label:
            "Fit Canvas to Screen",

          disabled:
            !documentOpen,

          action() {

            getCanvasApi()
              ?.fitCanvasToScreen();

          }
        },

        {
          label:
            "Actual Size",

          shortcut:
            "100%",

          disabled:
            !documentOpen,

          action() {

            getCanvasApi()
              ?.resetZoom();

          }
        },

        "separator",

        {
          label:
            "Flatten Image",

          disabled:
            !documentOpen,

          action() {

            const flattened =
              getLayersApi()
                ?.flattenImage();


            if (flattened) {

              getHistoryApi()
                ?.saveHistory(
                  "Flatten image"
                );

            }

          }
        }
      ]
    );

  }


  function showLayerMenu() {

    const activeLayer =
      getLayersApi()
        ?.getActiveLayer();


    showApplicationMenu(
      layerMenuButton,
      [
        {
          label:
            "New Layer",

          shortcut:
            "Ctrl+Shift+N",

          action() {

            getLayersApi()
              ?.createLayer();

            getHistoryApi()
              ?.saveHistory(
                "Add layer"
              );

          }
        },

        {
          label:
            "Duplicate Layer",

          disabled:
            !activeLayer,

          action() {

            const duplicated =
              getLayersApi()
                ?.duplicateLayer();


            if (duplicated) {

              getHistoryApi()
                ?.saveHistory(
                  "Duplicate layer"
                );

            }

          }
        },

        {
          label:
            "Delete Layer",

          disabled:
            !activeLayer,

          danger:
            true,

          action() {

            const deleted =
              getLayersApi()
                ?.deleteLayer();


            if (deleted) {

              getHistoryApi()
                ?.saveHistory(
                  "Delete layer"
                );

            }

          }
        },

        "separator",

        {
          label:
            "Move Layer Up",

          disabled:
            !activeLayer,

          action() {

            const moved =
              getLayersApi()
                ?.moveLayerUp();


            if (moved) {

              getHistoryApi()
                ?.saveHistory(
                  "Move layer up"
                );

            }

          }
        },

        {
          label:
            "Move Layer Down",

          disabled:
            !activeLayer,

          action() {

            const moved =
              getLayersApi()
                ?.moveLayerDown();


            if (moved) {

              getHistoryApi()
                ?.saveHistory(
                  "Move layer down"
                );

            }

          }
        },

        {
          label:
            "Merge Down",

          disabled:
            !activeLayer,

          action() {

            const merged =
              getLayersApi()
                ?.mergeLayerDown();


            if (merged) {

              getHistoryApi()
                ?.saveHistory(
                  "Merge layer down"
                );

            } else {

              setStatusMessage(
                "There is no layer underneath to merge with."
              );

            }

          }
        }
      ]
    );

  }


  function showHelpMenu() {

    showApplicationMenu(
      helpMenuButton,
      [
        {
          label:
            "Keyboard Shortcuts",

          action() {

            window.alert(
              [
                "PAINTLESS SHORTCUTS",
                "",
                "B — Brush",
                "E — Eraser",
                "V — Move layer",
                "M — Select",
                "C — Crop",
                "G — Fill",
                "I — Colour picker",
                "T — Text",
                "U — Shape",
                "",
                "[ and ] — Brush size",
                "X — Swap colours",
                "Ctrl+Z — Undo",
                "Ctrl+Y — Redo",
                "Ctrl+O — Open image",
                "Ctrl+S — Export",
                "Space + drag — Pan canvas"
              ].join("\n")
            );

          }
        },

        {
          label:
            "About Paintless",

          action() {

            window.alert(
              [
                "PAINTLESS",
                "",
                "Less pain. More creating.",
                "",
                "A browser image editor made by",
                "Pointless Productions.",
                "",
                "No account.",
                "No cloud.",
                "No unnecessary nonsense."
              ].join("\n")
            );

          }
        }
      ]
    );

  }


  /* =======================================================
     9. DYNAMIC MENU STYLES
  ======================================================= */

  function installApplicationMenuStyles() {

    if (
      document.getElementById(
        "paintless-menu-styles"
      )
    ) {
      return;
    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "paintless-menu-styles";


    style.textContent = `
      .paintless-popup-menu {
        position: fixed;
        z-index: 9000;

        display: grid;
        gap: 3px;

        width: 230px;
        padding: 7px;

        border: 1px solid rgba(204, 145, 255, 0.34);
        border-radius: 11px;

        background:
          radial-gradient(
            circle at 90% 0,
            rgba(168, 76, 255, 0.15),
            transparent 42%
          ),
          rgba(15, 10, 22, 0.99);

        box-shadow:
          0 25px 70px rgba(0, 0, 0, 0.65),
          0 0 25px rgba(168, 76, 255, 0.13);

        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
      }

      .paintless-menu-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;

        width: 100%;
        min-height: 35px;
        padding: 8px 10px;

        border-radius: 7px;

        background: transparent;
        color: #c9bfce;

        text-align: left;

        transition:
          background 140ms ease,
          color 140ms ease;
      }

      .paintless-menu-item:hover:not(:disabled) {
        background: rgba(168, 76, 255, 0.12);
        color: #ffffff;
      }

      .paintless-menu-item.is-danger {
        color: #ff8e9c;
      }

      .paintless-menu-item small {
        color: #8f8498;

        font-family:
          "Courier New",
          monospace;

        font-size: 0.59rem;
      }

      .paintless-menu-separator {
        display: block;

        height: 1px;
        margin: 4px 5px;

        background: rgba(255, 255, 255, 0.08);
      }

      body.is-dragging-image::after {
        content:
          "DROP IMAGE TO OPEN";

        position: fixed;
        inset: 16px;
        z-index: 9500;

        display: grid;
        place-items: center;

        border: 3px dashed #d49aff;
        border-radius: 24px;

        background: rgba(7, 4, 11, 0.88);
        color: #ffffff;

        font-size: clamp(1.5rem, 5vw, 3.5rem);
        font-weight: 1000;
        letter-spacing: 0.12em;
        text-align: center;

        pointer-events: none;

        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
    `;


    document.head.appendChild(
      style
    );

  }


  /* =======================================================
     10. EVENT LISTENERS
  ======================================================= */

  newCanvasButton?.addEventListener(
    "click",
    openNewCanvasDialog
  );


  createCanvasButton?.addEventListener(
    "click",
    (event) => {

      event.preventDefault();

      createNewDocument();

    }
  );


  newCanvasDialog?.addEventListener(
    "close",
    () => {

      if (
        newCanvasDialog.returnValue ===
        "default"
      ) {

        newCanvasDialog.returnValue =
          "";

      }

    }
  );


  brightnessControl?.addEventListener(
    "input",
    () => {

      handleAdjustmentInput(
        "brightness",
        brightnessControl.value
      );

    }
  );


  contrastControl?.addEventListener(
    "input",
    () => {

      handleAdjustmentInput(
        "contrast",
        contrastControl.value
      );

    }
  );


  saturationControl?.addEventListener(
    "input",
    () => {

      handleAdjustmentInput(
        "saturation",
        saturationControl.value
      );

    }
  );


  hueControl?.addEventListener(
    "input",
    () => {

      handleAdjustmentInput(
        "hue",
        hueControl.value
      );

    }
  );


  resetAdjustmentsButton?.addEventListener(
    "click",
    () => {

      const hadAdjustments =
        Object.values(
          adjustmentValues
        ).some(
          (value) =>
            value !== 0
        );


      resetAdjustmentControls({
        apply:
          true,

        saveHistory:
          hadAdjustments
      });


      captureAdjustmentSource();


      setStatusMessage(
        hadAdjustments
          ? "Adjustments reset."
          : "The adjustments were already doing absolutely nothing."
      );

    }
  );


  fileMenuButton?.addEventListener(
    "click",
    showFileMenu
  );


  editMenuButton?.addEventListener(
    "click",
    showEditMenu
  );


  imageMenuButton?.addEventListener(
    "click",
    showImageMenu
  );


  layerMenuButton?.addEventListener(
    "click",
    showLayerMenu
  );


  helpMenuButton?.addEventListener(
    "click",
    showHelpMenu
  );


  document.addEventListener(
    "pointerdown",
    (event) => {

      if (
        activeMenu &&
        !activeMenu.contains(
          event.target
        ) &&
        !event.target.closest(
          ".menu-button"
        )
      ) {

        closeApplicationMenu();

      }

    }
  );


  window.addEventListener(
    "resize",
    closeApplicationMenu
  );


  window.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key ===
        "Escape"
      ) {

        closeApplicationMenu();

      }


      if (isTyping()) {
        return;
      }


      const modifierPressed =
        event.ctrlKey ||
        event.metaKey;


      if (
        modifierPressed &&
        event.key.toLowerCase() ===
          "n"
      ) {

        event.preventDefault();

        openNewCanvasDialog();

      }


      if (
        modifierPressed &&
        event.shiftKey &&
        event.key.toLowerCase() ===
          "n"
      ) {

        event.preventDefault();


        getLayersApi()
          ?.createLayer();


        getHistoryApi()
          ?.saveHistory(
            "Add layer"
          );

      }


      if (
        event.key ===
          "Tab" &&
        window.innerWidth <=
          680
      ) {

        event.preventDefault();

        rightSidebar?.classList.toggle(
          "is-open"
        );

      }

    }
  );


  /* =======================================================
     11. PAINTLESS EVENTS
  ======================================================= */

  document.addEventListener(
    "paintless:active-layer-changed",
    () => {

      resetAdjustmentControls({
        apply:
          false
      });


      captureAdjustmentSource();

    }
  );


  document.addEventListener(
    "paintless:layers-restored",
    () => {

      resetAdjustmentControls({
        apply:
          false
      });


      captureAdjustmentSource();

    }
  );


  document.addEventListener(
    "paintless:document-reset",
    () => {

      resetAdjustmentControls({
        apply:
          false
      });


      captureAdjustmentSource();

    }
  );


  document.addEventListener(
    "paintless:file-opened",
    () => {

      resetAdjustmentControls({
        apply:
          false
      });


      captureAdjustmentSource();

    }
  );


  document.addEventListener(
    "paintless:layer-created",
    () => {

      resetAdjustmentControls({
        apply:
          false
      });


      captureAdjustmentSource();

    }
  );


  document.addEventListener(
    "paintless:history-restored",
    () => {

      resetAdjustmentControls({
        apply:
          false
      });


      captureAdjustmentSource();

    }
  );


  /* =======================================================
     12. INITIAL LOADING SEQUENCE
  ======================================================= */

  async function runInitialLoadingSequence() {

    const filesApi =
      getFilesApi();


    if (
      !filesApi?.playPaintlessLoadingSequence
    ) {
      return;
    }


    await filesApi.playPaintlessLoadingSequence({
      openingMessage:
        "Loading creativity...",

      finalMessage:
        "Paintless ready."
    });

  }


  /* =======================================================
     13. INITIALISE APPLICATION
  ======================================================= */

  function initialiseApplication() {

  const requiredSystemsReady =
    Boolean(
      getLayersApi() &&
      getCanvasApi() &&
      getToolsApi() &&
      getHistoryApi() &&
      getFilesApi()
    );


  /*
   * The modular tools load asynchronously.
   * Wait for them instead of permanently
   * aborting the application too early.
   */

  if (!requiredSystemsReady) {

    initialiseApplication.attempts =
      (
        initialiseApplication.attempts ||
        0
      ) + 1;


    if (
      initialiseApplication.attempts <=
      100
    ) {

      window.setTimeout(
        initialiseApplication,
        50
      );

      return;

    }


    console.error(
      "Paintless did not load all required systems."
    );


    setStatusMessage(
      "Paintless is missing part of its brain."
    );


    return;

  }


  initialiseApplication.attempts =
    0;


  installApplicationMenuStyles();

  syncAdjustmentInputs();

  closeApplicationMenu();


  applicationReady =
    true;


  setStatusMessage(
    "Your masterpiece is currently imaginary."
  );


  window.setTimeout(
    runInitialLoadingSequence,
    120
  );


  dispatchAppEvent(
    "paintless:application-ready"
  );


  console.log(
    "%cPAINTLESS READY",
    [
      "color:#ffffff",
      "background:#6b21c3",
      "font-weight:bold",
      "font-size:16px",
      "padding:7px 11px",
      "border-radius:6px"
    ].join(";")
  );


  console.log(
    "%cNo account. No cloud. No unnecessary nonsense.",
    [
      "color:#d49aff",
      "font-weight:bold",
      "font-size:12px"
    ].join(";")
  );

}

  /* =======================================================
     14. PUBLIC API
  ======================================================= */

  window.PaintlessApp = {

    initialiseApplication,

    openNewCanvasDialog,

    closeNewCanvasDialog,

    createNewDocument,

    applyAdjustments,

    resetAdjustmentControls,

    captureAdjustmentSource,

    closeApplicationMenu,

    isReady() {

      return applicationReady;

    },

    getAdjustmentValues() {

      return {
        ...adjustmentValues
      };

    }

  };


  /* =======================================================
     15. START
  ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialiseApplication,
      {
        once:
          true
      }
    );

  } else {

    initialiseApplication();

  }

})();
