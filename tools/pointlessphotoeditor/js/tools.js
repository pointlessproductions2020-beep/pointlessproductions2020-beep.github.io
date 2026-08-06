"use strict";

/* =========================================================
   PAINTLESS
   MODULAR TOOL SYSTEM LOADER — v1.0

   index.html only needs to load:

   <script src="js/tools.js"></script>

   This file then loads every separate tool module from:

   js/tools/
========================================================= */

(() => {

  /* =======================================================
     1. PREVENT DUPLICATE INITIALISATION
  ======================================================= */

  if (window.PaintlessToolLoader?.started) {

    console.warn(
      "Paintless tool loader was already started."
    );

    return;

  }


  /* =======================================================
     2. MASTER TOOL SYSTEM
  ======================================================= */

  const registeredModules =
    new Map();


  const loadedFiles =
    new Set();


  const failedFiles =
    new Set();


  const readyCallbacks =
    [];


  const toolState = {

    activeTool:
      "brush",

    primaryColour:
      "#a84cff",

    secondaryColour:
      "#ffffff",

    brushSize:
      20,

    opacity:
      1,

    hardness:
      0.8,

    selectedShape:
      "ellipse",

    shapeFillEnabled:
      false,

    shapeStrokeEnabled:
      true,

    shapeCornerRadius:
      24

  };


  let systemReady =
    false;


  /* =======================================================
     3. MODULE LIST

     Files are loaded in this exact order.

     Missing files are skipped safely, allowing us to create
     each module one at a time without breaking Paintless.
  ======================================================= */

  const moduleFiles = [

    /*
     * Shared foundations.
     */

    "core.js",

    "toolbar.js",

    "pointer.js",

    "colours.js",


    /*
     * Main drawing tools.
     */

     "brush.js",

     "eraser.js",

     "shapes.js",

     "fill.js",

     "gradient.js",

     "picker.js",

     "text.js",

     "move.js",

     "transform.js",

     "selection.js",

     "crop.js",


    /*
     * Smart tools.
     *
     * These can remain missing until we build them.
     */

    "clone.js",

    "smudge.js",

    "liquify.js",

    "blur.js",

    "sharpen.js",

    "smart-tools.js",
     
    /*
     * Future Paintless systems.
     */

    "../paintless3d/paintless3d.js"

  ];


  /* =======================================================
     4. FILE LOCATION
  ======================================================= */

  function getLoaderScriptUrl() {

    if (
      document.currentScript?.src
    ) {

      return document.currentScript.src;

    }


    const scripts =
      Array.from(
        document.scripts
      );


    const matchingScript =
      scripts.find(
        (script) =>
          script.src.includes(
            "/tools.js"
          )
      );


    return (
      matchingScript?.src ||
      new URL(
        "js/tools.js",
        window.location.href
      ).href
    );

  }


  const loaderScriptUrl =
    new URL(
      getLoaderScriptUrl()
    );


  const toolsDirectoryUrl =
    new URL(
      "./tools/",
      loaderScriptUrl
    );


  /* =======================================================
     5. EVENT HELPERS
  ======================================================= */

  function dispatchToolSystemEvent(
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

    dispatchToolSystemEvent(
      "paintless:status-message",
      {
        message
      }
    );

  }


  /* =======================================================
     6. MODULE REGISTRATION
  ======================================================= */

  function registerModule(
    moduleName,
    moduleDefinition
  ) {

    const cleanName =
      String(
        moduleName ||
        ""
      ).trim();


    if (!cleanName) {

      console.error(
        "Paintless refused to register a tool module without a name."
      );

      return false;

    }


    if (
      !moduleDefinition ||
      typeof moduleDefinition !==
        "object"
    ) {

      console.error(
        `Paintless module "${cleanName}" must be an object.`
      );

      return false;

    }


    if (
      registeredModules.has(
        cleanName
      )
    ) {

      console.warn(
        `Paintless replaced the existing "${cleanName}" module.`
      );

    }


    registeredModules.set(
      cleanName,
      moduleDefinition
    );


    dispatchToolSystemEvent(
      "paintless:tool-module-registered",
      {
        name:
          cleanName,

        module:
          moduleDefinition
      }
    );


    return true;

  }


  function getModule(
    moduleName
  ) {

    return (
      registeredModules.get(
        moduleName
      ) ||
      null
    );

  }


  function hasModule(
    moduleName
  ) {

    return registeredModules.has(
      moduleName
    );

  }


  /* =======================================================
     7. TOOL STATE
  ======================================================= */

  function setState(
    propertyName,
    value,
    {
      silent = false
    } = {}
  ) {

    if (
      !Object.prototype.hasOwnProperty.call(
        toolState,
        propertyName
      )
    ) {

      console.warn(
        `Unknown Paintless tool-state property: ${propertyName}`
      );

      return false;

    }


    const previousValue =
      toolState[
        propertyName
      ];


    toolState[
      propertyName
    ] =
      value;


    if (!silent) {

      dispatchToolSystemEvent(
        "paintless:tool-state-changed",
        {
          property:
            propertyName,

          value,

          previousValue,

          state:
            {
              ...toolState
            }
        }
      );

    }


    return true;

  }


  function getState(
    propertyName = null
  ) {

    if (
      propertyName ===
      null
    ) {

      return {
        ...toolState
      };

    }


    return toolState[
      propertyName
    ];

  }


  /* =======================================================
     8. ACTIVE TOOL CONTROL
  ======================================================= */

  function setActiveTool(
    toolName,
    options = {}
  ) {

    const cleanToolName =
      String(
        toolName ||
        ""
      ).trim();


    if (!cleanToolName) {

      return false;

    }


    const previousTool =
      toolState.activeTool;


    if (
      previousTool ===
        cleanToolName &&
      options.force !==
        true
    ) {

      return true;

    }


    const previousModule =
      getModule(
        previousTool
      );


    /* Reset shared pointer state before every tool change. */
    try {
      const pointerApi =
        window.PaintlessPointer ||
        getModule("pointer")?.api ||
        null;

      if (pointerApi?.isPointerDown?.()) {
        pointerApi.cancelCurrentPointerAction?.();
      }

      pointerApi?.resetPointerState?.();
      window.PaintlessToolCore?.resetPointerState?.();
      window.PaintlessCanvas?.clearOverlay?.();
    } catch (error) {
      console.warn("Paintless pointer reset failed during tool change:", error);
    }


    const nextModule =
      getModule(
        cleanToolName
      );


    try {

      previousModule?.deactivate?.({
        nextTool:
          cleanToolName,

        previousTool,

        state:
          toolState
      });

    } catch (error) {

      console.error(
        `Paintless could not deactivate "${previousTool}":`,
        error
      );

    }


    toolState.activeTool =
      cleanToolName;


    try {

      nextModule?.activate?.({
        previousTool,

        tool:
          cleanToolName,

        state:
          toolState
      });

    } catch (error) {

      console.error(
        `Paintless could not activate "${cleanToolName}":`,
        error
      );

    }


    updateActiveToolButtons();


    requestAnimationFrame(() => {
      window.PaintlessCanvas?.updateStageDimensions?.();
      window.PaintlessCanvas?.clearOverlay?.();
    });


    dispatchToolSystemEvent(
      "paintless:tool-changed",
      {
        tool:
          cleanToolName,

        previousTool,

        module:
          nextModule,

        state:
          {
            ...toolState
          }
      }
    );


    return true;

  }


  function getActiveTool() {

    return toolState.activeTool;

  }


  function updateActiveToolButtons() {

    document
      .querySelectorAll(
        ".tool-button[data-tool]"
      )
      .forEach(
        (button) => {

          const selected =
            button.dataset.tool ===
            toolState.activeTool;


          button.classList.toggle(
            "is-active",
            selected
          );


          button.setAttribute(
            "aria-pressed",
            String(
              selected
            )
          );

        }
      );


    const activeToolName =
      document.getElementById(
        "active-tool-name"
      );


    if (activeToolName) {

      const activeModule =
        getModule(
          toolState.activeTool
        );


      activeToolName.textContent =
        activeModule?.label ||
        activeModule?.name ||
        toolState.activeTool
          .replace(
            /-/g,
            " "
          )
          .replace(
            /\b\w/g,
            (letter) =>
              letter.toUpperCase()
          );

    }

  }


  /* =======================================================
     9. SHARED PAINTLESS APIS
  ======================================================= */

  function getCanvasApi() {

    return (
      window.PaintlessCanvas ||
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


  function getActiveLayer() {

    return (
      getLayersApi()
        ?.getActiveLayer?.() ||
      null
    );

  }


  function getCanvasPoint(
    event
  ) {

    return (
      getCanvasApi()
        ?.clientToCanvas?.(
          event.clientX,
          event.clientY
        ) ||
      {
        x:
          0,

        y:
          0,

        inside:
          false
      }
    );

  }


  function renderLayers() {

    getLayersApi()
      ?.renderLayers?.();

  }


  function requestHistorySave(
    reason = "Edit"
  ) {

    if (
      typeof getHistoryApi()
        ?.saveHistory ===
      "function"
    ) {

      getHistoryApi()
        .saveHistory(
          reason
        );


      return;

    }


    dispatchToolSystemEvent(
      "paintless:history-requested",
      {
        reason
      }
    );

  }


  /* =======================================================
     10. MODULE INITIALISATION
  ======================================================= */

  async function initialiseRegisteredModules() {

    for (
      const [
        moduleName,
        moduleDefinition
      ] of registeredModules
    ) {

      if (
        moduleDefinition.initialised
      ) {

        continue;

      }


      if (
        typeof moduleDefinition.initialise !==
        "function"
      ) {

        moduleDefinition.initialised =
          true;

        continue;

      }


      try {

        await moduleDefinition.initialise({
          system:
            publicApi,

          state:
            toolState,

          canvas:
            getCanvasApi(),

          layers:
            getLayersApi(),

          history:
            getHistoryApi()
        });


        moduleDefinition.initialised =
          true;


        console.log(
          `%cPaintless module ready: ${moduleName}`,
          [
            "color:#69f59c",
            "font-weight:bold"
          ].join(";")
        );

      } catch (error) {

        moduleDefinition.initialised =
          false;


        console.error(
          `Paintless could not initialise "${moduleName}":`,
          error
        );

      }

    }

  }


  /* =======================================================
     11. SCRIPT LOADING
  ======================================================= */

  function loadScript(
    fileName
  ) {

    return new Promise(
      (resolve) => {

        const fileUrl =
          new URL(
            fileName,
            toolsDirectoryUrl
          );


        /*
         * Cache-busting during development.
         *
         * Each hard refresh requests the latest version rather
         * than allowing an old tool file to haunt us.
         */

        fileUrl.searchParams.set(
          "paintless",
          String(
            Date.now()
          )
        );


        const script =
          document.createElement(
            "script"
          );


        script.src =
          fileUrl.href;


        script.async =
          false;


        script.dataset.paintlessToolModule =
          fileName;


        script.addEventListener(
          "load",
          () => {

            loadedFiles.add(
              fileName
            );


            resolve({
              fileName,

              loaded:
                true
            });

          },
          {
            once:
              true
          }
        );


        script.addEventListener(
          "error",
          () => {

            failedFiles.add(
              fileName
            );


            /*
             * Missing modules are expected while we are still
             * creating Paintless one tool at a time.
             */

            console.info(
              `Paintless module waiting to be created: js/tools/${fileName}`
            );


            script.remove();


            resolve({
              fileName,

              loaded:
                false
            });

          },
          {
            once:
              true
          }
        );


        document.head.appendChild(
          script
        );

      }
    );

  }


  async function loadAllToolModules() {

    for (
      const fileName of
      moduleFiles
    ) {

      await loadScript(
        fileName
      );

    }


    await initialiseRegisteredModules();


    systemReady =
      true;


    updateActiveToolButtons();


    dispatchToolSystemEvent(
      "paintless:tools-ready",
      {
        loadedFiles:
          Array.from(
            loadedFiles
          ),

        missingFiles:
          Array.from(
            failedFiles
          ),

        modules:
          Array.from(
            registeredModules.keys()
          )
      }
    );


    readyCallbacks.splice(
      0
    ).forEach(
      (callback) => {

        try {

          callback(
            publicApi
          );

        } catch (error) {

          console.error(
            "A Paintless tools-ready callback failed:",
            error
          );

        }

      }
    );


    console.log(
      "%cPaintless modular tool system ready.",
      [
        "color:#d49aff",
        "font-weight:bold",
        "font-size:13px"
      ].join(";")
    );


    if (
      failedFiles.size >
      0
    ) {

      console.log(
        "Tool files not created yet:",
        Array.from(
          failedFiles
        )
      );

    }

  }


  /* =======================================================
     12. READY CALLBACKS
  ======================================================= */

  function whenReady(
    callback
  ) {

    if (
      typeof callback !==
      "function"
    ) {

      return false;

    }


    if (systemReady) {

      callback(
        publicApi
      );


      return true;

    }


    readyCallbacks.push(
      callback
    );


    return true;

  }


  /* =======================================================
     13. PUBLIC API
  ======================================================= */

  const publicApi = {

    registerModule,

    getModule,

    hasModule,

    initialiseRegisteredModules,

    setActiveTool,

    getActiveTool,

    setState,

    getState,

    getCanvasApi,

    getLayersApi,

    getHistoryApi,

    getActiveLayer,

    getCanvasPoint,

    renderLayers,

    requestHistorySave,

    dispatchEvent:
      dispatchToolSystemEvent,

    sendStatusMessage,

    whenReady,


    getLoadedFiles() {

      return Array.from(
        loadedFiles
      );

    },


    getMissingFiles() {

      return Array.from(
        failedFiles
      );

    },


    getRegisteredModules() {

      return Array.from(
        registeredModules.keys()
      );

    },


    isReady() {

      return systemReady;

    }

  };


  /*
   * This keeps the familiar window.PaintlessTools name, so
   * the rest of Paintless does not need to change.
   */

  window.PaintlessTools =
    publicApi;


  window.PaintlessToolLoader = {

    started:
      true,

    moduleFiles:
      [
        ...moduleFiles
      ],

    directory:
      toolsDirectoryUrl.href,

    reloadModule(
      fileName
    ) {

      return loadScript(
        fileName
      ).then(
        async (result) => {

          await initialiseRegisteredModules();

          return result;

        }
      );

    }

  };


  /* =======================================================
     14. START
  ======================================================= */

  loadAllToolModules()
    .catch(
      (error) => {

        console.error(
          "Paintless modular tool loader failed:",
          error
        );


        sendStatusMessage(
          "The tool system tripped over its own shoelaces."
        );

      }
    );

})();
