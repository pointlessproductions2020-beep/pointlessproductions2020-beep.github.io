/* =========================================================
   PAINTLESSUV
   PANEL UPDATES
========================================================= */


/**
 * Update the Model and UV information panels.
 *
 * @param {Object} analysis
 */
export function updateModelPanels(
  analysis
) {

  if (
    !analysis
  ) {

    return;

  }


  setText(
    "model-name-value",
    analysis.name
  );


  setText(
    "model-format-value",
    analysis.format
  );


  setText(
    "model-vertices-value",
    formatNumber(
      analysis.vertices
    )
  );


  setText(
    "model-triangles-value",
    formatNumber(
      analysis.triangles
    )
  );


  setText(
    "model-objects-value",
    formatNumber(
      analysis.meshes
    )
  );


  setText(
    "uv-layer-status",
    analysis.hasUV
      ? "UV found"
      : "No UV found"
  );


  setText(
    "uv-island-count",
    analysis.hasUV
      ? "Pending scan"
      : "—"
  );


  setText(
    "uv-overlap-count",
    analysis.hasUV
      ? "Not checked"
      : "—"
  );


  setText(
    "texture-status",
    analysis.hasTexture
      ? `${Math.max(
          1,
          Number(
            analysis.textures ||
            0
          )
        )} found`
      : "No texture"
  );


  updateAnalysisSummary(
    analysis
  );


  updateMaterialList(
    analysis.materialList
  );

}


/* =========================================================
   ANALYSIS SUMMARY
========================================================= */

function updateAnalysisSummary(
  analysis
) {

  const container =
    document.getElementById(
      "model-analysis-summary"
    );


  if (
    !container
  ) {

    return;

  }


  container.innerHTML =
    "";


  /* =======================================================
     GEOMETRY
  ======================================================= */

  container.append(
    createAnalysisRow(
      {
        icon:
          analysis.meshes >
            0
            ? "✓"
            : "!",

        title:
          analysis.meshes >
            0
            ? "Geometry loaded"
            : "No geometry found",

        value:
          analysis.meshes >
            0
            ? `${formatNumber(
                analysis.meshes
              )} mesh${
                analysis.meshes ===
                  1
                  ? ""
                  : "es"
              }`
            : "Model required",

        state:
          analysis.meshes >
            0
            ? "good"
            : "warning"
      }
    )
  );


  /* =======================================================
     UV MAP
  ======================================================= */

  container.append(
    createAnalysisRow(
      {
        icon:
          analysis.hasUV
            ? "✓"
            : "!",

        title:
          analysis.hasUV
            ? "UV map found"
            : "UV map missing",

        value:
          analysis.hasUV
            ? `${formatNumber(
                analysis.meshesWithUV
              )} ready`
            : `${formatNumber(
                analysis.meshesWithoutUV
              )} need UVs`,

        state:
          analysis.hasUV
            ? "good"
            : "warning",

        action:
          analysis.hasUV
            ? null
            : {
                id:
                  "fix-uv-button",

                label:
                  "Fix",

                title:
                  "Generate a UV map",

                eventName:
                  "paintlessuv:fixuv"
              }
      }
    )
  );


  /* =======================================================
     TEXTURE
  ======================================================= */

  container.append(
    createAnalysisRow(
      {
        icon:
          analysis.hasTexture
            ? "✓"
            : "!",

        title:
          analysis.hasTexture
            ? "Texture found"
            : "No texture found",

        value:
          analysis.hasTexture
            ? `${Math.max(
                1,
                Number(
                  analysis.textures ||
                  0
                )
              )} ready`
            : "Blank layer needed",

        state:
          analysis.hasTexture
            ? "good"
            : "warning",

        action:
          analysis.hasTexture
            ? null
            : {
                id:
                  "fix-texture-button",

                label:
                  "Fix",

                title:
                  "Create a blank paint texture",

                eventName:
                  "paintlessuv:fixtexture"
              }
      }
    )
  );


  /* =======================================================
     ANIMATIONS
  ======================================================= */

  container.append(
    createAnalysisRow(
      {
        icon:
          analysis.hasAnimations
            ? "✓"
            : "—",

        title:
          "Animations",

        value:
          String(
            analysis.animationCount ||
            0
          ),

        state:
          "good"
      }
    )
  );


  updateReadyToPaintButton(
    analysis
  );

}


/* =========================================================
   READY TO PAINT BUTTON
========================================================= */

function updateReadyToPaintButton(
  analysis
) {

  const readyButton =
    document.getElementById(
      "fix-model-button"
    );


  if (
    !readyButton
  ) {

    return;

  }


  /*
   * Do not rely on analysis.readyToPaint here.
   *
   * PaintlessUV requires:
   *
   * - valid geometry;
   * - a UV map;
   * - a writable texture.
   */

  const hasGeometry =
    Number(
      analysis.meshes ||
      0
    ) >
    0;

  const hasUV =
    Boolean(
      analysis.hasUV
    );

  const hasTexture =
    Boolean(
      analysis.hasTexture
    );


  const canStartPainting =
    hasGeometry &&
    hasUV &&
    hasTexture;


  readyButton.disabled =
    !canStartPainting;


  readyButton.classList.toggle(
    "is-disabled",
    !canStartPainting
  );


  readyButton.classList.toggle(
    "is-ready",
    canStartPainting
  );


  readyButton.setAttribute(
    "aria-disabled",
    String(
      !canStartPainting
    )
  );


  if (
    canStartPainting
  ) {

    readyButton.textContent =
      "Ready to Paint";

    readyButton.title =
      "Start painting this model";

    return;

  }


  if (
    !hasGeometry
  ) {

    readyButton.textContent =
      "Model Not Ready";

    readyButton.title =
      "The model does not contain paintable geometry.";

    return;

  }


  if (
    !hasUV &&
    !hasTexture
  ) {

    readyButton.textContent =
      "Fix Issues Above";

    readyButton.title =
      "Create a UV map and paint texture first.";

    return;

  }


  if (
    !hasUV
  ) {

    readyButton.textContent =
      "Fix UV Map First";

    readyButton.title =
      "Generate a UV map before painting.";

    return;

  }


  if (
    !hasTexture
  ) {

    readyButton.textContent =
      "Fix Texture First";

    readyButton.title =
      "Create a paint texture before painting.";

  }

}


/* =========================================================
   MATERIAL LIST
========================================================= */

function updateMaterialList(
  materials
) {

  const container =
    document.getElementById(
      "material-list"
    );


  if (
    !container
  ) {

    return;

  }


  container.innerHTML =
    "";


  if (
    !materials ||
    materials.length ===
      0
  ) {

    container.innerHTML =
      `
        <div class="analysis-empty">
          <strong>No materials</strong>
          <span>A blank paint material can be created.</span>
        </div>
      `;


    return;

  }


  for (
    const material of
    materials
  ) {

    const row =
      document.createElement(
        "div"
      );


    row.className =
      "analysis-result is-good";


    row.innerHTML =
      `
        <span class="analysis-result__icon">
          M
        </span>

        <span class="analysis-result__content">

          <strong>
            ${escapeHtml(
              material.name
            )}
          </strong>

          <span>
            ${escapeHtml(
              material.type
            )}
          </span>

        </span>
      `;


    container.append(
      row
    );

  }

}


/* =========================================================
   ROW CREATION
========================================================= */

/**
 * Create an analysis result row.
 *
 * @param {Object} options
 * @param {string} options.icon
 * @param {string} options.title
 * @param {string} options.value
 * @param {string} options.state
 * @param {Object|null} options.action
 * @returns {HTMLDivElement}
 */
function createAnalysisRow(
  {
    icon,
    title,
    value,
    state,
    action = null
  }
) {

  const row =
    document.createElement(
      "div"
    );


  row.className =
    `analysis-result is-${state}`;


  const iconElement =
    document.createElement(
      "span"
    );


  iconElement.className =
    "analysis-result__icon";

  iconElement.textContent =
    icon;


  const content =
    document.createElement(
      "span"
    );


  content.className =
    "analysis-result__content";


  const titleElement =
    document.createElement(
      "strong"
    );


  titleElement.textContent =
    title;


  content.append(
    titleElement
  );


  const valueElement =
    document.createElement(
      "span"
    );


  valueElement.className =
    "analysis-result__value";

  valueElement.textContent =
    value;


  row.append(
    iconElement,
    content,
    valueElement
  );


  if (
    action
  ) {

    const actionButton =
      document.createElement(
        "button"
      );


    actionButton.className =
      "analysis-result__action";

    actionButton.id =
      action.id;

    actionButton.type =
      "button";

    actionButton.textContent =
      action.label;

    actionButton.title =
      action.title;

    actionButton.setAttribute(
      "aria-label",
      action.title
    );


    actionButton.addEventListener(
      "click",
      () => {

        actionButton.disabled =
          true;

        actionButton.textContent =
          "Fixing...";


        document.dispatchEvent(
          new CustomEvent(
            action.eventName,
            {
              detail:
                {
                  button:
                    actionButton,

                  issue:
                    action.id
                }
            }
          )
        );

      }
    );


    row.append(
      actionButton
    );

  }


  return row;

}


/* =========================================================
   HELPERS
========================================================= */

function setText(
  elementId,
  value
) {

  const element =
    document.getElementById(
      elementId
    );


  if (
    element
  ) {

    element.textContent =
      String(
        value
      );

  }

}


function formatNumber(
  value
) {

  return Number(
    value ||
    0
  ).toLocaleString(
    "en-GB"
  );

}


function escapeHtml(
  value
) {

  return String(
    value
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}
