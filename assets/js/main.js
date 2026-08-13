"use strict";

/* =========================================================
   POINTLESS PRODUCTIONS
   Main JavaScript
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initialiseHeader();
  initialiseMobileMenu();
  initialiseRandomProjectButtons();
  initialiseRevealAnimations();
  initialiseActiveNavigation();
  initialiseReleaseTrack();
  updateCurrentYear();
});


/* =========================================================
   HEADER SCROLL STATE
========================================================= */

function initialiseHeader() {
  const header = document.querySelector("#site-header");

  if (!header) {
    return;
  }

  const updateHeader = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  updateHeader();

  window.addEventListener("scroll", updateHeader, {
    passive: true
  });
}


/* =========================================================
   MOBILE MENU
========================================================= */

function initialiseMobileMenu() {
  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#primary-navigation");

  if (!menuToggle || !navigation) {
    return;
  }

  const navLinks = navigation.querySelectorAll("a");

  const openMenu = () => {
    menuToggle.classList.add("is-open");
    navigation.classList.add("is-open");
    document.body.classList.add("menu-open");

    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Close navigation menu");
  };

  const closeMenu = () => {
    menuToggle.classList.remove("is-open");
    navigation.classList.remove("is-open");
    document.body.classList.remove("menu-open");

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
  };

  const toggleMenu = () => {
    const isOpen = navigation.classList.contains("is-open");

    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  menuToggle.addEventListener("click", toggleMenu);

  navLinks.forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  document.addEventListener("click", (event) => {
    const clickedInsideNavigation = navigation.contains(event.target);
    const clickedMenuButton = menuToggle.contains(event.target);

    if (!clickedInsideNavigation && !clickedMenuButton) {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) {
      closeMenu();
    }
  });
}


/* =========================================================
   RANDOM PROJECT BUTTONS
========================================================= */

function initialiseRandomProjectButtons() {
  const buttons = [
    document.querySelector("#surprise-button"),
    document.querySelector("#feeling-pointless-button")
  ].filter(Boolean);

  if (buttons.length === 0) {
    return;
  }

  const projects = [
    {
      title: "Blocky the Brave",
      url: "games/blockythebrave/"
    },
    {
      title: "Thnake",
      url: "games/thnake/"
    },
    {
      title: "Block Drop",
      url: "games/blockdrop/"
    },
    {
      title: "Pointless Photo Editor",
      url: "tools/pointlessphotoeditor/"
    },
    {
      title: "Paraluxious",
      url: "tools/paraluxious/"
    },
    {
      title: "Pointless Arcade",
      url: "games.html"
    },
    {
      title: "Pointless Productions Books",
      url: "books.html"
    }
  ];

  let lastProjectIndex = -1;

  const chooseRandomProject = () => {
    if (projects.length === 0) {
      return;
    }

    let randomIndex = Math.floor(Math.random() * projects.length);

    if (projects.length > 1) {
      while (randomIndex === lastProjectIndex) {
        randomIndex = Math.floor(Math.random() * projects.length);
      }
    }

    lastProjectIndex = randomIndex;

    const project = projects[randomIndex];

    showRandomProjectFeedback(project.title);

    window.setTimeout(() => {
      window.location.href = project.url;
    }, 420);
  };

  buttons.forEach((button) => {
    button.addEventListener("click", chooseRandomProject);
  });
}


function showRandomProjectFeedback(projectTitle) {
  const existingMessage = document.querySelector(".random-project-message");

  if (existingMessage) {
    existingMessage.remove();
  }

  const message = document.createElement("div");

  message.className = "random-project-message";
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");
  message.textContent = `Sending you to ${projectTitle}...`;

  Object.assign(message.style, {
    position: "fixed",
    left: "50%",
    bottom: "28px",
    zIndex: "9999",
    maxWidth: "calc(100% - 32px)",
    padding: "13px 18px",
    border: "1px solid rgba(194, 124, 255, 0.55)",
    borderRadius: "999px",
    background: "rgba(12, 8, 18, 0.96)",
    color: "#ffffff",
    fontSize: "0.82rem",
    fontWeight: "800",
    letterSpacing: "0.04em",
    textAlign: "center",
    boxShadow: "0 0 30px rgba(155, 77, 255, 0.32)",
    transform: "translateX(-50%) translateY(18px)",
    opacity: "0",
    transition: "opacity 180ms ease, transform 180ms ease"
  });

  document.body.appendChild(message);

  requestAnimationFrame(() => {
    message.style.opacity = "1";
    message.style.transform = "translateX(-50%) translateY(0)";
  });
}


/* =========================================================
   SCROLL REVEAL ANIMATIONS
========================================================= */

function initialiseRevealAnimations() {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const revealTargets = document.querySelectorAll(
    [
      ".section-heading",
      ".feature-card",
      ".category-section__intro",
      ".mini-project-card",
      ".coming-soon-panel",
      ".release-card",
      ".tool-showcase",
      ".discover-card",
      ".about-section__logo",
      ".about-section__content"
    ].join(",")
  );

  if (revealTargets.length === 0) {
    return;
  }

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((element) => {
      element.classList.add("is-visible");
    });

    return;
  }

  revealTargets.forEach((element, index) => {
    element.classList.add("reveal-ready");

    const delay = Math.min((index % 4) * 70, 210);
    element.style.transitionDelay = `${delay}ms`;
  });

  const observer = new IntersectionObserver(
    (entries, revealObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      root: null,
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.12
    }
  );

  revealTargets.forEach((element) => {
    observer.observe(element);
  });
}


/* =========================================================
   ACTIVE NAVIGATION LINK
========================================================= */

function initialiseActiveNavigation() {
  const navLinks = Array.from(
    document.querySelectorAll(".primary-navigation .nav-link")
  );

  if (navLinks.length === 0 || !("IntersectionObserver" in window)) {
    return;
  }

  const sectionMap = new Map();

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");

    if (!href || !href.startsWith("#")) {
      return;
    }

    const section = document.querySelector(href);

    if (section) {
      sectionMap.set(section, link);
    }
  });

  if (sectionMap.size === 0) {
    return;
  }

  const setActiveLink = (activeLink) => {
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link === activeLink);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visibleEntries.length === 0) {
        return;
      }

      const activeSection = visibleEntries[0].target;
      const activeLink = sectionMap.get(activeSection);

      if (activeLink) {
        setActiveLink(activeLink);
      }
    },
    {
      rootMargin: "-35% 0px -55% 0px",
      threshold: [0.01, 0.1, 0.25, 0.5]
    }
  );

  sectionMap.forEach((link, section) => {
    observer.observe(section);
  });
}


/* =========================================================
   RELEASE TRACK MOUSE-WHEEL SCROLLING
========================================================= */

function initialiseReleaseTrack() {
  const releaseTrack = document.querySelector(".release-track");

  if (!releaseTrack) {
    return;
  }

  releaseTrack.addEventListener(
    "wheel",
    (event) => {
      const canScrollHorizontally =
        releaseTrack.scrollWidth > releaseTrack.clientWidth;

      if (!canScrollHorizontally) {
        return;
      }

      const mainlyVerticalWheel =
        Math.abs(event.deltaY) > Math.abs(event.deltaX);

      if (!mainlyVerticalWheel) {
        return;
      }

      const atStart = releaseTrack.scrollLeft <= 0;
      const atEnd =
        Math.ceil(releaseTrack.scrollLeft + releaseTrack.clientWidth) >=
        releaseTrack.scrollWidth;

      const scrollingBackwards = event.deltaY < 0;
      const scrollingForwards = event.deltaY > 0;

      if (
        (atStart && scrollingBackwards) ||
        (atEnd && scrollingForwards)
      ) {
        return;
      }

      event.preventDefault();

      releaseTrack.scrollBy({
        left: event.deltaY,
        behavior: "auto"
      });
    },
    {
      passive: false
    }
  );
}


/* =========================================================
   CURRENT YEAR
========================================================= */

function updateCurrentYear() {
  const yearElement = document.querySelector("#current-year");

  if (!yearElement) {
    return;
  }

  yearElement.textContent = String(new Date().getFullYear());
}
