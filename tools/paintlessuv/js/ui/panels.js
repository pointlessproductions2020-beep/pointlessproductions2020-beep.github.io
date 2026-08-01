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
      ? `${analysis.textures} found`
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


  container.append(
    createAnalysisRow(
      "✓",
      "Geometry loaded",
      `${formatNumber(
        analysis.meshes
      )} mesh${
        analysis.meshes === 1
          ? ""
          : "es"
      }`,
      "good"
    )
  );


  container.append(
    createAnalysisRow(
      analysis.hasUV
        ? "✓"
        : "!",
      analysis.hasUV
        ? "UV map found"
        : "UV map missing",
      analysis.hasUV
        ? `${analysis.meshesWithUV} ready`
        : `${analysis.meshesWithoutUV} need UVs`,
      analysis.hasUV
        ? "good"
        : "warning"
    )
  );


  container.append(
    createAnalysisRow(
      analysis.hasTexture
        ? "✓"
        : "!",
      analysis.hasTexture
        ? "Texture found"
        : "No texture found",
      analysis.hasTexture
        ? `${analysis.textures}`
        : "Blank layer needed",
      analysis.hasTexture
        ? "good"
        : "warning"
    )
  );


  container.append(
    createAnalysisRow(
      analysis.hasAnimations
        ? "✓"
        : "—",
      "Animations",
      String(
        analysis.animationCount
      ),
      "good"
    )
  );


  const prepareButton =
    document.getElementById(
      "fix-model-button"
    );


  if (
    prepareButton
  ) {

    prepareButton.disabled =
      false;


    prepareButton.textContent =
      analysis.readyToPaint
        ? "Ready to Paint"
        : "Prepare Model";

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
        <span class="analysis-result__icon">M</span>

        <span class="analysis-result__content">
          <strong>${escapeHtml(
            material.name
          )}</strong>

          <span>${escapeHtml(
            material.type
          )}</span>
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

function createAnalysisRow(
  icon,
  title,
  value,
  state
) {

  const row =
    document.createElement(
      "div"
    );


  row.className =
    `analysis-result is-${state}`;


  row.innerHTML =
    `
      <span class="analysis-result__icon">
        ${escapeHtml(
          icon
        )}
      </span>

      <span class="analysis-result__content">

        <strong>
          ${escapeHtml(
            title
          )}
        </strong>

      </span>

      <span class="analysis-result__value">
        ${escapeHtml(
          value
        )}
      </span>
    `;


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
    value || 0
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
