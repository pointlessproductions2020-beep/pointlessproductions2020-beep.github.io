/* =========================================================
   POINTLESS ANALYTICS
   Paintless anonymous usage analytics
   ========================================================= */

(() => {
  "use strict";

  const ENDPOINT =
    "https://pointless-analytics.pointlessproductions2020.workers.dev/track";

  const APP = "paintless";


  /* =======================================================
     DEVICE
  ======================================================= */

  function getDeviceType() {

    const width =
      window.innerWidth || 0;

    const touch =
      navigator.maxTouchPoints > 0;

    if (
      touch &&
      width <= 768
    ) {
      return "mobile";
    }

    if (
      touch &&
      width <= 1200
    ) {
      return "tablet";
    }

    return "desktop";
  }


  /* =======================================================
     CURRENT PAINTLESS MODE
  ======================================================= */

  function getMode() {

    const body =
      document.body;

    if (
      body?.classList.contains("paintless-3d") ||
      body?.dataset?.mode === "3d"
    ) {
      return "3d";
    }

    return "2d";
  }


  /* =======================================================
     TRACK
  ======================================================= */

  function track(
    event,
    extra = {}
  ) {

    if (!event) {
      return;
    }

    const payload = {

      event:
        String(event),

      app:
        APP,

      page:
        window.location.pathname,

      mode:
        extra.mode ||
        getMode(),

      referrer:
        document.referrer ||
        "direct",

      device:
        getDeviceType()

    };


    /*
      Analytics must NEVER interfere with Paintless.

      If tracking fails, Paintless simply carries on.
    */

    try {

      fetch(
        ENDPOINT,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              payload
            ),

          keepalive:
            true
        }
      ).catch(
        () => {}
      );

    } catch (_) {

      // Intentionally ignored.

    }
  }


  /* =======================================================
     PAGE VIEW
  ======================================================= */

  function trackPageView() {

    track(
      "page_view"
    );
  }


  /* =======================================================
     PUBLIC API

     Other Paintless files can later call:

     PointlessAnalytics.track("image_imported");
     PointlessAnalytics.track("export_clicked");
     PointlessAnalytics.track("polygon_lasso");
  ======================================================= */

  window.PointlessAnalytics = {

    track,

    version:
      "1.0.0"

  };


  /* =======================================================
     START
  ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      trackPageView,
      {
        once: true
      }
    );

  } else {

    trackPageView();

  }

})();
