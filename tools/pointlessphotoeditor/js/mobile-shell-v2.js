"use strict";
(() => {
  const isMobile = () =>
    matchMedia("(max-width: 820px) and (pointer: coarse)").matches ||
    matchMedia("(max-width: 820px) and (hover: none)").matches;

  if (!isMobile()) return;
  document.body.classList.add("paintless-mobile-v2");

  const $ = (sel) => document.querySelector(sel);
  const make = (tag, cls, html = "") => {
    const el = document.createElement(tag); if (cls) el.className = cls; if (html) el.innerHTML = html; return el;
  };
  const layersApi = () => window.PaintlessLayers;
  const toolsApi = () => window.PaintlessTools;
  const activeLayer = () => layersApi()?.getActiveLayer?.() || null;
  const render = () => {
    layersApi()?.renderLayers?.();
    window.Paintless3DRenderer?.requestRender?.("mobile-v2");
  };
  const saveHistory = (reason) =>
    window.PaintlessHistory?.saveHistory?.(reason) ||
    document.dispatchEvent(new CustomEvent("paintless:history-requested", { detail:{ reason } }));

  // Mobile coordinate correction:
  // use the transformed stage rectangle itself as the visible document bounds.
  // This removes the centre-correct / edge-drifting touch error seen on mobile.
  const installMobileCoordinateMap = () => {
    const api = window.PaintlessCanvas;
    const stage = document.getElementById("canvas-stage");
    const editor = document.getElementById("editor-canvas");
    if (!api || !stage || !editor || api.__mobileV21Coordinates) return;
    api.__mobileV21Coordinates = true;
    api.clientToCanvas = (clientX, clientY) => {
      const r = stage.getBoundingClientRect();
      const w = Math.max(1, Number(editor.width) || 1);
      const h = Math.max(1, Number(editor.height) || 1);
      const x = (Number(clientX) - r.left) * (w / Math.max(1e-6, r.width));
      const y = (Number(clientY) - r.top) * (h / Math.max(1e-6, r.height));
      return { x, y, inside: x >= 0 && y >= 0 && x <= w && y <= h };
    };
    api.canvasToClient = (x, y) => {
      const r = stage.getBoundingClientRect();
      const w = Math.max(1, Number(editor.width) || 1);
      const h = Math.max(1, Number(editor.height) || 1);
      return { x: r.left + (Number(x) / w) * r.width, y: r.top + (Number(y) / h) * r.height };
    };
  };
  installMobileCoordinateMap();
  document.addEventListener("paintless:document-opened", installMobileCoordinateMap);
  document.addEventListener("paintless:image-layer-created", installMobileCoordinateMap);

  // ---------------------------------------------------------
  // MOBILE IMAGE IMPORT
  // Directly imports into PaintlessLayers instead of bouncing
  // through desktop buttons/file inputs. Desktop is untouched.
  // ---------------------------------------------------------
  const mobileImageInput = document.createElement("input");
  mobileImageInput.type = "file";
  mobileImageInput.accept = "image/png,image/jpeg,image/webp,image/gif,image/*";
  mobileImageInput.hidden = true;
  mobileImageInput.id = "pmv2-image-input";
  document.body.append(mobileImageInput);

  const mobileStatus = message => {
    document.dispatchEvent(new CustomEvent("paintless:status-message", {
      detail: { message }
    }));
  };

  const loadMobileImage = file => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Paintless could not read that image."));
    };
    image.src = url;
  });

  async function importMobileImageFile(file) {
    if (!file) return false;

    const canvasApi = window.PaintlessCanvas;
    const api = layersApi();

    if (!canvasApi?.isDocumentOpen?.()) {
      if (typeof window.PaintlessFiles?.openImageFile === "function") {
        return window.PaintlessFiles.openImageFile(file);
      }
      mobileStatus("Create or open a canvas first.");
      return false;
    }

    if (typeof api?.createLayerFromImage !== "function") {
      mobileStatus("Paintless image-layer engine is still loading.");
      return false;
    }

    try {
      mobileStatus(`Importing ${file.name}…`);
      const image = await loadMobileImage(file);

      // Use Paintless's own image-layer constructor. It handles the
      // document-size layer canvas, contain sizing and centring.
      const layer = api.createLayerFromImage(image, {
        name: String(file.name || "Imported Image").replace(/\.[^.]+$/, ""),
        fit: "contain",
        select: true
      });

      if (!layer?.canvas) {
        throw new Error("Paintless did not create the imported image layer.");
      }

      api.renderLayerList?.();
      api.renderLayers?.();
      saveHistory("Import image");

      document.dispatchEvent(new CustomEvent("paintless:image-imported", {
        detail: { file, layer, mobile: true }
      }));

      mobileStatus(`${file.name} imported as a new layer.`);
      installMobileCoordinateMap();

      requestAnimationFrame(() => {
        window.PaintlessCanvas?.fitCanvasToScreen?.();
        requestAnimationFrame(() => window.PaintlessCanvas?.centreCanvas?.());
      });

      return true;
    } catch (error) {
      console.error("Paintless Mobile image import failed:", error);
      mobileStatus(error?.message || "Paintless could not import that image.");
      return false;
    }
  }

  function requestMobileImageImport() {
    mobileImageInput.value = "";
    mobileImageInput.click();
  }

  mobileImageInput.addEventListener("change", async () => {
    const file = mobileImageInput.files?.[0];
    if (file) await importMobileImageFile(file);
    mobileImageInput.value = "";
  });

  const closeAll = () => {
    document.querySelectorAll(".pmv2-rail,.pmv2-card").forEach(el => el.classList.remove("open"));
  };

  // Top micro bar: nothing here changes canvas geometry.
  const top = make("div", "pmv2-top");
  top.innerHTML = `<span class="pmv2-brand">PAINTLESS</span>
    <button type="button" data-act="undo">↶</button>
    <button type="button" data-act="redo">↷</button>
    <button type="button" data-act="import">＋ IMG</button>`;
  document.body.append(top);
  top.addEventListener("click", e => {
    const a = e.target.closest("[data-act]")?.dataset.act;
    if (a === "undo") $("#undo-button")?.click();
    if (a === "redo") $("#redo-button")?.click();
    if (a === "import") requestMobileImageImport();
  });

  // Fine mobile zoom. Desktop keeps its original larger zoom steps.
  let mobileZoom = Math.max(.05, Number(String($("#zoom-display")?.textContent || "100").replace("%","")) / 100 || 1);
  const canvasControls = make("div", "pmv2-canvas-controls");
  canvasControls.innerHTML = `
    <button type="button" data-canvas="pan" aria-label="Pan canvas">✋</button>
    <button type="button" data-canvas="out" aria-label="Fine zoom out">−</button>
    <output class="pmv2-zoom">100%</output>
    <button type="button" data-canvas="in" aria-label="Fine zoom in">＋</button>
    <button type="button" data-canvas="fit">FIT</button>
    <button type="button" data-canvas="export">⇩</button>`;
  document.body.append(canvasControls);
  const zoomOut = canvasControls.querySelector(".pmv2-zoom");
  const mobileZoomStep = direction => {
    const percent = mobileZoom * 100;
    // Portrait phone canvases often FIT around 15–25%.
    // At that size a five-point jump is enormous, so use 1 point.
    const points = percent < 50 ? 1 : percent < 100 ? 2 : 5;
    return direction * (points / 100);
  };

  const setMobileZoom = value => {
    mobileZoom = Math.min(8, Math.max(.05, Math.round(Number(value) * 1000) / 1000));
    window.PaintlessCanvas?.setZoom?.(mobileZoom, { keepCentre: false });
    if (zoomOut) zoomOut.textContent = `${Math.round(mobileZoom * 100)}%`;
    requestAnimationFrame(() => window.PaintlessCanvas?.centreCanvas?.());
  };
  document.addEventListener("paintless:zoom-changed", e => {
    const z = Number(e.detail?.zoom);
    if (Number.isFinite(z)) {
      mobileZoom = z;
      if (zoomOut) zoomOut.textContent = `${Math.round(z * 100)}%`;
    }
  });
  let mobilePanMode = false;
  const panButton = canvasControls.querySelector('[data-canvas="pan"]');
  const setPanMode = enabled => {
    mobilePanMode = Boolean(enabled);
    panButton?.classList.toggle("active", mobilePanMode);
    document.body.classList.toggle("pmv2-pan-mode", mobilePanMode);
  };

  canvasControls.addEventListener("click", e => {
    const a = e.target.closest("[data-canvas]")?.dataset.canvas;
    if (a === "pan") setPanMode(!mobilePanMode);
    if (a === "out") setMobileZoom(mobileZoom + mobileZoomStep(-1));
    if (a === "in") setMobileZoom(mobileZoom + mobileZoomStep(1));
    if (a === "fit") {
      window.PaintlessCanvas?.fitCanvasToScreen?.();
      requestAnimationFrame(() => window.PaintlessCanvas?.centreCanvas?.());
    }
    if (a === "export") $("#export-button")?.click();
  });

  const leftEdge = make("button", "pmv2-edge left", "‹");
  const rightEdge = make("button", "pmv2-edge right", "›");
  leftEdge.type = rightEdge.type = "button";
  leftEdge.setAttribute("aria-label", "Tools"); rightEdge.setAttribute("aria-label", "Layers and modes");
  document.body.append(leftEdge, rightEdge);

  const leftRail = make("div", "pmv2-rail left");
  leftRail.innerHTML = `
    <button data-tool="brush">✎<small>BRUSH</small></button>
    <button data-tool="eraser">⌫<small>ERASE</small></button>
    <button data-tool="select">✧<small>SELECT</small></button>
    <button data-tool="move">✥<small>MOVE</small></button>
    <button data-tool="transform">↔<small>SIZE</small></button>
    <button data-tool="fill">▰<small>FILL</small></button>
    <button data-tool="gradient">◩<small>GRAD</small></button>
    <button data-tool="shape">◇<small>SHAPE</small></button>
    <button data-tool="text">T<small>TEXT</small></button>
    <button data-more-tools>•••<small>MORE</small></button>`;
  document.body.append(leftRail);

  const rightRail = make("div", "pmv2-rail right");
  rightRail.innerHTML = `
    <button data-panel="layer">▣<small>LAYER</small></button>
    <button data-panel="layers">☷<small>LAYERS</small></button>
    <button data-panel="3d">◉<small>2D/3D</small></button>
    <button data-panel="lux">✦<small>LUX</small></button>`;
  document.body.append(rightRail);

  const card = make("section", "pmv2-card");
  document.body.append(card);
  const showCard = (title, bodyHtml) => {
    card.innerHTML = `<div class="pmv2-card-head"><strong>${title}</strong><button type="button" data-close>×</button></div>${bodyHtml}`;
    card.classList.add("open");
    card.querySelector("[data-close]").onclick = () => card.classList.remove("open");
  };

  leftEdge.onclick = () => {
    const open = !leftRail.classList.contains("open"); closeAll(); if (open) leftRail.classList.add("open");
  };
  rightEdge.onclick = () => {
    const open = !rightRail.classList.contains("open"); closeAll(); if (open) rightRail.classList.add("open");
  };

  function syncActiveTool() {
    const current = toolsApi()?.getActiveTool?.() || toolsApi()?.getState?.("activeTool");
    leftRail.querySelectorAll("[data-tool]").forEach(b => b.classList.toggle("active", b.dataset.tool === current));
  }

  function openTool(tool) {
    toolsApi()?.setActiveTool?.(tool, { force:true });
    syncActiveTool();

    if (tool === "brush" || tool === "eraser") {
      const size = Number($("#brush-size")?.value || 20);
      const opacity = Number($("#tool-opacity")?.value || 100);
      showCard(tool === "brush" ? "BRUSH" : "ERASER", `
        <div class="pmv2-row"><label>Size</label><input data-bind="brush-size" type="range" min="1" max="200" value="${size}"><output>${size}px</output></div>
        <div class="pmv2-row"><label>Opacity</label><input data-bind="tool-opacity" type="range" min="1" max="100" value="${opacity}"><output>${opacity}%</output></div>
        <div class="pmv2-row"><label>Hardness</label><input data-bind="brush-hardness" type="range" min="0" max="100" value="${Number($("#brush-hardness")?.value || 80)}"><output>${Number($("#brush-hardness")?.value || 80)}%</output></div>
        <div class="pmv2-colour-row"><label>Colour</label><input data-mobile-colour type="color" value="${$("#primary-colour")?.value || "#a84cff"}"></div>`);
      card.querySelectorAll("[data-bind]").forEach(input => input.addEventListener("input", () => {
        const target = document.getElementById(input.dataset.bind); if (!target) return;
        target.value = input.value; target.dispatchEvent(new Event("input", { bubbles:true }));
        input.nextElementSibling.textContent = input.dataset.bind === "brush-size" ? `${input.value}px` : `${input.value}%`;
      }));
      card.querySelector("[data-mobile-colour]")?.addEventListener("input", e => {
        const target = $("#primary-colour"); if (!target) return;
        target.value = e.target.value; target.dispatchEvent(new Event("input", { bubbles:true })); target.dispatchEvent(new Event("change", { bubbles:true }));
      });
    } else if (tool === "select") {
      showCard("SELECT", `<div class="pmv2-grid">
        <button data-select="magic-wand">MAGIC</button><button data-select="polygon-lasso">POLYGON</button><button data-select="rectangle">RECT</button>
        <button data-select-action="new">NEW LAYER</button><button data-select-action="copy">COPY</button><button data-select-action="clear">CLEAR</button></div>`);
      card.querySelectorAll("[data-select]").forEach(b => b.onclick = () => {
        const s = $("#selection-mode"); if (s) { s.value=b.dataset.select; s.dispatchEvent(new Event("change",{bubbles:true})); }
      });
      card.querySelector("[data-select-action='new']").onclick = () => document.dispatchEvent(new KeyboardEvent("keydown", { key:"j", code:"KeyJ", ctrlKey:true, bubbles:true }));
      card.querySelector("[data-select-action='copy']").onclick = () => document.dispatchEvent(new KeyboardEvent("keydown", { key:"c", code:"KeyC", ctrlKey:true, bubbles:true }));
      card.querySelector("[data-select-action='clear']").onclick = () => $("#deselect-button")?.click();
    } else if (tool === "shape") {
      showCard("SHAPES", `<div class="pmv2-grid two">
        <button data-shape="ellipse">ELLIPSE</button><button data-shape="rectangle">RECTANGLE</button>
        <button data-shape="rounded-rectangle">ROUNDED</button><button data-shape="line">LINE</button></div>
        <div class="pmv2-grid two" style="margin-top:8px"><button data-check="shape-fill-enabled">FILL</button><button data-check="shape-stroke-enabled">STROKE</button></div>`);
      card.querySelectorAll("[data-shape]").forEach(b => b.onclick = () => {
        const s=$("#shape-type"); if(s){s.value=b.dataset.shape;s.dispatchEvent(new Event("change",{bubbles:true}));}
      });
      card.querySelectorAll("[data-check]").forEach(b => b.onclick = () => document.getElementById(b.dataset.check)?.click());
    } else if (tool === "text") {
      showCard("TEXT", `<div class="pmv2-row"><label>Size</label><input data-text-size type="range" min="6" max="200" value="${Number($("#text-font-size")?.value||32)}"><output>${Number($("#text-font-size")?.value||32)}px</output></div>
        <div class="pmv2-grid two"><button data-text-toggle="text-bold">BOLD</button><button data-text-toggle="text-italic">ITALIC</button></div>`);
      card.querySelector("[data-text-size]").oninput=e=>{const t=$("#text-font-size"); if(t){t.value=e.target.value;t.dispatchEvent(new Event("input",{bubbles:true}));t.dispatchEvent(new Event("change",{bubbles:true}));} e.target.nextElementSibling.textContent=`${e.target.value}px`;};
      card.querySelectorAll("[data-text-toggle]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.textToggle)?.click());
    } else {
      card.classList.remove("open");
    }
  }

  function moreToolsCard() {
    showCard("MORE TOOLS", `<div class="pmv2-grid three">
      <button data-extra-tool="crop">CROP</button><button data-extra-tool="clone">CLONE</button><button data-extra-tool="eyedropper">PICKER</button>
      <button data-extra-tool="blur">BLUR</button><button data-extra-tool="sharpen">SHARPEN</button><button data-extra-tool="smudge">SMUDGE</button>
      <button data-extra-tool="liquify">LIQUIFY</button></div>`);
    card.querySelectorAll("[data-extra-tool]").forEach(b=>b.onclick=()=>openTool(b.dataset.extraTool));
  }

  leftRail.addEventListener("click", e => {
    if (e.target.closest("[data-more-tools]")) { moreToolsCard(); return; }
    const tool=e.target.closest("[data-tool]")?.dataset.tool; if(tool) openTool(tool);
  });

  function layerCard() {
    const layer = activeLayer();
    if (!layer) { showCard("LAYER", `<p style="color:#c9bfce">Select a layer first.</p>`); return; }
    const opacity = Math.round((Number(layer.opacity)||1)*100);
    const scale = Math.round(((Math.abs(Number(layer.scaleX)||1)+Math.abs(Number(layer.scaleY)||1))/2)*100);
    const rotation = Math.round(Number(layer.rotation)||0);
    showCard("LAYER", `
      <div class="pmv2-grid"><button data-nudge="0,-10">↑</button><button data-nudge="-10,0">←</button><button data-nudge="10,0">→</button><button data-nudge="0,10">↓</button><button data-dup>DUP</button><button data-del>DEL</button></div>
      <div class="pmv2-row"><label>Size</label><input data-layer="scale" type="range" min="5" max="400" value="${scale}"><output>${scale}%</output></div>
      <div class="pmv2-row"><label>Rotate</label><input data-layer="rotation" type="range" min="-180" max="180" value="${rotation}"><output>${rotation}°</output></div>
      <div class="pmv2-row"><label>Opacity</label><input data-layer="opacity" type="range" min="0" max="100" value="${opacity}"><output>${opacity}%</output></div>`);
    card.querySelectorAll("[data-nudge]").forEach(b => b.onclick = () => {
      const [dx,dy]=b.dataset.nudge.split(",").map(Number); layer.transformX=(Number(layer.transformX)||0)+dx; layer.transformY=(Number(layer.transformY)||0)+dy; render(); saveHistory("Mobile layer nudge");
    });
    card.querySelector("[data-dup]").onclick=()=>layersApi()?.duplicateLayer?.(layer.id);
    card.querySelector("[data-del]").onclick=()=>layersApi()?.deleteLayer?.(layer.id);
    card.querySelectorAll("[data-layer]").forEach(input => input.oninput = () => {
      const kind=input.dataset.layer; const n=Number(input.value);
      if(kind==="scale") { const signX=(Number(layer.scaleX)||1)<0?-1:1; const signY=(Number(layer.scaleY)||1)<0?-1:1; layer.scaleX=signX*n/100; layer.scaleY=signY*n/100; input.nextElementSibling.textContent=`${n}%`; }
      if(kind==="rotation") { layer.rotation=n; input.nextElementSibling.textContent=`${n}°`; }
      if(kind==="opacity") { layer.opacity=n/100; input.nextElementSibling.textContent=`${n}%`; }
      render();
    });
    card.querySelectorAll("[data-layer]").forEach(input => input.onchange = () => saveHistory(`Mobile ${input.dataset.layer}`));
  }

  function layersCard() {
    const list = (layersApi()?.getLayers?.() || []).slice().reverse();
    showCard("LAYERS", `<div class="pmv2-layer-list">${list.map(l => `<button class="pmv2-layer-item ${l.id===layersApi()?.getActiveLayerId?.()?"active":""}" data-layer-id="${String(l.id).replaceAll('"','&quot;')}"><span>${String(l.name||"Layer")}</span><small>${Math.round((Number(l.opacity)||1)*100)}%</small></button>`).join("")}</div><div class="pmv2-grid three" style="margin-top:8px"><button data-import-image>＋ IMG</button><button data-add-layer>＋ LAYER</button><button data-dup-active>DUP</button></div>`);
    card.querySelectorAll("[data-layer-id]").forEach(b => b.onclick=()=>{layersApi()?.selectLayer?.(b.dataset.layerId); layersCard();});
    card.querySelector("[data-import-image]").onclick=requestMobileImageImport;
    card.querySelector("[data-add-layer]").onclick=()=>layersApi()?.createLayer?.();
    card.querySelector("[data-dup-active]").onclick=()=>{const l=activeLayer(); if(l) layersApi()?.duplicateLayer?.(l.id);};
  }

  function mode3dCard() {
    const mode = window.Paintless3DMode?.getMode?.() || "2d";
    showCard("PAINTLESS 3D", `<div class="pmv2-grid two"><button data-mode="2d" class="${mode==='2d'?'active':''}">2D</button><button data-mode="3d" class="${mode==='3d'?'active':''}">🔴 3D 🔵</button></div><div class="pmv2-grid two" style="margin-top:8px"><button data-3d-settings>SETTINGS</button><button data-3d-export>3D EXPORT</button></div>`);
    card.querySelector("[data-mode='2d']").onclick=()=>window.Paintless3DMode?.exit3DMode?.();
    card.querySelector("[data-mode='3d']").onclick=()=>window.Paintless3DMode?.enter3DMode?.();
    card.querySelector("[data-3d-settings]").onclick=()=>$("#paintless3d-settings-button")?.click();
    card.querySelector("[data-3d-export]").onclick=()=>$("#paintless3d-export-button")?.click();
  }

  function luxCard() {
    const api=window.PaintlessParaluxious;
    const st=api?.getState?.() || {};
    const layer=activeLayer();
    const d=Math.round((Number(layer?.paraluxiousDepth)||0)*100);
    showCard("PARALUXIOUS", `
      <div class="pmv2-grid two"><button data-lux-toggle>${st.enabled?'TURN OFF':'TURN ON'}</button><button data-lux-centre>CENTRE</button></div>
      <div class="pmv2-row"><label>Depth</label><input data-lux="depth" type="range" min="-200" max="200" step="5" value="${d}"><output>${d}</output></div>
      <div class="pmv2-row"><label>Horizontal</label><input data-lux="x" type="range" min="0" max="100" value="${Number(st.strengthX)||34}"><output>${Number(st.strengthX)||34}</output></div>
      <div class="pmv2-row"><label>Vertical</label><input data-lux="y" type="range" min="0" max="100" value="${Number(st.strengthY)||24}"><output>${Number(st.strengthY)||24}</output></div>
      <div class="pmv2-grid two"><button data-lux-tilt>📱 LIVE TILT</button><button data-lux-export>⇩ EXPORT .PLX</button></div>`);
    card.querySelector("[data-lux-toggle]").onclick=()=>$("#paraluxious-toggle")?.click();
    card.querySelector("[data-lux-centre]").onclick=()=>api?.centrePreview?.();
    card.querySelector("[data-lux-export]").onclick=()=>$("[data-export-plx]")?.click();
    card.querySelector("[data-lux-tilt]").onclick=async()=>{ await api?.requestMotionPermission?.(); api?.setDeviceTilt?.(true); card.classList.remove("open"); closeAll(); };
    card.querySelectorAll("[data-lux]").forEach(input=>input.oninput=()=>{
      const n=Number(input.value); const kind=input.dataset.lux;
      if(kind==='depth' && layer){ layer.paraluxiousDepth=n/100; render(); }
      if(kind==='x') api?.setStrengthX?.(n);
      if(kind==='y') api?.setStrengthY?.(n);
      input.nextElementSibling.textContent=String(n);
    });
  }

  rightRail.addEventListener("click", e => {
    const p=e.target.closest("[data-panel]")?.dataset.panel;
    if(p==='layer') layerCard(); if(p==='layers') layersCard(); if(p==='3d') mode3dCard(); if(p==='lux') luxCard();
  });

  // ---------------------------------------------------------
  // MOBILE CANVAS NAVIGATION
  // PAN button + one finger = move workspace.
  // Two fingers = pan + pinch zoom at any time.
  // ---------------------------------------------------------
  const viewport = document.getElementById("canvas-viewport");
  const gesturePoints = new Map();
  let navGesture = null;

  const distanceBetween = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const midpointBetween = (a, b) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  });

  function cancelPaintForNavigation() {
    try {
      window.PaintlessPointer?.cancelCurrentPointerAction?.();
      window.PaintlessPointer?.resetPointerState?.();
      window.PaintlessToolCore?.resetPointerState?.();
      window.PaintlessCanvas?.clearOverlay?.();
    } catch (_) {}
  }

  viewport?.addEventListener("pointerdown", event => {
    if (event.pointerType !== "touch") return;

    gesturePoints.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    });

    if (gesturePoints.size >= 2) {
      event.preventDefault();
      event.stopPropagation();
      cancelPaintForNavigation();

      const [a, b] = Array.from(gesturePoints.values()).slice(0, 2);
      const mid = midpointBetween(a, b);

      navGesture = {
        type: "pinch",
        startDistance: Math.max(1, distanceBetween(a, b)),
        startZoom: Number(window.PaintlessCanvas?.getZoom?.()) || mobileZoom || 1,
        startMidX: mid.x,
        startMidY: mid.y,
        startScrollLeft: viewport.scrollLeft,
        startScrollTop: viewport.scrollTop
      };
      return;
    }

    if (mobilePanMode) {
      event.preventDefault();
      event.stopPropagation();
      cancelPaintForNavigation();

      navGesture = {
        type: "pan",
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft: viewport.scrollLeft,
        startScrollTop: viewport.scrollTop
      };
    }
  }, { capture: true, passive: false });

  viewport?.addEventListener("pointermove", event => {
    if (event.pointerType !== "touch" || !gesturePoints.has(event.pointerId)) return;

    gesturePoints.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    });

    if (gesturePoints.size >= 2) {
      event.preventDefault();
      event.stopPropagation();

      const [a, b] = Array.from(gesturePoints.values()).slice(0, 2);
      const currentDistance = Math.max(1, distanceBetween(a, b));
      const currentMid = midpointBetween(a, b);

      if (!navGesture || navGesture.type !== "pinch") {
        navGesture = {
          type: "pinch",
          startDistance: currentDistance,
          startZoom: Number(window.PaintlessCanvas?.getZoom?.()) || mobileZoom || 1,
          startMidX: currentMid.x,
          startMidY: currentMid.y,
          startScrollLeft: viewport.scrollLeft,
          startScrollTop: viewport.scrollTop
        };
        return;
      }

      const ratio = currentDistance / navGesture.startDistance;
      const nextZoom = Math.min(8, Math.max(.05, navGesture.startZoom * ratio));

      window.PaintlessCanvas?.setZoom?.(nextZoom, { keepCentre: false });
      mobileZoom = nextZoom;
      if (zoomOut) zoomOut.textContent = `${Math.round(nextZoom * 100)}%`;

      viewport.scrollLeft =
        navGesture.startScrollLeft -
        (currentMid.x - navGesture.startMidX);

      viewport.scrollTop =
        navGesture.startScrollTop -
        (currentMid.y - navGesture.startMidY);

      return;
    }

    if (
      mobilePanMode &&
      navGesture?.type === "pan" &&
      navGesture.pointerId === event.pointerId
    ) {
      event.preventDefault();
      event.stopPropagation();

      viewport.scrollLeft =
        navGesture.startScrollLeft -
        (event.clientX - navGesture.startX);

      viewport.scrollTop =
        navGesture.startScrollTop -
        (event.clientY - navGesture.startY);
    }
  }, { capture: true, passive: false });

  const finishNavPointer = event => {
    gesturePoints.delete(event.pointerId);

    if (gesturePoints.size < 2 && navGesture?.type === "pinch") {
      navGesture = null;
    }

    if (navGesture?.type === "pan" && navGesture.pointerId === event.pointerId) {
      navGesture = null;
    }
  };

  viewport?.addEventListener("pointerup", finishNavPointer, { capture: true });
  viewport?.addEventListener("pointercancel", finishNavPointer, { capture: true });

  document.addEventListener("paintless:active-tool-changed", syncActiveTool);
  document.addEventListener("paintless:active-layer-changed", () => { if(card.classList.contains('open') && card.querySelector('[data-layer]')) layerCard(); });
  document.addEventListener("paintless:document-opened", () => setTimeout(()=>window.PaintlessCanvas?.fitCanvasToScreen?.(),50));

  syncActiveTool();
})();
