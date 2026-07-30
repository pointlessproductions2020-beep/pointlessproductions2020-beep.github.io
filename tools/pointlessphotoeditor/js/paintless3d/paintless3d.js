"use strict";

/* =========================================================
   PAINTLESS3D
   SYSTEM LOADER — v0.1

   File:
   js/paintless3d/paintless3d.js

   Purpose:
   - Creates the central Paintless3D system
   - Loads all Paintless3D modules in order
   - Lets modules register themselves
   - Keeps Paintless3D separate from normal Paintless tools
   - Reports missing modules without breaking Paintless
   - Provides one public API through window.Paintless3D

   Initial module plan:
   - core.js
   - mode.js
   - depth.js
   - renderer.js
   - preview.js
   - export.js
   - ui.js
========================================================= */

(() => {

  /* =======================================================
     1. PREVENT DUPLICATE LOADING
  ======================================================= */

  if (
    window.Paintless3D &&
    window.Paintless3D.loaderStarted
  ) {

    console.warn(
      "Paintless3D is already loading."
    );

    return;

  }


  /* =======================================================
     2. MODULE LOAD ORDER

     We will enable each file as we create it.

     For now, only core.js is enabled because that is the
     next file we are about to build.
  ======================================================= */

const moduleFiles = [

  "core.js",

  "mode.js",

  "depth.js",

  "renderer.js",

  "preview.js",

  "export.js",

  "ui.js"

];


  /* =======================================================
     3. SYSTEM STATE
  ======================================================= */

  const state = {

    loaderStarted:
      true,

    loading:
      false,

    ready:
      false,

    failed:
      false,

    mode:
      "2d",

    modules:
      new Map(),

    loadedFiles:
      new Set(),

    failedFiles:
      new Map(),

    initialisedModules:
      new Set(),

    currentFile:
      null,

    basePath:
      "",

    startedAt:
      performance.now(),

    completedAt:
      null

  };


  /* =======================================================
     4. FIND THIS FILE'S DIRECTORY
  ======================================================= */

  function getLoaderScript() {

    if (
      document.currentScript?.src
    ) {

      return document.currentScript;

    }


    const scripts =
      Array.from(
        document.scripts
      );


    return (
      scripts
        .reverse()
        .find(
          (script) =>
            script.src.includes(
              "/paintless3d/paintless3d.js"
            )
        ) ||
      null
    );

  }


  function calculateBasePath() {

    const loaderScript =
      getLoaderScript();


    if (
      loaderScript?.src
    ) {

      return new URL(
        "./",
        loaderScript.src
      ).href;

    }


    /*
     * Safe fallback for the current Paintless folder layout.
     */

    return new URL(
      "./js/paintless3d/",
      window.location.href
    ).href;

  }


  state.basePath =
    calculateBasePath();


  /* =======================================================
     5. STATUS MESSAGES
  ======================================================= */

  function sendStatusMessage(
    message
  ) {

    if (
      typeof window.PaintlessToolCore
        ?.sendStatusMessage ===
      "function"
    ) {

      window.PaintlessToolCore
        .sendStatusMessage(
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


  /* =======================================================
     6. MODULE REGISTRATION
  ======================================================= */

  function registerModule(
    moduleName,
    moduleDefinition
  ) {

    const safeName =
      String(
        moduleName ||
        ""
      ).trim();


    if (!safeName) {

      throw new Error(
        "Paintless3D modules require a name."
      );

    }


    if (
      !moduleDefinition ||
      typeof moduleDefinition !==
        "object"
    ) {

      throw new Error(
        `Paintless3D module "${safeName}" requires a module object.`
      );

    }


    if (
      state.modules.has(
        safeName
      )
    ) {

      console.warn(
        `Paintless3D replaced an existing module: ${safeName}`
      );

    }


    const registeredModule = {

      name:
        safeName,

      label:
        moduleDefinition.label ||
        safeName,

      initialised:
        Boolean(
          moduleDefinition.initialised
        ),

      initialise:
        typeof moduleDefinition.initialise ===
          "function"
          ? moduleDefinition.initialise.bind(
              moduleDefinition
            )
          : async () =>
              true,

      destroy:
        typeof moduleDefinition.destroy ===
          "function"
          ? moduleDefinition.destroy.bind(
              moduleDefinition
            )
          : null,

      api:
        moduleDefinition.api ||
        null,

      original:
        moduleDefinition

    };


    state.modules.set(
      safeName,
      registeredModule
    );


    document.dispatchEvent(
      new CustomEvent(
        "paintless3d:module-registered",
        {
          detail: {

            name:
              safeName,

            module:
              registeredModule

          }
        }
      )
    );


    console.log(
      `%cPaintless3D module registered: ${safeName}`,
      [
        "color:#35e7ff",
        "font-weight:bold"
      ].join(";")
    );


    return registeredModule;

  }


  function getModule(
    moduleName
  ) {

    return (
      state.modules.get(
        moduleName
      ) ||
      null
    );

  }


  function hasModule(
    moduleName
  ) {

    return state.modules.has(
      moduleName
    );

  }


  function getModules() {

    return Array.from(
      state.modules.values()
    );

  }


  /* =======================================================
     7. SCRIPT LOADING
  ======================================================= */

  function createModuleUrl(
    fileName
  ) {

    return new URL(
      fileName,
      state.basePath
    ).href;

  }


  function loadScript(
    fileName
  ) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const moduleUrl =
          createModuleUrl(
            fileName
          );


        const existingScript =
          Array.from(
            document.scripts
          ).find(
            (script) =>
              script.src ===
              moduleUrl
          );


        if (existingScript) {

          if (
            existingScript.dataset
              .paintless3dLoaded ===
            "true"
          ) {

            state.loadedFiles.add(
              fileName
            );


            resolve(
              fileName
            );


            return;
          }


          existingScript.addEventListener(
            "load",
            () => {

              state.loadedFiles.add(
                fileName
              );


              resolve(
                fileName
              );

            },
            {
              once:
                true
            }
          );


          existingScript.addEventListener(
            "error",
            () => {

              reject(
                new Error(
                  `Paintless3D could not load ${fileName}.`
                )
              );

            },
            {
              once:
                true
            }
          );


          return;
        }


        const script =
          document.createElement(
            "script"
          );


        script.src =
          moduleUrl;


        script.async =
          false;


        script.defer =
          false;


        script.dataset.paintless3dModule =
          fileName;


        script.addEventListener(
          "load",
          () => {

            script.dataset
              .paintless3dLoaded =
              "true";


            state.loadedFiles.add(
              fileName
            );


            console.log(
              `%cPaintless3D file loaded: ${fileName}`,
              [
                "color:#d49aff",
                "font-weight:bold"
              ].join(";")
            );


            resolve(
              fileName
            );

          },
          {
            once:
              true
          }
        );


        script.addEventListener(
          "error",
          () => {

            const error =
              new Error(
                `Paintless3D could not load ${fileName} from ${moduleUrl}`
              );


            state.failedFiles.set(
              fileName,
              error
            );


            reject(
              error
            );

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


  async function loadModuleFiles() {

    for (
      const fileName of
      moduleFiles
    ) {

      state.currentFile =
        fileName;


      try {

        await loadScript(
          fileName
        );

      } catch (error) {

        state.failedFiles.set(
          fileName,
          error
        );


        console.error(
          error
        );


        /*
         * Paintless itself must continue working even if a
         * Paintless3D module is temporarily missing.
         */

        document.dispatchEvent(
          new CustomEvent(
            "paintless3d:module-file-failed",
            {
              detail: {

                fileName,

                error

              }
            }
          )
        );

      }

    }


    state.currentFile =
      null;

  }


  /* =======================================================
     8. MODULE INITIALISATION
  ======================================================= */

  async function initialiseModule(
    moduleName
  ) {

    const module =
      getModule(
        moduleName
      );


    if (!module) {

      return false;

    }


    if (
      state.initialisedModules.has(
        moduleName
      )
    ) {

      return true;

    }


    try {

      const result =
        await module.initialise();


      if (
        result ===
        false
      ) {

        throw new Error(
          `Paintless3D module "${moduleName}" returned false during initialisation.`
        );

      }


      module.initialised =
        true;


      state.initialisedModules.add(
        moduleName
      );


      document.dispatchEvent(
        new CustomEvent(
          "paintless3d:module-ready",
          {
            detail: {

              name:
                moduleName,

              module

            }
          }
        )
      );


      console.log(
        `%cPaintless3D module ready: ${moduleName}`,
        [
          "color:#69f59c",
          "font-weight:bold"
        ].join(";")
      );


      return true;

    } catch (error) {

      console.error(
        `Paintless3D module failed to initialise: ${moduleName}`,
        error
      );


      return false;

    }

  }


  async function initialiseModules() {

    for (
      const [
        moduleName
      ] of state.modules
    ) {

      await initialiseModule(
        moduleName
      );

    }

  }


  /* =======================================================
     9. MODE STATE
  ======================================================= */

  function getMode() {

    return state.mode;

  }


  function setMode(
    mode
  ) {

    const nextMode =
      String(
        mode
      ).toLowerCase();


    if (
      ![
        "2d",
        "3d"
      ].includes(
        nextMode
      )
    ) {

      return false;

    }


    if (
      state.mode ===
      nextMode
    ) {

      return true;

    }


    const previousMode =
      state.mode;


    state.mode =
      nextMode;


    document.documentElement
      .dataset.paintlessMode =
      nextMode;


    document.body
      ?.classList.toggle(
        "paintless-3d-mode",
        nextMode ===
          "3d"
      );


    document.dispatchEvent(
      new CustomEvent(
        "paintless3d:mode-changed",
        {
          detail: {

            mode:
              nextMode,

            previousMode

          }
        }
      )
    );


    return true;

  }


  function is3DMode() {

    return state.mode ===
      "3d";

  }


  function is2DMode() {

    return state.mode ===
      "2d";

  }


  /* =======================================================
     10. INITIALISE COMPLETE SYSTEM
  ======================================================= */

  async function initialise() {

    if (
      state.ready
    ) {

      return true;

    }


    if (
      state.loading
    ) {

      return false;

    }


    state.loading =
      true;


    state.failed =
      false;


    document.dispatchEvent(
      new CustomEvent(
        "paintless3d:loading-started"
      )
    );


    try {

      await loadModuleFiles();


      await initialiseModules();


      state.ready =
        true;


      state.completedAt =
        performance.now();


      const duration =
        Math.round(
          state.completedAt -
          state.startedAt
        );


      document.dispatchEvent(
        new CustomEvent(
          "paintless3d:ready",
          {
            detail: {

              paintless3d:
                publicApi,

              duration,

              loadedFiles:
                Array.from(
                  state.loadedFiles
                ),

              failedFiles:
                Array.from(
                  state.failedFiles.keys()
                )

            }
          }
        )
      );


      console.log(
        "%cPaintless3D system ready.",
        [
          "color:#ff5fb7",
          "font-weight:bold",
          "font-size:14px"
        ].join(";")
      );


      if (
        state.failedFiles.size >
        0
      ) {

        console.warn(
          "Paintless3D files not loaded:",
          Array.from(
            state.failedFiles.keys()
          )
        );

      }


      return true;

    } catch (error) {

      state.failed =
        true;


      console.error(
        "Paintless3D failed to initialise:",
        error
      );


      sendStatusMessage(
        "Paintless3D could not start."
      );


      return false;

    } finally {

      state.loading =
        false;

    }

  }


  /* =======================================================
     11. DESTROY SYSTEM
  ======================================================= */

  async function destroy() {

    const modules =
      Array.from(
        state.modules.values()
      ).reverse();


    for (
      const module of
      modules
    ) {

      if (
        typeof module.destroy !==
        "function"
      ) {

        continue;

      }


      try {

        await module.destroy();

      } catch (error) {

        console.warn(
          `Paintless3D could not destroy ${module.name}:`,
          error
        );

      }

    }


    state.ready =
      false;


    state.initialisedModules.clear();


    setMode(
      "2d"
    );


    document.dispatchEvent(
      new CustomEvent(
        "paintless3d:destroyed"
      )
    );


    return true;

  }


  /* =======================================================
     12. PUBLIC API
  ======================================================= */

  const publicApi = {

    loaderStarted:
      true,

    state,

    moduleFiles,


    initialise,

    destroy,


    registerModule,

    initialiseModule,

    getModule,

    getModules,

    hasModule,


    getMode,

    setMode,

    is2DMode,

    is3DMode,


    getBasePath() {

      return state.basePath;

    },


    getLoadedFiles() {

      return Array.from(
        state.loadedFiles
      );

    },


    getFailedFiles() {

      return Array.from(
        state.failedFiles.keys()
      );

    },


    isReady() {

      return state.ready;

    },


    isLoading() {

      return state.loading;

    }

  };


  window.Paintless3D =
    publicApi;


  /* =======================================================
     13. START AUTOMATICALLY
  ======================================================= */

  function start() {

    initialise();

  }


  if (
    document.readyState ===
      "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      start,
      {
        once:
          true
      }
    );

  } else {

    start();

  }

})();
