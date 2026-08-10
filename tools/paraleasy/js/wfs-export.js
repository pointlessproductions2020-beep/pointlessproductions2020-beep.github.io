"use strict";


/* =========================================================
   ParaL-Easy
   WATCH FACE STUDIO SETTINGS EXPORT
========================================================= */


/* =========================================================
   1. DOM REFERENCES
========================================================= */

const wfsModal =
  document.querySelector(
    "#wfs-modal"
  );

const exportWfsButton =
  document.querySelector(
    "#export-wfs-btn"
  );

const closeWfsModalButton =
  document.querySelector(
    "#close-wfs-modal-btn"
  );

const copyAllWfsButton =
  document.querySelector(
    "#copy-all-wfs-btn"
  );

const wfsSettingsList =
  document.querySelector(
    "#wfs-settings-list"
  );


/* =========================================================
   2. WFS CONVERSION CONSTANTS
========================================================= */

/*
 * These values control how our simplified ParaL-Easy depth
 * scale maps into Watch Face Studio displacement values.
 *
 * Depth:
 * -100 .. 0 .. +100
 *
 * WFS displacement:
 * scaled in pixels.
 */

const PARALEASY_WFS_MAX_DISPLACEMENT =
  60;


/* =========================================================
   3. BUILD WFS SETTINGS FOR A LAYER
========================================================= */

function buildWfsSettingsForLayer(
  layer
) {

  const project =
    getProject();


  const depthDirection =
    Number(
      project.preview.depthDirection
    ) || 1;


  const depth =
    clampNumber(
      layer.depth,
      -100,
      100,
      0
    );


  const effectiveDepth =
    depth *
    depthDirection;


  const depthRatio =
    effectiveDepth / 100;


  const xStrength =
    clampNumber(
      layer.xStrength,
      0,
      2,
      1
    );


  const yStrength =
    clampNumber(
      layer.yStrength,
      0,
      2,
      1
    );


  const gyroRange =
    clampNumber(
      layer.gyroRange,
      10,
      90,
      45
    );


  /*
   * If the user has manually overridden the values in
   * Advanced WFS mode, honour those exactly.
   */

  if (
    layer.wfs?.useAdvancedValues
  ) {

    return {

      layerId:
        layer.id,

      layerName:
        layer.name,

      gyroRange,

      xNegative:
        Number(
          layer.wfs.xNegative
        ) || 0,

      xPositive:
        Number(
          layer.wfs.xPositive
        ) || 0,

      yNegative:
        Number(
          layer.wfs.yNegative
        ) || 0,

      yPositive:
        Number(
          layer.wfs.yPositive
        ) || 0,

      advanced:
        true

    };

  }


  /*
   * Simplified ParaL-Easy mapping.
   *
   * Positive depth:
   * foreground style movement.
   *
   * Negative depth:
   * background / inward movement.
   */

  const xDisplacement =
    Math.round(
      PARALEASY_WFS_MAX_DISPLACEMENT *
      depthRatio *
      xStrength
    );


  const yDisplacement =
    Math.round(
      PARALEASY_WFS_MAX_DISPLACEMENT *
      depthRatio *
      yStrength
    );


  /*
   * Samsung-style parallax mapping:
   *
   * X:
   * negative tilt → positive displacement
   * positive tilt → negative displacement
   *
   * Y:
   * negative tilt → negative displacement
   * positive tilt → positive displacement
   *
   * Sign reverses automatically when depth is negative.
   */

  const xNegative =
    -xDisplacement;


  const xPositive =
    xDisplacement;


  const yNegative =
    yDisplacement;


  const yPositive =
    -yDisplacement;


  return {

    layerId:
      layer.id,

    layerName:
      layer.name,

    gyroRange,

    xNegative,

    xPositive,

    yNegative,

    yPositive,

    advanced:
      false

  };

}


/* =========================================================
   4. BUILD ALL WFS SETTINGS
========================================================= */

function buildAllWfsSettings() {

  const project =
    getProject();


  return project.layers.map(
    buildWfsSettingsForLayer
  );

}


/* =========================================================
   5. RENDER WFS MODAL
========================================================= */

function renderWfsSettings() {

  if (!wfsSettingsList) {
    return;
  }


  const settings =
    buildAllWfsSettings();


  wfsSettingsList.innerHTML =
    "";


  if (
    settings.length === 0
  ) {

    const empty =
      document.createElement(
        "div"
      );


    empty.className =
      "empty-state";


    empty.textContent =
      "Add some layers first and ParaL-Easy will calculate your Watch Face Studio settings here.";


    wfsSettingsList.appendChild(
      empty
    );


    return;

  }


  /*
   * Display front layer first,
   * matching the visible layer stack.
   */

  const displaySettings =
    [
      ...settings
    ].reverse();


  for (
    const item
    of displaySettings
  ) {

    const card =
      createWfsLayerCard(
        item
      );


    wfsSettingsList.appendChild(
      card
    );

  }

}


/* =========================================================
   6. CREATE WFS LAYER CARD
========================================================= */

function createWfsLayerCard(
  settings
) {

  const card =
    document.createElement(
      "article"
    );


  card.className =
    "wfs-layer-card";


  const title =
    document.createElement(
      "h3"
    );


  title.textContent =
    settings.layerName;


  const grid =
    document.createElement(
      "div"
    );


  grid.className =
    "wfs-value-grid";


  grid.append(
    createWfsValue(
      "Gyro Range",
      `±${settings.gyroRange}°`
    ),

    createWfsValue(
      "X -",
      `${formatSignedNumber(
        settings.xNegative
      )} px`
    ),

    createWfsValue(
      "X +",
      `${formatSignedNumber(
        settings.xPositive
      )} px`
    ),

    createWfsValue(
      "Y -",
      `${formatSignedNumber(
        settings.yNegative
      )} px`
    ),

    createWfsValue(
      "Y +",
      `${formatSignedNumber(
        settings.yPositive
      )} px`
    )
  );


  const copyButton =
    document.createElement(
      "button"
    );


  copyButton.type =
    "button";


  copyButton.className =
    "small-button";


  copyButton.textContent =
    "Copy Layer Settings";


  copyButton.addEventListener(
    "click",
    async () => {

      const text =
        formatWfsLayerText(
          settings
        );


      const copied =
        await copyTextToClipboard(
          text
        );


      if (copied) {

        setWfsStatus(
          `${settings.layerName} settings copied`
        );

      }

    }
  );


  card.append(
    title,
    grid,
    copyButton
  );


  return card;

}


/* =========================================================
   7. CREATE VALUE DISPLAY
========================================================= */

function createWfsValue(
  label,
  value
) {

  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.className =
    "wfs-value";


  const labelElement =
    document.createElement(
      "span"
    );


  labelElement.textContent =
    label;


  const valueElement =
    document.createElement(
      "strong"
    );


  valueElement.textContent =
    value;


  wrapper.append(
    labelElement,
    valueElement
  );


  return wrapper;

}


/* =========================================================
   8. FORMAT ONE LAYER AS TEXT
========================================================= */

function formatWfsLayerText(
  settings
) {

  return [
    `ParaL-Easy — Watch Face Studio Settings`,
    ``,
    `Layer: ${settings.layerName}`,
    ``,
    `Gyro Range: -${settings.gyroRange}° to +${settings.gyroRange}°`,
    ``,
    `X Axis`,
    `- Rotation: ${formatSignedNumber(settings.xNegative)} px`,
    `+ Rotation: ${formatSignedNumber(settings.xPositive)} px`,
    ``,
    `Y Axis`,
    `- Rotation: ${formatSignedNumber(settings.yNegative)} px`,
    `+ Rotation: ${formatSignedNumber(settings.yPositive)} px`,
    ``,
    settings.advanced
      ? `Mode: Advanced WFS values`
      : `Mode: ParaL-Easy calculated`
  ].join(
    "\n"
  );

}


/* =========================================================
   9. FORMAT ALL SETTINGS
========================================================= */

function formatAllWfsSettingsText() {

  const project =
    getProject();


  const settings =
    buildAllWfsSettings();


  const lines = [

    `ParaL-Easy`,
    `Parallax Made Easy`,
    ``,

    `Project: ${project.name}`,

    `Canvas: ${project.canvas.width} × ${project.canvas.height}`,

    `Depth Direction: ${
      project.preview.depthDirection > 0
        ? "Out of Watch"
        : "Into Watch"
    }`,

    ``,
    `========================================`,
    ``

  ];


  settings
    .slice()
    .reverse()
    .forEach(
      (
        item,
        index
      ) => {

        lines.push(
          `${index + 1}. ${item.layerName}`,
          ``,

          `Gyro Range`,
          `-${item.gyroRange}° to +${item.gyroRange}°`,
          ``,

          `X Axis`,
          `- Rotation: ${formatSignedNumber(
            item.xNegative
          )} px`,

          `+ Rotation: ${formatSignedNumber(
            item.xPositive
          )} px`,
          ``,

          `Y Axis`,
          `- Rotation: ${formatSignedNumber(
            item.yNegative
          )} px`,

          `+ Rotation: ${formatSignedNumber(
            item.yPositive
          )} px`,
          ``,

          `----------------------------------------`,
          ``
        );

      }
    );


  return lines.join(
    "\n"
  );

}


/* =========================================================
   10. SIGNED NUMBER FORMAT
========================================================= */

function formatSignedNumber(
  value
) {

  const number =
    Number(value) || 0;


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
   11. COPY TEXT
========================================================= */

async function copyTextToClipboard(
  text
) {

  try {

    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {

      await navigator.clipboard.writeText(
        text
      );


      return true;

    }


    /*
     * Fallback for non-HTTPS local/dev environments.
     */

    const textarea =
      document.createElement(
        "textarea"
      );


    textarea.value =
      text;


    textarea.style.position =
      "fixed";


    textarea.style.opacity =
      "0";


    document.body.appendChild(
      textarea
    );


    textarea.focus();

    textarea.select();


    const success =
      document.execCommand(
        "copy"
      );


    textarea.remove();


    return success;

  } catch (error) {

    console.error(
      "ParaL-Easy could not copy WFS settings.",
      error
    );


    return false;

  }

}


/* =========================================================
   12. OPEN MODAL
========================================================= */

function openWfsModal() {

  renderWfsSettings();


  if (
    !wfsModal
  ) {
    return;
  }


  wfsModal.hidden =
    false;


  document.body.style.overflow =
    "hidden";


  closeWfsModalButton?.focus();

}


/* =========================================================
   13. CLOSE MODAL
========================================================= */

function closeWfsModal() {

  if (
    !wfsModal
  ) {
    return;
  }


  wfsModal.hidden =
    true;


  document.body.style.overflow =
    "";

}


/* =========================================================
   14. COPY ALL SETTINGS
========================================================= */

async function copyAllWfsSettings() {

  const settings =
    buildAllWfsSettings();


  if (
    settings.length === 0
  ) {

    setWfsStatus(
      "Add some layers before copying WFS settings"
    );


    return false;

  }


  const text =
    formatAllWfsSettingsText();


  const copied =
    await copyTextToClipboard(
      text
    );


  if (copied) {

    setWfsStatus(
      "All Watch Face Studio settings copied"
    );

  }


  return copied;

}


/* =========================================================
   15. STATUS EVENT
========================================================= */

function setWfsStatus(
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
   16. BUTTON EVENTS
========================================================= */

function initialiseWfsExportButtons() {

  exportWfsButton?.addEventListener(
    "click",
    () => {

      openWfsModal();

    }
  );


  closeWfsModalButton?.addEventListener(
    "click",
    () => {

      closeWfsModal();

    }
  );


  copyAllWfsButton?.addEventListener(
    "click",
    () => {

      copyAllWfsSettings();

    }
  );

}


/* =========================================================
   17. MODAL BACKDROP CLICK
========================================================= */

function initialiseWfsModalBackdrop() {

  wfsModal?.addEventListener(
    "click",
    (
      event
    ) => {

      if (
        event.target ===
          wfsModal
      ) {

        closeWfsModal();

      }

    }
  );

}


/* =========================================================
   18. ESCAPE KEY
========================================================= */

function initialiseWfsEscapeKey() {

  window.addEventListener(
    "keydown",
    (
      event
    ) => {

      if (
        event.key !==
          "Escape"
      ) {
        return;
      }


      if (
        wfsModal &&
        !wfsModal.hidden
      ) {

        closeWfsModal();

      }

    }
  );

}


/* =========================================================
   19. REFRESH WHEN PROJECT CHANGES
========================================================= */

function initialiseWfsProjectEvents() {

  window.addEventListener(
    "paraleasy:layerschanged",
    () => {

      if (
        wfsModal &&
        !wfsModal.hidden
      ) {

        renderWfsSettings();

      }

    }
  );


  window.addEventListener(
    "paraleasy:depthflipped",
    () => {

      if (
        wfsModal &&
        !wfsModal.hidden
      ) {

        renderWfsSettings();

      }

    }
  );

}


/* =========================================================
   20. INITIALISE
========================================================= */

function initialiseWfsExport() {

  initialiseWfsExportButtons();

  initialiseWfsModalBackdrop();

  initialiseWfsEscapeKey();

  initialiseWfsProjectEvents();

}


/* =========================================================
   21. AUTO START
========================================================= */

if (
  document.readyState ===
    "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initialiseWfsExport
  );

} else {

  initialiseWfsExport();

}
