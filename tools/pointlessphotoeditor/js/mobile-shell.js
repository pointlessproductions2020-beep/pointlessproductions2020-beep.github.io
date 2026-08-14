"use strict";

(() => {
  const mq = window.matchMedia("(max-width: 680px), (pointer: coarse)");
  if (!mq.matches) return;

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const app = $("#paintless-app");
  if (!app || $("#paintless-mobile-shell")) return;

  document.documentElement.classList.add("paintless-mobile");

  const shell = document.createElement("div");
  shell.id = "paintless-mobile-shell";
  shell.innerHTML = `
    <button class="pm-edge pm-edge--left" data-pm="tools" aria-label="Tools">›</button>
    <button class="pm-edge pm-edge--right" data-pm="panels" aria-label="Layers and modes">‹</button>

    <div class="pm-rail pm-rail--left" data-pm-rail="tools" hidden>
      <button data-tool="move" title="Move">✥<small>Move</small></button>
      <button data-tool="select" title="Select">⬚<small>Select</small></button>
      <button data-tool="transform" title="Transform">⛶<small>Size</small></button>
      <button data-tool="brush" title="Brush">✎<small>Brush</small></button>
      <button data-tool="eraser" title="Eraser">⌫<small>Erase</small></button>
      <button data-tool="fill" title="Fill">◩<small>Fill</small></button>
      <button data-tool="eyedropper" title="Colour picker">◉<small>Pick</small></button>
      <button data-tool="shape" title="Shapes">○<small>Shape</small></button>
      <button data-pm-action="close-tools" title="Close">×</button>
    </div>

    <div class="pm-rail pm-rail--right" data-pm-rail="panels" hidden>
      <button data-pm-panel="layer" title="Selected layer">▱<small>Layer</small></button>
      <button data-pm-action="layers" title="Layers">☷<small>Layers</small></button>
      <button data-pm-action="3d" title="2D / 3D">3D<small>3D</small></button>
      <button data-pm-action="paraluxious" title="ParaLuxious">✦<small>Lux</small></button>
      <button data-pm-action="close-panels" title="Close">×</button>
    </div>

    <section class="pm-card" id="pm-card" hidden>
      <header><strong id="pm-card-title">Tool</strong><button data-pm-action="close-card" aria-label="Close">×</button></header>
      <div id="pm-card-body"></div>
    </section>

    <nav class="pm-canvas-controls" aria-label="Canvas view controls">
      <button data-pm-action="zoom-out" aria-label="Zoom out">−</button>
      <button data-pm-action="zoom-in" aria-label="Zoom in">+</button>
      <button data-pm-action="fit" aria-label="Fit canvas">⊡</button>
    </nav>`;
  app.appendChild(shell);

  const card = $("#pm-card");
  const cardTitle = $("#pm-card-title");
  const cardBody = $("#pm-card-body");
  const toolRail = $('[data-pm-rail="tools"]');
  const panelRail = $('[data-pm-rail="panels"]');

  function hideCard(){ card.hidden = true; cardBody.innerHTML = ""; }
  function showCard(title, html){ cardTitle.textContent = title; cardBody.innerHTML = html; card.hidden = false; }
  function closeRails(){ toolRail.hidden = true; panelRail.hidden = true; }
  function clickOriginal(selector){ const el=$(selector); if(el){ el.click(); return true; } return false; }
  function render(){ window.PaintlessLayers?.renderLayers?.(); window.PaintlessLayers?.renderLayerList?.(); window.PaintlessLayers?.updateLayerControls?.(); }
  function history(reason){ window.PaintlessHistory?.saveHistory?.(reason); }
  function layer(){ return window.PaintlessLayers?.getActiveLayer?.() || null; }

  function showToolCard(toolName){
    const labels = {move:"Move",select:"Select",transform:"Transform",brush:"Brush",eraser:"Eraser",fill:"Fill",eyedropper:"Colour Picker",shape:"Shapes"};
    const original = $(`.tool-button[data-tool="${toolName}"]`);
    original?.click();

    if (toolName === "transform" || toolName === "move") return showLayerCard();
    if (toolName === "select") {
      showCard("Select", `
        <div class="pm-choice-grid">
          <button data-original="#selection-mode-rectangle">Rectangle</button>
          <button data-original="#selection-mode-ellipse">Ellipse</button>
          <button data-original="#selection-mode-lasso">Lasso</button>
          <button data-original="#selection-mode-polygon">Polygon</button>
        </div>
        <div class="pm-action-row">
          <button data-shortcut="copy">Copy</button><button data-shortcut="separate">New layer</button><button data-shortcut="delete">Delete</button>
        </div>`);
      return;
    }
    if (toolName === "brush" || toolName === "eraser") {
      const size = $("#brush-size")?.value || 20;
      const opacity = $("#tool-opacity")?.value || 100;
      showCard(labels[toolName], `
        <label>Size <output id="pm-size-out">${size}px</output><input id="pm-size" type="range" min="1" max="200" value="${size}"></label>
        <label>Opacity <output id="pm-opacity-out">${opacity}%</output><input id="pm-opacity" type="range" min="1" max="100" value="${opacity}"></label>
        <label>Colour <input id="pm-colour" type="color" value="${$("#panel-colour-picker")?.value || "#a84cff"}"></label>`);
      return;
    }
    if (toolName === "shape") {
      showCard("Shapes", `<div class="pm-choice-grid"><button data-shape="ellipse">○ Ellipse</button><button data-shape="rectangle">□ Rectangle</button><button data-shape="rounded-rectangle">▢ Rounded</button><button data-shape="line">╱ Line</button></div>`);
      return;
    }
    showCard(labels[toolName] || "Tool", `<p class="pm-hint">${labels[toolName] || toolName} is active. Tap × when you're done.</p>`);
  }

  function showLayerCard(){
    const l=layer();
    if(!l){ showCard("Layer", `<p class="pm-hint">Tap a layer first.</p>`); return; }
    const sx=Math.round((Number(l.scaleX)||1)*100);
    const rot=Math.round(Number(l.rotation)||0);
    const opacity=Math.round((Number(l.opacity ?? 1))*100);
    showCard(l.name || "Selected layer", `
      <div class="pm-segment"><button class="is-on" data-transform-mode="move">Move</button><button data-transform-mode="size">Size</button><button data-transform-mode="rotate">Rotate</button></div>
      <div class="pm-nudge" data-nudge-panel="move"><button data-nudge="up">↑</button><div><button data-nudge="left">←</button><button data-nudge="right">→</button></div><button data-nudge="down">↓</button></div>
      <div class="pm-transform-panel" data-nudge-panel="size" hidden><label>Size <output id="pm-layer-size-out">${sx}%</output><input id="pm-layer-size" type="range" min="5" max="400" value="${Math.max(5,Math.min(400,sx))}"></label><div class="pm-action-row"><button data-scale-step="-5">−</button><button data-scale-step="5">+</button></div></div>
      <div class="pm-transform-panel" data-nudge-panel="rotate" hidden><label>Rotate <output id="pm-layer-rotate-out">${rot}°</output><input id="pm-layer-rotate" type="range" min="-180" max="180" value="${rot}"></label><div class="pm-action-row"><button data-rotate-step="-5">↶</button><button data-rotate-step="5">↷</button></div></div>
      <label>Opacity <output id="pm-layer-opacity-out">${opacity}%</output><input id="pm-layer-opacity" type="range" min="0" max="100" value="${opacity}"></label>
      <div class="pm-action-row"><button data-layer-action="duplicate">Duplicate</button><button data-layer-action="delete" class="danger">Delete</button></div>`);
  }

  shell.addEventListener("click", (e) => {
    const b=e.target.closest("button"); if(!b) return;
    if(b.dataset.pm === "tools"){ toolRail.hidden=!toolRail.hidden; panelRail.hidden=true; hideCard(); return; }
    if(b.dataset.pm === "panels"){ panelRail.hidden=!panelRail.hidden; toolRail.hidden=true; hideCard(); return; }
    if(b.dataset.tool){ showToolCard(b.dataset.tool); return; }
    const action=b.dataset.pmAction;
    if(action==="close-tools"){toolRail.hidden=true;return;}
    if(action==="close-panels"){panelRail.hidden=true;return;}
    if(action==="close-card"){hideCard();return;}
    if(action==="zoom-out"){clickOriginal("#zoom-out-button");return;}
    if(action==="zoom-in"){clickOriginal("#zoom-in-button");return;}
    if(action==="fit"){clickOriginal("#fit-screen-button");return;}
    if(action==="layers"){ document.querySelector(".right-sidebar")?.classList.toggle("pm-layers-open"); closeRails(); return; }
    if(action==="3d"){ clickOriginal("#paintless-3d-toggle, #paintless3d-toggle, [data-paintless-3d-toggle]"); return; }
    if(action==="paraluxious"){ clickOriginal("#paraluxious-toggle, [data-paraluxious-toggle], #paraluxious-drawer-toggle"); return; }
    if(b.dataset.pmPanel==="layer"){showLayerCard();return;}
    if(b.dataset.original){clickOriginal(b.dataset.original);return;}
    if(b.dataset.shortcut){ $(`.shortcut-tool-button[data-shortcut-action="${b.dataset.shortcut}"]`)?.click(); return; }
    if(b.dataset.shape){ window.PaintlessToolbar?.chooseShape?.(b.dataset.shape); return; }
    if(b.dataset.transformMode){
      $$("[data-transform-mode]",card).forEach(x=>x.classList.toggle("is-on",x===b));
      $$('[data-nudge-panel]',card).forEach(x=>x.hidden=x.dataset.nudgePanel!==b.dataset.transformMode); return;
    }
    const l=layer(); if(!l) return;
    if(b.dataset.nudge){ history("Move layer"); const d=8; if(b.dataset.nudge==="left")l.transformX-=d;if(b.dataset.nudge==="right")l.transformX+=d;if(b.dataset.nudge==="up")l.transformY-=d;if(b.dataset.nudge==="down")l.transformY+=d;render();return; }
    if(b.dataset.scaleStep){ history("Scale layer"); const d=Number(b.dataset.scaleStep)/100; l.scaleX=Math.max(.05,(Number(l.scaleX)||1)+d);l.scaleY=Math.max(.05,(Number(l.scaleY)||1)+d);render();showLayerCard();return; }
    if(b.dataset.rotateStep){ history("Rotate layer"); l.rotation=(Number(l.rotation)||0)+Number(b.dataset.rotateStep);render();showLayerCard();return; }
    if(b.dataset.layerAction==="duplicate"){window.PaintlessLayers?.duplicateLayer?.();showLayerCard();return;}
    if(b.dataset.layerAction==="delete"){window.PaintlessLayers?.deleteLayer?.();hideCard();return;}
  });

  shell.addEventListener("input", (e) => {
    const t=e.target;
    if(t.id==="pm-size"){const o=$("#brush-size");if(o){o.value=t.value;o.dispatchEvent(new Event("input",{bubbles:true}));}$("#pm-size-out").textContent=`${t.value}px`;}
    if(t.id==="pm-opacity"){const o=$("#tool-opacity");if(o){o.value=t.value;o.dispatchEvent(new Event("input",{bubbles:true}));}$("#pm-opacity-out").textContent=`${t.value}%`;}
    if(t.id==="pm-colour"){const o=$("#panel-colour-picker");if(o){o.value=t.value;o.dispatchEvent(new Event("input",{bubbles:true}));o.dispatchEvent(new Event("change",{bubbles:true}));}}
    const l=layer(); if(!l)return;
    if(t.id==="pm-layer-size"){const v=Number(t.value)/100;l.scaleX=v;l.scaleY=v;$("#pm-layer-size-out").textContent=`${t.value}%`;render();}
    if(t.id==="pm-layer-rotate"){l.rotation=Number(t.value);$("#pm-layer-rotate-out").textContent=`${t.value}°`;render();}
    if(t.id==="pm-layer-opacity"){l.opacity=Number(t.value)/100;$("#pm-layer-opacity-out").textContent=`${t.value}%`;render();}
  });

  shell.addEventListener("change", (e)=>{ if(["pm-layer-size","pm-layer-rotate","pm-layer-opacity"].includes(e.target.id)) history("Mobile layer transform"); });

  document.addEventListener("paintless:layer-selected", ()=>{ if(!card.hidden && cardTitle.textContent!=="Brush" && cardTitle.textContent!=="Eraser") showLayerCard(); });
})();
