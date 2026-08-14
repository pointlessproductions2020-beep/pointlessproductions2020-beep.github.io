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
    if (a === "import") $("#import-image-button")?.click();
  });

  // Canvas controls delegate to Paintless' existing zoom implementation.
  const canvasControls = make("div", "pmv2-canvas-controls");
  canvasControls.innerHTML = `
    <button type="button" data-canvas="out">−</button>
    <button type="button" data-canvas="fit">FIT</button>
    <button type="button" data-canvas="in">＋</button>
    <button type="button" data-canvas="export">⇩</button>`;
  document.body.append(canvasControls);
  canvasControls.addEventListener("click", e => {
    const a = e.target.closest("[data-canvas]")?.dataset.canvas;
    if (a === "out") $("#zoom-out-button")?.click();
    if (a === "in") $("#zoom-in-button")?.click();
    if (a === "fit") {
      const fit = $("#fit-screen-button") || $("[data-action='fit-screen']");
      if (fit) fit.click(); else window.PaintlessCanvas?.fitToScreen?.();
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
    <button data-tool="selection">✧<small>SELECT</small></button>
    <button data-tool="move">✥<small>MOVE</small></button>
    <button data-tool="transform">↔<small>SIZE</small></button>
    <button data-tool="shapes">◇<small>SHAPE</small></button>
    <button data-tool="text">T<small>TEXT</small></button>`;
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
        <div class="pmv2-row"><label>Opacity</label><input data-bind="tool-opacity" type="range" min="1" max="100" value="${opacity}"><output>${opacity}%</output></div>`);
      card.querySelectorAll("[data-bind]").forEach(input => input.addEventListener("input", () => {
        const target = document.getElementById(input.dataset.bind); if (!target) return;
        target.value = input.value; target.dispatchEvent(new Event("input", { bubbles:true }));
        input.nextElementSibling.textContent = input.dataset.bind === "brush-size" ? `${input.value}px` : `${input.value}%`;
      }));
    } else if (tool === "selection") {
      showCard("SELECT", `<div class="pmv2-grid">
        <button data-select="magic-wand">MAGIC</button><button data-select="polygon-lasso">POLYGON</button><button data-select="rectangle">RECT</button>
        <button data-select-action="new">NEW LAYER</button><button data-select-action="copy">COPY</button><button data-select-action="clear">CLEAR</button></div>`);
      card.querySelectorAll("[data-select]").forEach(b => b.onclick = () => {
        const s = $("#selection-mode"); if (s) { s.value=b.dataset.select; s.dispatchEvent(new Event("change",{bubbles:true})); }
      });
      card.querySelector("[data-select-action='new']").onclick = () => document.dispatchEvent(new KeyboardEvent("keydown", { key:"j", code:"KeyJ", ctrlKey:true, bubbles:true }));
      card.querySelector("[data-select-action='copy']").onclick = () => document.dispatchEvent(new KeyboardEvent("keydown", { key:"c", code:"KeyC", ctrlKey:true, bubbles:true }));
      card.querySelector("[data-select-action='clear']").onclick = () => $("#deselect-button")?.click();
    } else {
      card.classList.remove("open");
    }
  }

  leftRail.addEventListener("click", e => { const tool=e.target.closest("[data-tool]")?.dataset.tool; if(tool) openTool(tool); });

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
    showCard("LAYERS", `<div class="pmv2-layer-list">${list.map(l => `<button class="pmv2-layer-item ${l.id===layersApi()?.getActiveLayerId?.()?"active":""}" data-layer-id="${String(l.id).replaceAll('"','&quot;')}"><span>${String(l.name||"Layer")}</span><small>${Math.round((Number(l.opacity)||1)*100)}%</small></button>`).join("")}</div><div class="pmv2-grid two" style="margin-top:8px"><button data-add-layer>＋ LAYER</button><button data-dup-active>DUPLICATE</button></div>`);
    card.querySelectorAll("[data-layer-id]").forEach(b => b.onclick=()=>{layersApi()?.selectLayer?.(b.dataset.layerId); layersCard();});
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

  document.addEventListener("paintless:active-tool-changed", syncActiveTool);
  document.addEventListener("paintless:active-layer-changed", () => { if(card.classList.contains('open') && card.querySelector('[data-layer]')) layerCard(); });
  document.addEventListener("paintless:document-opened", () => setTimeout(()=>window.PaintlessCanvas?.fitToScreen?.(),50));

  syncActiveTool();
})();
