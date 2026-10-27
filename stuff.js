(() => {
  "use strict";

  const host = location.hostname;
  if (location.protocol !== "https:" ||
      (host !== "stuff.co.nz" && !host.endsWith(".stuff.co.nz"))) return;

  const selector = ".stuff-article-layout .free-body.restricted-container";
  const mediaSelector = ".stuff-article-layout .free-body.max-h-300";
  const commentSelector = '.stuff-article-layout button[data-testid="comment-button"]';
  const options = {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "aria-hidden", "inert", "data-gated", "disabled"]
  };
  let timer;
  let openComments;

  function closeComments() {
    if (!openComments) return;
    const { drawer, transform, ariaHidden, ariaModal, inert, pointerEvents, hidden, button } = openComments;
    drawer.style.transform = transform;
    if (ariaHidden === null) drawer.removeAttribute("aria-hidden");
    else drawer.setAttribute("aria-hidden", ariaHidden);
    if (ariaModal === null) drawer.removeAttribute("aria-modal");
    else drawer.setAttribute("aria-modal", ariaModal);
    if (inert) drawer.setAttribute("inert", "");
    drawer.classList.toggle("pointer-events-none", pointerEvents);
    drawer.classList.toggle("hidden", hidden);
    drawer.removeAttribute("data-nzmwah-comments-open");
    openComments = undefined;
    button.focus();
  }

  document.addEventListener("click", event => {
    const target = event.target;
    if (!target?.closest) return;
    if (openComments && target.closest("button")?.querySelector('[data-testid="icon-close"]') &&
        openComments.drawer.contains(target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeComments();
      return;
    }
    const button = target.closest(`${commentSelector}[data-nzmwah-comments-button]`);
    if (!button) return;
    const drawer = document.querySelector('#comment-drawer-root [data-testid="drawer-content"]');
    // Use only the site's existing comments; do not replace its login/posting flow.
    if (!drawer || !drawer.querySelector(".coral-comments-container")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (openComments) return;
    openComments = {
      drawer, button, transform: drawer.style.transform,
      ariaHidden: drawer.getAttribute("aria-hidden"), inert: drawer.hasAttribute("inert"),
      ariaModal: drawer.getAttribute("aria-modal"),
      pointerEvents: drawer.classList.contains("pointer-events-none"),
      hidden: drawer.classList.contains("hidden")
    };
    drawer.setAttribute("data-nzmwah-comments-open", "");
    drawer.style.transform = "translateX(0)";
    drawer.removeAttribute("aria-hidden");
    drawer.setAttribute("aria-modal", "false");
    drawer.removeAttribute("inert");
    drawer.classList.remove("pointer-events-none", "hidden");
    drawer.querySelector("button")?.focus();
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && openComments) {
      event.preventDefault();
      closeComments();
    }
  });

  function reveal() {
    timer = undefined;
    observer.disconnect();
    try {
      if (openComments && !openComments.drawer.isConnected) openComments = undefined;
      for (const button of document.querySelectorAll(commentSelector)) {
        if (button.disabled) {
          button.setAttribute("data-nzmwah-comments-button", "");
          button.disabled = false;
        }
      }
      for (const block of document.querySelectorAll(mediaSelector)) {
        if (block.querySelector("img, video, iframe")) {
          block.classList.remove("max-h-300", "[clip-path:inset(0_-100vw)]");
        }
      }
      for (const block of document.querySelectorAll(selector)) {
        // Removing the classes avoids Tailwind's layered !important rules.
        block.classList.remove("hidden", "pointer-events-none", "select-none");
        if (block.getAttribute("aria-hidden") === "true") {
          block.removeAttribute("aria-hidden");
        }
        block.removeAttribute("inert");
        if (block.getAttribute("data-gated") === "true") {
          block.removeAttribute("data-gated");
        }
      }
    } finally {
      observer.observe(document, options);
    }
  }

  function schedule() {
    if (timer === undefined) timer = setTimeout(reveal, 50);
  }

  const observer = new MutationObserver(records => {
    if (records.some(record => record.type === "childList" ||
        record.target.matches?.(`${selector}, ${mediaSelector}, ${commentSelector}`))) schedule();
  });

  function start() {
    observer.observe(document, options);
    schedule();
  }

  start();
  addEventListener("pageshow", start);
  addEventListener("pagehide", () => {
    observer.disconnect();
    clearTimeout(timer);
    timer = undefined;
  });
})();
