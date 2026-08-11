"use strict";


/* =========================================================
   ParaL-Easy
   MAIN APPLICATION CONTROLLER
========================================================= */


/* =========================================================
   1. DOM REFERENCES
========================================================= */

const newProjectButton =
  document.querySelector(
    "#new-project-btn"
  );

const openProjectButton =
  document.querySelector(
    "#open-project-btn"
  );

const saveProjectButton =
  document.querySelector(
    "#save-project-btn"
  );


const projectNameElement =
  document.querySelector(
    "#project-name"
  );

const canvasSizeLabel =
  document.querySelector(
    "#canvas-size-label"
  );


const statusText =
  document.querySelector(
    "#status-text"
  );

const statusIndicator =
  document.querySelector(
    "#status-indicator"
  );


/* ---------------------------------------------------------
   Inspector
--------------------------------------------------------- */

const inspectorEmpty =
  document.querySelector(
    "#inspector-empty"
  );

const layerInspector =
  document.querySelector(
    "#layer-inspector"
  );


const layerNameInput =
  document.querySelector(
    "#layer-name-input"
  );


const depthSlider =
  document.querySelector(
    "#depth-slider"
  );

const depthValue =
  document.querySelector(
    "#depth-value"
  );


const xStrengthSlider =
  document.querySelector(
    "#x-strength-slider"
  );

const xStrengthValue =
  document.querySelector(
    "#x-strength-value"
  );


const yStrengthSlider =
  document.querySelector(
    "#y-strength-slider"
  );

const yStrengthValue =
  document.querySelector(
    "#y-strength-value"
  );


const gyroRangeSlider =
  document.querySelector(
    "#gyro-range-slider"
  );

const gyroRangeValue =
  document.querySelector(
    "#gyro-range-value"
  );


const layerScaleSlider =
  document.querySelector(
    "#layer-scale-slider"
  );

const layerScaleValue =
  document.querySelector(
    "#layer-scale-value"
  );



const layerOpacitySlider =
  document.querySelector(
    "#layer-opacity-slider"
  );

const layerOpacityValue =
  document.querySelector(
    "#layer-opacity-value"
  );


const layerVisibleCheckbox =
  document.querySelector(
    "#layer-visible-checkbox"
  );


/* ---------------------------------------------------------
   Advanced WFS controls
--------------------------------------------------------- */

const advancedToggle =
  document.querySelector(
    "#advanced-toggle"
  );

const advancedControls =
  document.querySelector(
    "#advanced-controls"
  );

const advancedArrow =
  document.querySelector(
    "#advanced-arrow"
  );


const wfsXNegative =
  document.querySelector(
    "#wfs-x-negative"
  );

const wfsXPositive =
  document.querySelector(
    "#wfs-x-positive"
  );

const wfsYNegative =
  document.querySelector(
    "#wfs-y-negative"
  );

const wfsYPositive =
  document.querySelector(
    "#wfs-y-positive"
  );


/* ---------------------------------------------------------
   Preview mode
--------------------------------------------------------- */

const previewModeButtons =
  Array.from(
    document.querySelectorAll(
      ".preview-mode-btn"
    )
  );


/* =========================================================
   2. APP STATE
========================================================= */

let inspectorUpdating =
  false;

let statusResetTimer =
  null;

let projectImportInput =
  null;

let autoSaveTimer =
  null;


/* =========================================================
   3. INITIAL APPLICATION RENDER
========================================================= */

function renderApplication() {

  renderProjectHeader();

  renderPreviewMode();

  renderInspector();

  renderLayerList();

  updateLayerCount();

  renderParallaxPreview();

}


/* =========================================================
   4. PROJECT HEADER
========================================================= */

function renderProjectHeader() {

  const project =
    getProject();


  if (
    projectNameElement
  ) {

    projectNameElement.textContent =
      project.name;

  }


  if (
    canvasSizeLabel
  ) {

    canvasSizeLabel.textContent =
      `${project.canvas.width} × ${project.canvas.height}`;

  }

}


/* =========================================================
   5. PREVIEW MODE UI
========================================================= */

function renderPreviewMode() {

  const mode =
    getProject()
      .preview
      .mode;


  previewModeButtons.forEach(
    (
      button
    ) => {

      const buttonMode =
        button.dataset
          .previewMode;


      button.classList.toggle(
        "active",
        buttonMode ===
          mode
      );

    }
  );

}


/* =========================================================
   6. INSPECTOR
========================================================= */

function renderInspector() {

  const layer =
    getSelectedLayer();


  inspectorUpdating =
    true;


  if (!layer) {

    if (
      inspectorEmpty
    ) {

      inspectorEmpty.hidden =
        false;

    }


    if (
      layerInspector
    ) {

      layerInspector.hidden =
        true;

    }


    inspectorUpdating =
      false;


    return;

  }


  if (
    inspectorEmpty
  ) {

    inspectorEmpty.hidden =
      true;

  }


  if (
    layerInspector
  ) {

    layerInspector.hidden =
      false;

  }


  /* ---------------------------------------------------------
     Name
  --------------------------------------------------------- */

  if (
    layerNameInput
  ) {

    layerNameInput.value =
      layer.name;

  }


  /* ---------------------------------------------------------
     Depth
  --------------------------------------------------------- */

  if (
    depthSlider
  ) {

    depthSlider.value =
      String(
        layer.depth
      );

  }


  if (
    depthValue
  ) {

    depthValue.textContent =
      formatSignedValue(
        layer.depth
      );

  }


  /* ---------------------------------------------------------
     X Strength
  --------------------------------------------------------- */

  const xStrengthPercent =
    Math.round(
      layer.xStrength *
      100
    );


  if (
    xStrengthSlider
  ) {

    xStrengthSlider.value =
      String(
        xStrengthPercent
      );

  }


  if (
    xStrengthValue
  ) {

    xStrengthValue.textContent =
      `${xStrengthPercent}%`;

  }


  /* ---------------------------------------------------------
     Y Strength
  --------------------------------------------------------- */

  const yStrengthPercent =
    Math.round(
      layer.yStrength *
      100
    );


  if (
    yStrengthSlider
  ) {

    yStrengthSlider.value =
      String(
        yStrengthPercent
      );

  }


  if (
    yStrengthValue
  ) {

    yStrengthValue.textContent =
      `${yStrengthPercent}%`;

  }


  /* ---------------------------------------------------------
     Gyro Range
  --------------------------------------------------------- */

  if (
    gyroRangeSlider
  ) {

    gyroRangeSlider.value =
      String(
        layer.gyroRange
      );

  }


  if (
    gyroRangeValue
  ) {

    gyroRangeValue.textContent =
      `±${Math.round(
        layer.gyroRange
      )}°`;

  }

     /* ---------------------------------------------------------
     Layer Scale
  --------------------------------------------------------- */

  const layerScalePercent =
    Math.round(
      (
        Number(
          layer.transform?.scale
        ) || 1
      ) *
      100
    );


  if (
    layerScaleSlider
  ) {

    layerScaleSlider.value =
      String(
        layerScalePercent
      );

  }


  if (
    layerScaleValue
  ) {

    layerScaleValue.textContent =
      `${layerScalePercent}%`;

  }




  /* ---------------------------------------------------------
     Opacity
  --------------------------------------------------------- */

  const opacityPercent =
    Math.round(
      layer.opacity *
      100
    );


  if (
    layerOpacitySlider
  ) {

    layerOpacitySlider.value =
      String(
        opacityPercent
      );

  }


  if (
    layerOpacityValue
  ) {

    layerOpacityValue.textContent =
      `${opacityPercent}%`;

  }


  /* ---------------------------------------------------------
     Visible
  --------------------------------------------------------- */

  if (
    layerVisibleCheckbox
  ) {

    layerVisibleCheckbox.checked =
      layer.visible;

  }


  /* ---------------------------------------------------------
     Advanced WFS
  --------------------------------------------------------- */

  const useAdvanced =
    Boolean(
      layer.wfs
        ?.useAdvancedValues
    );


  if (
    advancedControls
  ) {

    advancedControls.hidden =
      !useAdvanced;

  }


  if (
    advancedToggle
  ) {

    advancedToggle.setAttribute(
      "aria-expanded",
      String(
        useAdvanced
      )
    );

  }


  if (
    advancedArrow
  ) {

    advancedArrow.textContent =
      useAdvanced
        ? "▴"
        : "▾";

  }


  if (
    wfsXNegative
  ) {

    wfsXNegative.value =
      String(
        layer.wfs
          ?.xNegative ??
        0
      );

  }


  if (
    wfsXPositive
  ) {

    wfsXPositive.value =
      String(
        layer.wfs
          ?.xPositive ??
        0
      );

  }


  if (
    wfsYNegative
  ) {

    wfsYNegative.value =
      String(
        layer.wfs
          ?.yNegative ??
        0
      );

  }


  if (
    wfsYPositive
  ) {

    wfsYPositive.value =
      String(
        layer.wfs
          ?.yPositive ??
        0
      );

  }


  inspectorUpdating =
    false;

}


/* =========================================================
   7. FORMAT SIGNED VALUE
========================================================= */

function formatSignedValue(
  value
) {

  const number =
    Math.round(
      Number(value) || 0
    );


  if (
    number > 0
  ) {

    return (
      `+${number}`
    );

  }


  return String(
    number
  );

}


/* =========================================================
   8. UPDATE SELECTED LAYER
========================================================= */

function updateSelectedLayerFromInspector(
  changes
) {

  if (
    inspectorUpdating
  ) {
    return;
  }


  const selected =
    getSelectedLayer();


  if (!selected) {
    return;
  }


  updateLayer(
    selected.id,
    changes
  );


  renderLayerList();

  renderParallaxPreview();

  scheduleAutoSave();


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
   9. LAYER NAME
========================================================= */

function initialiseLayerNameControl() {

  layerNameInput?.addEventListener(
    "input",
    () => {

      updateSelectedLayerFromInspector({
        name:
          layerNameInput.value
      });

    }
  );

}


/* =========================================================
   10. DEPTH
========================================================= */

function initialiseDepthControl() {

  depthSlider?.addEventListener(
    "input",
    () => {

      const value =
        Number(
          depthSlider.value
        ) || 0;


      if (
        depthValue
      ) {

        depthValue.textContent =
          formatSignedValue(
            value
          );

      }


      updateSelectedLayerFromInspector({
        depth:
          value
      });

    }
  );

}


/* =========================================================
   11. X STRENGTH
========================================================= */

function initialiseXStrengthControl() {

  xStrengthSlider?.addEventListener(
    "input",
    () => {

      const percent =
        Number(
          xStrengthSlider.value
        ) || 0;


      if (
        xStrengthValue
      ) {

        xStrengthValue.textContent =
          `${Math.round(
            percent
          )}%`;

      }


      updateSelectedLayerFromInspector({
        xStrength:
          percent /
          100
      });

    }
  );

}


/* =========================================================
   12. Y STRENGTH
========================================================= */

function initialiseYStrengthControl() {

  yStrengthSlider?.addEventListener(
    "input",
    () => {

      const percent =
        Number(
          yStrengthSlider.value
        ) || 0;


      if (
        yStrengthValue
      ) {

        yStrengthValue.textContent =
          `${Math.round(
            percent
          )}%`;

      }


      updateSelectedLayerFromInspector({
        yStrength:
          percent /
          100
      });

    }
  );

}


/* =========================================================
   13. GYRO RANGE
========================================================= */

function initialiseGyroRangeControl() {

  gyroRangeSlider?.addEventListener(
    "input",
    () => {

      const value =
        Number(
          gyroRangeSlider.value
        ) || 45;


      if (
        gyroRangeValue
      ) {

        gyroRangeValue.textContent =
          `±${Math.round(
            value
          )}°`;

      }


      updateSelectedLayerFromInspector({
        gyroRange:
          value
      });

    }
  );

}

/* =========================================================
   14. LAYER SCALE
========================================================= */

function initialiseLayerScaleControl() {

  layerScaleSlider?.addEventListener(
    "input",
    () => {

      if (
        inspectorUpdating
      ) {
        return;
      }


      const layer =
        getSelectedLayer();


      if (!layer) {
        return;
      }


      const percent =
        Number(
          layerScaleSlider.value
        ) || 100;


      if (
        layerScaleValue
      ) {

        layerScaleValue.textContent =
          `${Math.round(
            percent
          )}%`;

      }


      updateSelectedLayerFromInspector({
        transform: {
          ...(layer.transform || {}),
          scale:
            percent /
            100
        }
      });

    }
  );

}


/* =========================================================
   14. OPACITY
========================================================= */

function initialiseOpacityControl() {

  layerOpacitySlider?.addEventListener(
    "input",
    () => {

      const percent =
        Number(
          layerOpacitySlider.value
        ) || 0;


      if (
        layerOpacityValue
      ) {

        layerOpacityValue.textContent =
          `${Math.round(
            percent
          )}%`;

      }


      updateSelectedLayerFromInspector({
        opacity:
          percent /
          100
      });

    }
  );

}


/* =========================================================
   15. VISIBILITY
========================================================= */

function initialiseVisibilityControl() {

  layerVisibleCheckbox?.addEventListener(
    "change",
    () => {

      updateSelectedLayerFromInspector({
        visible:
          layerVisibleCheckbox.checked
      });

    }
  );

}


/* =========================================================
   16. ADVANCED WFS TOGGLE
========================================================= */

function initialiseAdvancedToggle() {

  advancedToggle?.addEventListener(
    "click",
    () => {

      const layer =
        getSelectedLayer();


      if (!layer) {
        return;
      }


      const nextState =
        !Boolean(
          layer.wfs
            ?.useAdvancedValues
        );


      updateLayer(
        layer.id,
        {
          wfs: {
            useAdvancedValues:
              nextState
          }
        }
      );


      renderInspector();

      scheduleAutoSave();


      setAppStatus(
        nextState
          ? "Advanced WFS values enabled"
          : "ParaL-Easy automatic WFS values restored"
      );

    }
  );

}


/* =========================================================
   17. ADVANCED WFS VALUES
========================================================= */

function initialiseAdvancedWfsInputs() {

  const controls = [
    {
      input:
        wfsXNegative,

      key:
        "xNegative"
    },

    {
      input:
        wfsXPositive,

      key:
        "xPositive"
    },

    {
      input:
        wfsYNegative,

      key:
        "yNegative"
    },

    {
      input:
        wfsYPositive,

      key:
        "yPositive"
    }
  ];


  controls.forEach(
    (
      control
    ) => {

      control.input?.addEventListener(
        "input",
        () => {

          if (
            inspectorUpdating
          ) {
            return;
          }


          const layer =
            getSelectedLayer();


          if (!layer) {
            return;
          }


          updateLayer(
            layer.id,
            {
              wfs: {
                useAdvancedValues:
                  true,

                [control.key]:
                  Number(
                    control.input.value
                  ) || 0
              }
            }
          );


          scheduleAutoSave();

        }
      );

    }
  );

}


/* =========================================================
   18. PREVIEW MODE
========================================================= */

function initialisePreviewModes() {

  previewModeButtons.forEach(
    (
      button
    ) => {

      button.addEventListener(
        "click",
        () => {

          const mode =
            button.dataset
              .previewMode;


          if (!mode) {
            return;
          }


          setPreviewMode(
            mode
          );


          renderPreviewMode();

          renderParallaxPreview();

          scheduleAutoSave();


          if (
            mode ===
              "studio"
          ) {

            setAppStatus(
              "Studio preview response"
            );

          }


          if (
            mode ===
              "real"
          ) {

            setAppStatus(
              "Real Watch estimate enabled"
            );

          }


          if (
            mode ===
              "custom"
          ) {

            setAppStatus(
              "Custom response mode"
            );

          }

        }
      );

    }
  );

}


/* =========================================================
   19. NEW PROJECT
========================================================= */

function createNewParaLEasyProject() {

  const project =
    getProject();


  if (
    project.layers.length >
    0
  ) {

    const confirmed =
      window.confirm(
        "Start a new ParaL-Easy project?\n\nYour current project will be cleared."
      );


    if (!confirmed) {
      return;
    }

  }


  resetProject();


  paraleasyImageCache.clear();


  centrePreviewTilt();


  renderApplication();


  saveProjectLocally();


  window.dispatchEvent(
    new CustomEvent(
      "paraleasy:projectloaded"
    )
  );


  setAppStatus(
    "New ParaL-Easy project created"
  );

}


/* =========================================================
   20. SAVE PROJECT
========================================================= */

function saveCurrentParaLEasyProject() {

  const localResult =
    saveProjectLocally();


  const downloaded =
    downloadProjectFile();


  if (
    localResult.ok &&
    downloaded
  ) {

    setAppStatus(
      "Project saved"
    );

    return;

  }


  if (
    localResult.ok
  ) {

    setAppStatus(
      "Project saved locally"
    );

    return;

  }


  setAppStatus(
    "Project could not be saved",
    "error"
  );

}


/* =========================================================
   21. CREATE PROJECT IMPORT INPUT
========================================================= */

function getProjectImportInput() {

  if (
    projectImportInput
  ) {

    return projectImportInput;

  }


  projectImportInput =
    document.createElement(
      "input"
    );


  projectImportInput.type =
    "file";


  projectImportInput.accept =
    ".json,.paraleasy";


  projectImportInput.hidden =
    true;


  document.body.appendChild(
    projectImportInput
  );


  projectImportInput.addEventListener(
    "change",
    async () => {

      const file =
        projectImportInput
          .files
          ?.item(0);


      projectImportInput.value =
        "";


      if (!file) {
        return;
      }


      try {

        setAppStatus(
          "Opening project..."
        );


        await importProjectFile(
          file
        );


        await rebuildLayerImageCache();


        renderApplication();


        restoreProjectTiltToEngine();


        saveProjectLocally();


        window.dispatchEvent(
          new CustomEvent(
            "paraleasy:projectloaded",
            {
              detail: {
                project:
                  getProject()
              }
            }
          )
        );


        setAppStatus(
          `Opened ${getProject().name}`
        );

      } catch (error) {

        console.error(
          error
        );


        window.alert(
          error.message ||
          "ParaL-Easy could not open that project."
        );


        setAppStatus(
          "Project could not be opened",
          "error"
        );

      }

    }
  );


  return projectImportInput;

}


/* =========================================================
   22. OPEN PROJECT
========================================================= */

function openParaLEasyProject() {

  const input =
    getProjectImportInput();


  input.click();

}


/* =========================================================
   23. TOP BAR BUTTONS
========================================================= */

function initialiseProjectButtons() {

  newProjectButton?.addEventListener(
    "click",
    () => {

      createNewParaLEasyProject();

    }
  );


  openProjectButton?.addEventListener(
    "click",
    () => {

      openParaLEasyProject();

    }
  );


  saveProjectButton?.addEventListener(
    "click",
    () => {

      saveCurrentParaLEasyProject();

    }
  );

}


/* =========================================================
   24. STATUS BAR
========================================================= */

function setAppStatus(
  message,
  type = "normal"
) {

  if (
    statusResetTimer
  ) {

    clearTimeout(
      statusResetTimer
    );

  }


  if (
    statusText
  ) {

    statusText.textContent =
      String(
        message ||
        "ParaL-Easy ready"
      );

  }


  if (
    statusIndicator
  ) {

    switch (
      type
    ) {

      case "error":

        statusIndicator.style.background =
          "var(--red)";

        statusIndicator.style.boxShadow =
          "0 0 9px rgba(255, 90, 107, 0.72)";

        break;


      case "working":

        statusIndicator.style.background =
          "var(--yellow)";

        statusIndicator.style.boxShadow =
          "0 0 9px rgba(255, 215, 106, 0.72)";

        break;


      default:

        statusIndicator.style.background =
          "var(--green)";

        statusIndicator.style.boxShadow =
          "0 0 9px rgba(109, 255, 155, 0.7)";

        break;

    }

  }


  statusResetTimer =
    setTimeout(
      () => {

        if (
          statusText
        ) {

          statusText.textContent =
            "ParaL-Easy ready";

        }


        if (
          statusIndicator
        ) {

          statusIndicator.style.background =
            "var(--green)";

          statusIndicator.style.boxShadow =
            "0 0 9px rgba(109, 255, 155, 0.7)";

        }

      },
      3500
    );

}


/* =========================================================
   25. STATUS EVENTS FROM OTHER MODULES
========================================================= */

function initialiseStatusEvents() {

  window.addEventListener(
    "paraleasy:status",
    (
      event
    ) => {

      const message =
        event.detail
          ?.message;


      if (!message) {
        return;
      }


      setAppStatus(
        message
      );

    }
  );

}


/* =========================================================
   26. SELECTION EVENTS
========================================================= */

function initialiseSelectionEvents() {

  window.addEventListener(
    "paraleasy:selectionchanged",
    () => {

      renderInspector();

    }
  );

}


/* =========================================================
   27. LAYER CHANGE EVENTS
========================================================= */

function initialiseLayerChangeEvents() {

  window.addEventListener(
    "paraleasy:layerschanged",
    () => {

      renderProjectHeader();

      renderInspector();

      updateLayerCount();

      scheduleAutoSave();

    }
  );

}


/* =========================================================
   28. DEPTH FLIP EVENT
========================================================= */

function initialiseDepthFlipEvent() {

  window.addEventListener(
    "paraleasy:depthflipped",
    () => {

      scheduleAutoSave();

    }
  );

}


/* =========================================================
   29. AUTO SAVE
========================================================= */

function scheduleAutoSave() {

  if (
    autoSaveTimer
  ) {

    clearTimeout(
      autoSaveTimer
    );

  }


  autoSaveTimer =
    setTimeout(
      () => {

        saveProjectLocally();

      },
      600
    );

}


/* =========================================================
   30. RESTORE LAST PROJECT
========================================================= */

async function restoreLastProject() {

  const result =
    loadProjectLocally();


  if (
    !result.ok
  ) {

    return false;

  }


  setAppStatus(
    "Restoring last project...",
    "working"
  );


  await rebuildLayerImageCache();


  restoreProjectTiltToEngine();


  renderApplication();


  window.dispatchEvent(
    new CustomEvent(
      "paraleasy:projectloaded",
      {
        detail: {
          project:
            getProject()
        }
      }
    )
  );


  setAppStatus(
    "Last project restored"
  );


  return true;

}


/* =========================================================
   31. KEYBOARD SHORTCUTS
========================================================= */

function initialiseKeyboardShortcuts() {

  window.addEventListener(
    "keydown",
    (
      event
    ) => {

      const target =
        event.target;


      const typing =
        target instanceof
          HTMLInputElement ||
        target instanceof
          HTMLTextAreaElement;


      if (typing) {
        return;
      }


      const modifier =
        event.ctrlKey ||
        event.metaKey;


      /* -----------------------------------------------------
         Save
      ----------------------------------------------------- */

      if (
        modifier &&
        event.key
          .toLowerCase() ===
          "s"
      ) {

        event.preventDefault();


        saveCurrentParaLEasyProject();


        return;

      }


      /* -----------------------------------------------------
         Open
      ----------------------------------------------------- */

      if (
        modifier &&
        event.key
          .toLowerCase() ===
          "o"
      ) {

        event.preventDefault();


        openParaLEasyProject();


        return;

      }


      /* -----------------------------------------------------
         Duplicate
      ----------------------------------------------------- */

      if (
        modifier &&
        event.key
          .toLowerCase() ===
          "d"
      ) {

        event.preventDefault();


        duplicateSelectedLayer();


        return;

      }


      /* -----------------------------------------------------
         Delete
      ----------------------------------------------------- */

      if (
        event.key ===
          "Delete"
      ) {

        deleteSelectedLayer();


        return;

      }


      /* -----------------------------------------------------
         Centre tilt
      ----------------------------------------------------- */

      if (
        event.key ===
          "0"
      ) {

        centrePreviewTilt();

      }

    }
  );

}


/* =========================================================
   32. PREVENT ACCIDENTAL FILE DROP OUTSIDE DROP ZONE
========================================================= */

function initialiseGlobalDragProtection() {

  window.addEventListener(
    "dragover",
    (
      event
    ) => {

      if (
        event.dataTransfer
          ?.types
          ?.includes(
            "Files"
          )
      ) {

        event.preventDefault();

      }

    }
  );


  window.addEventListener(
    "drop",
    (
      event
    ) => {

      if (
        event.dataTransfer
          ?.types
          ?.includes(
            "Files"
          )
      ) {

        const insideDropZone =
          event.target instanceof
            Element &&
          event.target.closest(
            "#layer-drop-zone"
          );


        if (
          !insideDropZone
        ) {

          event.preventDefault();

        }

      }

    }
  );

}


/* =========================================================
   33. BEFORE LEAVING
========================================================= */

function initialiseBeforeUnloadSave() {

  window.addEventListener(
    "beforeunload",
    () => {

      saveProjectLocally();

    }
  );

}


/* =========================================================
   34. INITIALISE INSPECTOR
========================================================= */

function initialiseInspector() {

  initialiseLayerNameControl();

  initialiseDepthControl();

  initialiseXStrengthControl();

  initialiseYStrengthControl();

  initialiseGyroRangeControl();

  initialiseLayerScaleControl();
   
  initialiseOpacityControl();

  initialiseVisibilityControl();

  initialiseAdvancedToggle();

  initialiseAdvancedWfsInputs();

}


/* =========================================================
   35. INITIALISE APP
========================================================= */

async function initialiseParaLEasyApp() {

  initialiseInspector();

  initialisePreviewModes();

  initialiseProjectButtons();

  initialiseStatusEvents();

  initialiseSelectionEvents();

  initialiseLayerChangeEvents();

  initialiseDepthFlipEvent();

  initialiseKeyboardShortcuts();

  initialiseGlobalDragProtection();

  initialiseBeforeUnloadSave();


  /*
   * Render a clean shell immediately.
   */

  renderApplication();


  /*
   * Restore the last autosaved project if one exists.
   */

  try {

    await restoreLastProject();

  } catch (error) {

    console.warn(
      "ParaL-Easy could not restore the previous project.",
      error
    );


    resetProject();

    renderApplication();

  }


  setTimeout(
    () => {

      setAppStatus(
        "ParaL-Easy ready"
      );

    },
    250
  );

}


/* =========================================================
   36. AUTO START
========================================================= */

if (
  document.readyState ===
    "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      initialiseParaLEasyApp();

    }
  );

} else {

  initialiseParaLEasyApp();

}
