"use strict";

/* =========================================================
   PAINTLESS
   TEXT TOOL — v1.0

   File:
   js/tools/text.js

   Features:
   - Click or tap the canvas to begin typing
   - Enter commits the text
   - Shift + Enter creates a new line
   - Escape cancels
   - Every text object is created on its own new layer
   - Text remains movable using the Move tool
   - Font family, size, bold and italic support
   - Primary colour and tool opacity support
   - Mouse, touch and pen support
   - One committed text object = one Undo step
   - Mobile-friendly textarea positioning
   - Safe fallback if the layer API uses different method names

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
      "Paintless Text could not start because tools.js has not loaded."
    );

    return;

  }


  /* =======================================================
     2. TEXT STATE
  ======================================================= */

  const textState = {

    initialised:
      false,

    active:
      false,

    editing:
      false,

    committing:
      false,

    startPoint:
      null,

    editorLayer:
      null,

    editorLayerCreated:
      false,

    previousActiveLayerId:
      null,

    minimumEditorWidth:
      220,

    maximumEditorWidth:
      720,

    minimumEditorHeight:
      54,

    defaultLineHeight:
      1.2,

    editorPadding:
      8,

    commitOnBlur:
      true,

    createSeparateLayer:
      true,

    textCounter:
      1

  };


  /* =======================================================
     3. DOM REFERENCES
  ======================================================= */

  const dom = {

    editorCanvas:
      null,

    overlayCanvas:
      null,

    canvasStage:
      null,

    canvasViewport:
      null,

    textEditor:
      null,

    fontFamilyInput:
      null,

    fontSizeInput:
      null,

    boldInput:
      null,

    italicInput:
      null,

    opacityInput:
      null,

    addLayerButton:
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


  function clearOverlay() {

    getCore()
      ?.clearOverlay?.();

  }


  function renderLayers() {

    const layersApi =
      getLayersApi();


    if (
      typeof layersApi?.renderLayers ===
      "function"
    ) {

      layersApi.renderLayers();


      return;

    }


    getCore()
      ?.renderLayers?.();

  }


  function renderLayerList() {

    const layersApi =
      getLayersApi();


    if (
      typeof layersApi?.renderLayerList ===
      "function"
    ) {

      layersApi.renderLayerList();


      return;

    }


    getCore()
      ?.renderLayerList?.();

  }


  /* =======================================================
     6. TEXT SETTINGS
  ======================================================= */

  function getTextSettings() {

    const coreSettings =
      getCore()
        ?.getTextSettings?.();


    const fontFamily =
      String(
        coreSettings?.fontFamily ||
        dom.fontFamilyInput?.value ||
        "Segoe UI"
      );


    const fontSize =
      clamp(
        coreSettings?.fontSize ||
        dom.fontSizeInput?.value ||
        32,
        6,
        500
      );


    const bold =
      Boolean(
        coreSettings?.bold ??
        dom.boldInput?.checked
      );


    const italic =
      Boolean(
        coreSettings?.italic ??
        dom.italicInput?.checked
      );


    return {

      fontFamily,

      fontSize,

      bold,

      italic,

      fontWeight:
        bold
          ? "700"
          : "400",

      fontStyle:
        italic
          ? "italic"
          : "normal",

      lineHeight:
        fontSize *
        textState.defaultLineHeight

    };

  }


  function getTextColour() {

    return (
      getColours()
        ?.getPrimaryColour?.() ||
      tools.getState(
        "primaryColour"
      ) ||
      "#a84cff"
    );

  }


  function getTextOpacity() {

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


  function createCanvasFont(
    settings =
      getTextSettings()
  ) {

    return (
      `${settings.fontStyle} ` +
      `${settings.fontWeight} ` +
      `${settings.fontSize}px ` +
      `"${settings.fontFamily}", sans-serif`
    );

  }


  /* =======================================================
     7. ACTIVE LAYER HELPERS
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


  function getLayerId(
    layer
  ) {

    return (
      layer?.id ??
      layer?.layerId ??
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
        "That layer cannot accept text."
      );


      return false;

    }


    return true;

  }


  function setActiveLayer(
    layerOrId
  ) {

    const layersApi =
      getLayersApi();


    if (!layersApi) {

      return false;

    }


    const layerId =
      typeof layerOrId ===
        "object"
        ? getLayerId(
            layerOrId
          )
        : layerOrId;


    const possibleFunctions = [
      "setActiveLayer",
      "selectLayer",
      "activateLayer",
      "setActiveLayerById"
    ];


    for (
      const functionName of
      possibleFunctions
    ) {

      if (
        typeof layersApi[
          functionName
        ] ===
        "function"
      ) {

        try {

          const result =
            layersApi[
              functionName
            ](
              layerId
            );


          return result !==
            false;

        } catch (error) {

          /*
           * Try the next supported layer API name.
           */

        }

      }

    }


    return false;

  }


  function createTextLayer(
    layerName
  ) {

    const layersApi =
      getLayersApi();


    if (!layersApi) {

      return null;

    }


    const previousLayer =
      getActiveLayer();


    textState.previousActiveLayerId =
      getLayerId(
        previousLayer
      );


    let createdLayer =
      null;


    const creationFunctions = [
      "addLayer",
      "createLayer",
      "addBlankLayer",
      "newLayer"
    ];


    for (
      const functionName of
      creationFunctions
    ) {

      if (
        typeof layersApi[
          functionName
        ] !==
        "function"
      ) {

        continue;

      }


      try {

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

      } catch (error) {

        console.warn(
          `Paintless Text could not use ${functionName}():`,
          error
        );

      }

    }


    /*
     * Fallback to the existing Layers-panel Add button.
     */

    if (
      !createdLayer &&
      dom.addLayerButton
    ) {

      dom.addLayerButton.click();


      createdLayer =
        layersApi.getActiveLayer?.() ||
        null;

    }


    if (!createdLayer) {

      return null;

    }


    createdLayer.name =
      layerName;


    setActiveLayer(
      createdLayer
    );


    renderLayerList();


    return createdLayer;

  }


  function deleteLayer(
    layer
  ) {

    if (!layer) {

      return false;

    }


    const layersApi =
      getLayersApi();


    const layerId =
      getLayerId(
        layer
      );


    const possibleFunctions = [
      "deleteLayer",
      "removeLayer",
      "deleteLayerById",
      "removeLayerById"
    ];


    for (
      const functionName of
      possibleFunctions
    ) {

      if (
        typeof layersApi?.[
          functionName
        ] !==
        "function"
      ) {

        continue;

      }


      try {

        const result =
          layersApi[
            functionName
          ](
            layerId
          );


        renderLayerList();

        renderLayers();


        return result !==
          false;

      } catch (error) {

        /*
         * Try the next method.
         */

      }

    }


    /*
     * Empty fallback layers are harmless if the Layers API
     * provides no public deletion method.
     */

    return false;

  }


  /* =======================================================
     8. TEXT EDITOR POSITIONING
  ======================================================= */

  function getDocumentSize() {

    return (
      getCore()
        ?.getDocumentSize?.() ||
      {
        width:
          dom.editorCanvas?.width ||
          0,

        height:
          dom.editorCanvas?.height ||
          0
      }
    );

  }


  function getEditorWidth(
    point
  ) {

    const documentSize =
      getDocumentSize();


    const availableWidth =
      Math.max(
        textState.minimumEditorWidth,
        documentSize.width -
        point.x -
        textState.editorPadding *
        2
      );


    return Math.min(
      textState.maximumEditorWidth,
      availableWidth
    );

  }


  function positionTextEditor(
    point
  ) {

    if (
      !dom.textEditor ||
      !point
    ) {

      return false;

    }


    const settings =
      getTextSettings();


    const editorWidth =
      getEditorWidth(
        point
      );


    dom.textEditor.style.position =
      "absolute";


    dom.textEditor.style.left =
      `${Math.round(
        point.x
      )}px`;


    dom.textEditor.style.top =
      `${Math.round(
        point.y
      )}px`;


    dom.textEditor.style.width =
      `${Math.round(
        editorWidth
      )}px`;


    dom.textEditor.style.minWidth =
      `${textState.minimumEditorWidth}px`;


    dom.textEditor.style.minHeight =
      `${
        Math.max(
          textState.minimumEditorHeight,
          settings.lineHeight +
          textState.editorPadding *
          2
        )
      }px`;


    dom.textEditor.style.height =
      "auto";


    dom.textEditor.style.padding =
      `${textState.editorPadding}px`;


    dom.textEditor.style.margin =
      "0";


    dom.textEditor.style.resize =
      "both";


    dom.textEditor.style.overflow =
      "auto";


    dom.textEditor.style.boxSizing =
      "border-box";


    dom.textEditor.style.zIndex =
      "50";


    dom.textEditor.style.fontFamily =
      `"${settings.fontFamily}", sans-serif`;


    dom.textEditor.style.fontSize =
      `${settings.fontSize}px`;


    dom.textEditor.style.fontWeight =
      settings.fontWeight;


    dom.textEditor.style.fontStyle =
      settings.fontStyle;


    dom.textEditor.style.lineHeight =
      String(
        textState.defaultLineHeight
      );


    dom.textEditor.style.color =
      getTextColour();


    dom.textEditor.style.opacity =
      String(
        getTextOpacity()
      );


    dom.textEditor.style.background =
      "rgba(10, 7, 18, 0.92)";


    dom.textEditor.style.border =
      "2px solid rgba(168, 76, 255, 0.95)";


    dom.textEditor.style.borderRadius =
      "8px";


    dom.textEditor.style.outline =
      "none";


    dom.textEditor.style.boxShadow =
      "0 10px 30px rgba(0, 0, 0, 0.45)";


    dom.textEditor.dataset.canvasX =
      String(
        point.x
      );


    dom.textEditor.dataset.canvasY =
      String(
        point.y
      );


    return true;

  }


  function resizeEditorToContent() {

    if (
      !dom.textEditor ||
      dom.textEditor.hidden
    ) {

      return;

    }


    const minimumHeight =
      Math.max(
        textState.minimumEditorHeight,
        getTextSettings().lineHeight +
        textState.editorPadding *
        2
      );


    dom.textEditor.style.height =
      "auto";


    dom.textEditor.style.height =
      `${
        Math.max(
          minimumHeight,
          dom.textEditor.scrollHeight
        )
      }px`;

  }


  function updateVisibleEditorStyle() {

    if (
      !textState.editing ||
      !dom.textEditor ||
      dom.textEditor.hidden
    ) {

      return;

    }


    const settings =
      getTextSettings();


    dom.textEditor.style.fontFamily =
      `"${settings.fontFamily}", sans-serif`;


    dom.textEditor.style.fontSize =
      `${settings.fontSize}px`;


    dom.textEditor.style.fontWeight =
      settings.fontWeight;


    dom.textEditor.style.fontStyle =
      settings.fontStyle;


    dom.textEditor.style.color =
      getTextColour();


    dom.textEditor.style.opacity =
      String(
        getTextOpacity()
      );


    resizeEditorToContent();

  }


  /* =======================================================
     9. BEGIN TEXT EDITING
  ======================================================= */

  function beginTextEditing(
    point
  ) {

    if (
      !textState.active ||
      !dom.textEditor ||
      !point
    ) {

      return false;

    }


    if (textState.editing) {

      commitText();

    }


    const activeLayer =
      getActiveLayer();


    if (
      !textState.createSeparateLayer &&
      !canEditLayer(
        activeLayer
      )
    ) {

      return false;

    }


    textState.startPoint =
      copyPoint(
        point
      );


    textState.editorLayer =
      null;


    textState.editorLayerCreated =
      false;


    dom.textEditor.value =
      "";


    positionTextEditor(
      point
    );


    dom.textEditor.hidden =
      false;


    dom.textEditor.removeAttribute(
      "hidden"
    );


    dom.textEditor.setAttribute(
      "aria-hidden",
      "false"
    );


    textState.editing =
      true;


    clearOverlay();


    requestAnimationFrame(
      () => {

        dom.textEditor.focus();


        dom.textEditor.setSelectionRange?.(
          0,
          0
        );


        resizeEditorToContent();

      }
    );


    sendStatusMessage(
      "Type your text, then press Enter. Shift + Enter adds a new line."
    );


    document.dispatchEvent(
      new CustomEvent(
        "paintless:text-editing-started",
        {
          detail: {
            point:
              copyPoint(
                point
              )
          }
        }
      )
    );


    return true;

  }


  /* =======================================================
     10. MEASURE AND DRAW TEXT
  ======================================================= */

  function getTextLines(
    text
  ) {

    return String(
      text ||
      ""
    )
      .replace(
        /\r\n/g,
        "\n"
      )
      .replace(
        /\r/g,
        "\n"
      )
      .split(
        "\n"
      );

  }


  function measureTextBlock(
    context,
    text,
    settings =
      getTextSettings()
  ) {

    const lines =
      getTextLines(
        text
      );


    context.save();


    context.font =
      createCanvasFont(
        settings
      );


    let maximumWidth =
      0;


    lines.forEach(
      (line) => {

        const measurement =
          context.measureText(
            line ||
            " "
          );


        maximumWidth =
          Math.max(
            maximumWidth,
            measurement.width
          );

      }
    );


    context.restore();


    return {

      lines,

      width:
        maximumWidth,

      height:
        Math.max(
          settings.lineHeight,
          lines.length *
          settings.lineHeight
        ),

      lineHeight:
        settings.lineHeight

    };

  }


  function drawTextToLayer(
    layer,
    text,
    point,
    settings =
      getTextSettings()
  ) {

    if (
      !canEditLayer(
        layer
      )
    ) {

      return null;

    }


    const context =
      layer.context;


    const measurement =
      measureTextBlock(
        context,
        text,
        settings
      );


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
      getTextOpacity();


    context.globalCompositeOperation =
      "source-over";


    context.fillStyle =
      getTextColour();


    context.textBaseline =
      "top";


    context.textAlign =
      "left";


    context.font =
      createCanvasFont(
        settings
      );


    measurement.lines.forEach(
      (
        line,
        index
      ) => {

        context.fillText(
          line,
          point.x,
          point.y +
          index *
          measurement.lineHeight
        );

      }
    );


    context.restore();


    return measurement;

  }


  /* =======================================================
     11. COMMIT TEXT
  ======================================================= */

  function createTextLayerName(
    text
  ) {

    const firstLine =
      getTextLines(
        text
      )
        .find(
          (line) =>
            line.trim()
        )
        ?.trim() ||
      "Text";


    const shortened =
      firstLine.length >
        24
        ? `${firstLine.slice(
            0,
            21
          )}...`
        : firstLine;


    return (
      `Text ${textState.textCounter}: ` +
      shortened
    );

  }


  function commitText() {

    if (
      !textState.editing ||
      textState.committing ||
      !dom.textEditor
    ) {

      return false;

    }


    const text =
      dom.textEditor.value;


    const cleanText =
      text.replace(
        /\s+$/g,
        ""
      );


    if (!cleanText.trim()) {

      cancelTextEditing();


      return false;

    }


    textState.committing =
      true;


    try {

      let targetLayer =
        getActiveLayer();


      if (
        textState.createSeparateLayer
      ) {

        const layerName =
          createTextLayerName(
            cleanText
          );


        targetLayer =
          createTextLayer(
            layerName
          );


        textState.editorLayer =
          targetLayer;


        textState.editorLayerCreated =
          Boolean(
            targetLayer
          );


        textState.textCounter +=
          1;

      }


      if (
        !canEditLayer(
          targetLayer
        )
      ) {

        sendStatusMessage(
          "Paintless could not create the text layer."
        );


        return false;

      }


      const point =
        copyPoint(
          textState.startPoint
        ) ||
        {
          x:
            Number(
              dom.textEditor.dataset.canvasX
            ) ||
            0,

          y:
            Number(
              dom.textEditor.dataset.canvasY
            ) ||
            0
        };


      const settings =
        getTextSettings();


      const measurement =
        drawTextToLayer(
          targetLayer,
          cleanText,
          point,
          settings
        );


      if (!measurement) {

        if (
          textState.editorLayerCreated
        ) {

          deleteLayer(
            targetLayer
          );

        }


        return false;

      }


      renderLayerList();

      renderLayers();


      saveTextHistory();


      hideTextEditor();


      textState.editing =
        false;


      textState.editorLayer =
        null;


      textState.editorLayerCreated =
        false;


      textState.startPoint =
        null;


      sendStatusMessage(
        "Text added on its own layer."
      );


      document.dispatchEvent(
        new CustomEvent(
          "paintless:text-committed",
          {
            detail: {

              text:
                cleanText,

              point,

              layer:
                targetLayer,

              layerId:
                getLayerId(
                  targetLayer
                ),

              measurement,

              settings,

              colour:
                getTextColour(),

              opacity:
                getTextOpacity()

            }
          }
        )
      );


      return true;

    } catch (error) {

      console.error(
        "Paintless Text could not commit the text:",
        error
      );


      if (
        textState.editorLayerCreated &&
        textState.editorLayer
      ) {

        deleteLayer(
          textState.editorLayer
        );

      }


      sendStatusMessage(
        "Text failed to commit. The letters escaped."
      );


      return false;

    } finally {

      textState.committing =
        false;

    }

  }


  /* =======================================================
     12. CANCEL AND HIDE EDITOR
  ======================================================= */

  function hideTextEditor() {

    if (!dom.textEditor) {

      return;

    }


    dom.textEditor.hidden =
      true;


    dom.textEditor.setAttribute(
      "hidden",
      ""
    );


    dom.textEditor.setAttribute(
      "aria-hidden",
      "true"
    );


    dom.textEditor.value =
      "";


    dom.textEditor.style.left =
      "";


    dom.textEditor.style.top =
      "";


    dom.textEditor.style.width =
      "";


    dom.textEditor.style.height =
      "";


    dom.textEditor.style.minWidth =
      "";


    dom.textEditor.style.minHeight =
      "";


    delete dom.textEditor.dataset.canvasX;

    delete dom.textEditor.dataset.canvasY;

  }


  function cancelTextEditing() {

    if (!textState.editing) {

      hideTextEditor();


      return false;

    }


    if (
      textState.editorLayerCreated &&
      textState.editorLayer
    ) {

      deleteLayer(
        textState.editorLayer
      );

    }


    hideTextEditor();


    textState.editing =
      false;


    textState.committing =
      false;


    textState.editorLayer =
      null;


    textState.editorLayerCreated =
      false;


    textState.startPoint =
      null;


    if (
      textState.previousActiveLayerId !==
      null
    ) {

      setActiveLayer(
        textState.previousActiveLayerId
      );

    }


    textState.previousActiveLayerId =
      null;


    sendStatusMessage(
      "Text cancelled."
    );


    document.dispatchEvent(
      new CustomEvent(
        "paintless:text-editing-cancelled"
      )
    );


    return true;

  }


  /* =======================================================
     13. HISTORY
  ======================================================= */

  function saveTextHistory() {

    if (
      typeof getHistoryApi()
        ?.saveHistory ===
      "function"
    ) {

      return getHistoryApi()
        .saveHistory(
          "Add text"
        );

    }


    if (
      typeof getCore()
        ?.requestHistorySave ===
      "function"
    ) {

      return getCore()
        .requestHistorySave(
          "Add text"
        );

    }


    document.dispatchEvent(
      new CustomEvent(
        "paintless:history-requested",
        {
          detail: {
            reason:
              "Add text"
          }
        }
      )
    );


    return true;

  }


  /* =======================================================
     14. POINTER HANDLERS
  ======================================================= */

  function pointerDown(
    payload
  ) {

    if (
      !textState.active
    ) {

      return false;

    }


    if (textState.editing) {

      commitText();

    }


    const started =
      beginTextEditing(
        payload.point
      );


    return {

      changed:
        false,

      preventDefault:
        true,

      releasePointer:
        true,

      clearOverlay:
        true,

      statusMessage:
        started
          ? null
          : "Paintless could not open the text editor."

    };

  }


  function pointerMove() {

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

    return {

      changed:
        false,

      releasePointer:
        true

    };

  }


  /* =======================================================
     15. TOOL ACTIVATION
  ======================================================= */

  function activate() {

    textState.active =
      true;


    getCore()
      ?.showToolOptions?.(
        [
          "opacity",
          "text"
        ]
      );


    getCore()
      ?.setCanvasCursor?.(
        "text"
      );


    sendStatusMessage(
      "Text ready. Click the canvas and start typing."
    );


    return true;

  }


  function deactivate() {

    if (textState.editing) {

      commitText();

    }


    textState.active =
      false;


    clearOverlay();


    return true;

  }


  /* =======================================================
     16. TEXT EDITOR EVENTS
  ======================================================= */

  function connectTextEditorEvents() {

    dom.textEditor.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key ===
          "Escape"
        ) {

          event.preventDefault();

          event.stopPropagation();


          cancelTextEditing();


          return;

        }


        if (
          event.key ===
            "Enter" &&
          !event.shiftKey
        ) {

          event.preventDefault();

          event.stopPropagation();


          commitText();


          return;

        }

      }
    );


    dom.textEditor.addEventListener(
      "input",
      resizeEditorToContent
    );


    dom.textEditor.addEventListener(
      "blur",
      () => {

        if (
          !textState.editing ||
          textState.committing
        ) {

          return;

        }


        window.setTimeout(
          () => {

            if (
              !textState.editing ||
              textState.committing ||
              document.activeElement ===
                dom.textEditor
            ) {

              return;

            }


            if (
              textState.commitOnBlur
            ) {

              commitText();

            }

          },
          0
        );

      }
    );

  }


  /* =======================================================
     17. SETTING EVENTS
  ======================================================= */

  function connectSettingEvents() {

    [
      dom.fontFamilyInput,
      dom.fontSizeInput,
      dom.boldInput,
      dom.italicInput,
      dom.opacityInput
    ].forEach(
      (control) => {

        control?.addEventListener(
          "input",
          updateVisibleEditorStyle
        );


        control?.addEventListener(
          "change",
          updateVisibleEditorStyle
        );

      }
    );


    document.addEventListener(
      "paintless:primary-colour-changed",
      updateVisibleEditorStyle
    );


    document.addEventListener(
      "paintless:tool-state-changed",
      (event) => {

        if (
          event.detail?.property ===
            "opacity" ||
          event.detail?.property ===
            "primaryColour"
        ) {

          updateVisibleEditorStyle();

        }

      }
    );


    document.addEventListener(
      "paintless:history-restored",
      cancelTextEditing
    );


    document.addEventListener(
      "paintless:document-reset",
      cancelTextEditing
    );


    document.addEventListener(
      "paintless:document-resized",
      cancelTextEditing
    );

  }


  /* =======================================================
     18. DOM COLLECTION
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


    dom.canvasStage =
      document.getElementById(
        "canvas-stage"
      );


    dom.canvasViewport =
      document.getElementById(
        "canvas-viewport"
      );


    dom.textEditor =
      document.getElementById(
        "canvas-text-editor"
      );


    dom.fontFamilyInput =
      document.getElementById(
        "text-font-family"
      );


    dom.fontSizeInput =
      document.getElementById(
        "text-font-size"
      );


    dom.boldInput =
      document.getElementById(
        "text-bold"
      );


    dom.italicInput =
      document.getElementById(
        "text-italic"
      );


    dom.opacityInput =
      document.getElementById(
        "tool-opacity"
      );


    dom.addLayerButton =
      document.getElementById(
        "add-layer-button"
      );

  }


  /* =======================================================
     19. TEXT MODULE
  ======================================================= */

  const textModule = {

    name:
      "Text",

    label:
      "Text",

    initialised:
      false,


    async initialise() {

      if (
        textState.initialised
      ) {

        return true;

      }


      collectDomReferences();


      if (
        !dom.editorCanvas ||
        !dom.canvasStage ||
        !dom.textEditor
      ) {

        throw new Error(
          "Paintless Text could not find the canvas text editor."
        );

      }


      hideTextEditor();


      connectTextEditorEvents();

      connectSettingEvents();


      textState.initialised =
        true;


      this.initialised =
        true;


      if (
        tools.getActiveTool() ===
        "text"
      ) {

        activate();

      }


      document.dispatchEvent(
        new CustomEvent(
          "paintless:text-ready",
          {
            detail: {
              text:
                publicApi
            }
          }
        )
      );


      console.log(
        "%cPaintless Text ready.",
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
      textState,


    activate,

    deactivate,


    beginTextEditing,

    commitText,

    cancelTextEditing,

    hideTextEditor,


    drawTextToLayer,

    measureTextBlock,

    getTextLines,

    getTextSettings,

    getTextColour,

    getTextOpacity,

    createCanvasFont,


    createTextLayer,

    setActiveLayer,


    isEditing() {

      return textState.editing;

    },


    setCommitOnBlur(
      enabled
    ) {

      textState.commitOnBlur =
        Boolean(
          enabled
        );


      return textState.commitOnBlur;

    },


    setCreateSeparateLayer(
      enabled
    ) {

      textState.createSeparateLayer =
        Boolean(
          enabled
        );


      return textState.createSeparateLayer;

    },


    focusEditor() {

      if (
        !textState.editing ||
        !dom.textEditor
      ) {

        return false;

      }


      dom.textEditor.focus();


      return true;

    }

  };


  window.PaintlessText =
    publicApi;


  textModule.api =
    publicApi;


  /* =======================================================
     21. REGISTER MODULE
  ======================================================= */

  tools.registerModule(
    "text",
    textModule
  );

})();
