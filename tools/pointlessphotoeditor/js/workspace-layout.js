"use strict";

/* =========================================================
   PAINTLESS
   WORKSPACE LAYOUT CONTROLLER — v1.0

   Handles:
   - Right sidebar width resizing
   - Remembered sidebar width
   - Individual panel height resizing
   - Layers / Ultra Anaglyph splitter
   - Toolbar duplicate cleanup
========================================================= */

(() => {

  function initialisePaintlessWorkspaceLayout() {
    const root = document.documentElement;
    const editorLayout = document.querySelector('.editor-layout');
    const sidebar = document.querySelector('.right-sidebar');
    const sidebarHandle = document.getElementById('sidebar-resize-handle');
    const toolbox = document.querySelector('.toolbox');
    if (!editorLayout || !sidebar || !sidebarHandle || !toolbox) return;

    const sidebarKey = 'paintless:right-sidebar-width';
    const clampWidth = (value) => Math.min(620, Math.max(260, Number(value) || 300));
    const applySidebarWidth = (value) => {
      const width = clampWidth(value);
      root.style.setProperty('--sidebar-width', `${width}px`);
      sidebarHandle.setAttribute('aria-valuenow', String(Math.round(width)));
      return width;
    };
    applySidebarWidth(localStorage.getItem(sidebarKey) || 300);

    let draggingSidebar = false;
    const finishSidebarDrag = () => {
      if (!draggingSidebar) return;
      draggingSidebar = false;
      sidebarHandle.classList.remove('is-dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const width = parseFloat(getComputedStyle(root).getPropertyValue('--sidebar-width')) || 300;
      localStorage.setItem(sidebarKey, String(Math.round(width)));
    };
    sidebarHandle.addEventListener('pointerdown', (event) => {
      draggingSidebar = true;
      sidebarHandle.classList.add('is-dragging');
      sidebarHandle.setPointerCapture?.(event.pointerId);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      event.preventDefault();
    });
    window.addEventListener('pointermove', (event) => {
      if (!draggingSidebar) return;
      applySidebarWidth(window.innerWidth - event.clientX);
    });
    window.addEventListener('pointerup', finishSidebarDrag);
    window.addEventListener('pointercancel', finishSidebarDrag);
    sidebarHandle.addEventListener('keydown', (event) => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      const current = parseFloat(getComputedStyle(root).getPropertyValue('--sidebar-width')) || 300;
      const next = event.key === 'Home' ? 260 : event.key === 'End' ? 620 : current + (event.key === 'ArrowLeft' ? 16 : -16);
      localStorage.setItem(sidebarKey, String(Math.round(applySidebarWidth(next))));
      event.preventDefault();
    });

    const panelKey = 'paintless:panel-heights';
    let panelHeights = {};
    try { panelHeights = JSON.parse(localStorage.getItem(panelKey) || '{}') || {}; } catch (_) { panelHeights = {}; }

    const setupPanel = (panel, index) => {
      if (panel.classList.contains('layers-panel')) return;
      if (panel.dataset.paintlessResizable === 'true') return;
      panel.dataset.paintlessResizable = 'true';
      const identity = [...panel.classList].find((name) => name.endsWith('-panel') && name !== 'editor-panel') || `panel-${index}`;
      panel.dataset.panelIdentity = identity;
      if (panelHeights[identity]) panel.style.height = `${Math.max(120, Number(panelHeights[identity]))}px`;
      const handle = document.createElement('div');
      handle.className = 'panel-resize-handle';
      handle.setAttribute('role','separator');
      handle.setAttribute('aria-orientation','horizontal');
      handle.setAttribute('aria-label',`Resize ${identity.replace(/-/g,' ')}`);
      panel.appendChild(handle);
      let active = false, startY = 0, startHeight = 0;
      const finish = () => {
        if (!active) return;
        active = false;
        handle.classList.remove('is-dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        panelHeights[identity] = Math.round(panel.getBoundingClientRect().height);
        localStorage.setItem(panelKey, JSON.stringify(panelHeights));
      };
      handle.addEventListener('pointerdown',(event)=>{
        active = true; startY = event.clientY; startHeight = panel.getBoundingClientRect().height;
        handle.setPointerCapture?.(event.pointerId); handle.classList.add('is-dragging');
        document.body.style.cursor='row-resize'; document.body.style.userSelect='none'; event.preventDefault(); event.stopPropagation();
      });
      window.addEventListener('pointermove',(event)=>{ if(active) panel.style.height = `${Math.max(120, Math.min(sidebar.clientHeight - 40, startHeight + event.clientY - startY))}px`; });
      window.addEventListener('pointerup',finish);
      window.addEventListener('pointercancel',finish);
    };
    const setupPanels = () => Array.from(sidebar.querySelectorAll('.editor-panel')).forEach(setupPanel);
    setupPanels();
    new MutationObserver(setupPanels).observe(sidebar,{childList:true,subtree:true});

    const ultraHeightKey = 'paintless:ultra-panel-height';

    const findUltraPanel = () => {
      const candidates = Array.from(
        sidebar.querySelectorAll(
          ':scope > section, :scope > div, [class*="ultra"], [id*="ultra"], [class*="anaglyph"], [id*="anaglyph"]'
        )
      );

      return candidates.find((element) => {
        if (!(element instanceof HTMLElement)) return false;
        if (element.classList.contains('layers-panel')) return false;

        const identity = `${element.id} ${element.className}`.toLowerCase();
        const heading = element.querySelector('h1,h2,h3,.panel-title,.panel-header')?.textContent?.toLowerCase() || '';
        const text = `${identity} ${heading}`;

        return text.includes('ultra') || text.includes('anaglyph');
      }) || null;
    };

    const setupLayersUltraSplitter = () => {
      const layersPanel = sidebar.querySelector('.layers-panel');
      const ultraPanel = findUltraPanel();

      if (!layersPanel || !ultraPanel || ultraPanel === layersPanel) return false;

      let splitter = sidebar.querySelector('.layers-ultra-resize-handle');

      if (!splitter) {
        splitter = document.createElement('div');
        splitter.className = 'layers-ultra-resize-handle';
        splitter.setAttribute('role', 'separator');
        splitter.setAttribute('aria-orientation', 'horizontal');
        splitter.setAttribute('aria-label', 'Resize Layers and Ultra Anaglyph panels');
        splitter.tabIndex = 0;
        ultraPanel.parentNode.insertBefore(splitter, ultraPanel);
      } else if (splitter.nextElementSibling !== ultraPanel) {
        ultraPanel.parentNode.insertBefore(splitter, ultraPanel);
      }

      layersPanel.classList.add('layers-panel--shared-space');
      ultraPanel.classList.add('paintless-ultra-resizable-panel');

      const savedHeight = Math.max(150, Math.min(560, Number(localStorage.getItem(ultraHeightKey)) || 300));
      ultraPanel.style.setProperty('--paintless-ultra-panel-height', `${savedHeight}px`);
      ultraPanel.style.height = `${savedHeight}px`;

      if (splitter.dataset.paintlessConnected === 'true') return true;
      splitter.dataset.paintlessConnected = 'true';

      let active = false;
      let startY = 0;
      let startHeight = 0;

      const applyUltraHeight = (height) => {
        const sidebarHeight = sidebar.getBoundingClientRect().height;
        const maxHeight = Math.max(180, sidebarHeight - 220);
        const nextHeight = Math.max(150, Math.min(maxHeight, Number(height) || 300));
        ultraPanel.style.setProperty('--paintless-ultra-panel-height', `${nextHeight}px`);
        ultraPanel.style.height = `${nextHeight}px`;
        splitter.setAttribute('aria-valuenow', String(Math.round(nextHeight)));
        return nextHeight;
      };

      const finish = () => {
        if (!active) return;
        active = false;
        splitter.classList.remove('is-dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        localStorage.setItem(ultraHeightKey, String(Math.round(ultraPanel.getBoundingClientRect().height)));
      };

      splitter.addEventListener('pointerdown', (event) => {
        active = true;
        startY = event.clientY;
        startHeight = ultraPanel.getBoundingClientRect().height;
        splitter.setPointerCapture?.(event.pointerId);
        splitter.classList.add('is-dragging');
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        event.preventDefault();
      });

      window.addEventListener('pointermove', (event) => {
        if (!active) return;
        applyUltraHeight(startHeight - (event.clientY - startY));
      });

      window.addEventListener('pointerup', finish);
      window.addEventListener('pointercancel', finish);

      splitter.addEventListener('keydown', (event) => {
        if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        const current = ultraPanel.getBoundingClientRect().height;
        const next = event.key === 'Home' ? 150 :
          event.key === 'End' ? sidebar.getBoundingClientRect().height - 220 :
          current + (event.key === 'ArrowUp' ? 20 : -20);
        const applied = applyUltraHeight(next);
        localStorage.setItem(ultraHeightKey, String(Math.round(applied)));
        event.preventDefault();
      });

      return true;
    };

    setupLayersUltraSplitter();
    new MutationObserver(() => requestAnimationFrame(setupLayersUltraSplitter))
      .observe(sidebar, { childList: true, subtree: true });

    document.addEventListener('paintless3d:module-ready', () => {
      requestAnimationFrame(setupLayersUltraSplitter);
      window.setTimeout(setupLayersUltraSplitter, 100);
    });

    const groupForTool = {
      move:'navigate', select:'navigate', crop:'navigate', transform:'navigate',
      brush:'paint', eraser:'paint', fill:'paint', gradient:'paint',
      clone:'retouch', eyedropper:'retouch', blur:'retouch', sharpen:'retouch', smudge:'retouch', liquify:'retouch',
      text:'create', shape:'create'
    };
    let tidying = false;
    const tidyToolbar = () => {
      if (tidying) return;
      tidying = true;
      try {
        const seen = new Map();
        Array.from(toolbox.querySelectorAll('.tool-button[data-tool]')).forEach((button) => {
          const tool = button.dataset.tool;
          if (!tool) return;
          if (seen.has(tool)) { button.closest('.tool-family')?.remove?.() || button.remove(); return; }
          seen.set(tool, button);
          const group = toolbox.querySelector(`[data-tool-group="${groupForTool[tool] || 'create'}"] .toolbox-grid`);
          const item = button.closest('.tool-family') || button;
          if (group && item.parentElement !== group) group.appendChild(item);
        });
        Array.from(toolbox.querySelectorAll('.support-tool-button')).slice(1).forEach((item)=>item.remove());
      } finally { tidying = false; }
    };
    tidyToolbar();
    new MutationObserver(() => requestAnimationFrame(tidyToolbar)).observe(toolbox,{childList:true,subtree:true});
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialisePaintlessWorkspaceLayout,
      { once: true }
    );
  } else {
    initialisePaintlessWorkspaceLayout();
  }

})();
