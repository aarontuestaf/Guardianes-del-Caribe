/* ============================================================
   tweaks.js — in-game tweaks panel
   - Wires into the host edit-mode protocol.
   - Persists tweaks in the EDITMODE block below.
   - Applies live changes to the running Phaser game.
   ============================================================ */

(function () {
  // ---- Persisted defaults (host rewrites this JSON block on save) ----
  const TWEAKS = /*EDITMODE-BEGIN*/{
    "titleColor": "#ffd66e",
    "playerSpeed": 100,
    "trashMultiplier": 1,
    "showCredits": true,
    "music": true,
    "hazards": true
  }/*EDITMODE-END*/;

  // expose to scenes (read by GameScene / MenuScene)
  window.TWEAKS = TWEAKS;

  // ---- Apply tweaks to the live game ----
  function applyAll() {
    // Credits overlay visibility
    document.body.dataset.credits = TWEAKS.showCredits ? "true" : "false";

    // Title color — recolor MenuScene title if it's running
    try {
      const menu = window.game?.scene?.getScene?.("MenuScene");
      if (menu && menu.scene.isActive()) {
        const t = menu.children.list.find(o => o.text === "GUARDIANES");
        if (t) t.setColor("#fff7e6"); // top line stays cream
        const sub = menu.children.list.find(o => o.text === "DEL CARIBE");
        if (sub) sub.setColor(TWEAKS.titleColor);
      }
    } catch (e) {}

    // Player speed — applied next time GameScene reads it AND live
    try {
      const game = window.game?.scene?.getScene?.("GameScene");
      if (game && game.scene.isActive()) game.speed = TWEAKS.playerSpeed;
    } catch (e) {}

    // Music
    try {
      if (window.SFX) {
        const muted = window.SFX.isMuted();
        if (TWEAKS.music && muted) window.SFX.toggleMute();
        if (!TWEAKS.music && !muted) window.SFX.toggleMute();
      }
    } catch (e) {}

    // Hazards — hide/show toxic & smoke groups in active GameScene
    try {
      const gs = window.game?.scene?.getScene?.("GameScene");
      if (gs && gs.scene.isActive()) {
        [gs.toxicGroup, gs.smokeGroup].forEach(grp => {
          if (!grp) return;
          grp.getChildren().forEach(c => {
            c.setVisible(TWEAKS.hazards);
            if (c.body) c.body.enable = TWEAKS.hazards;
          });
        });
      }
    } catch (e) {}
  }

  // ---- Set + persist via host ----
  function setTweak(key, value) {
    TWEAKS[key] = value;
    applyAll();
    try {
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [key]: value } }, "*");
    } catch (e) {}
  }

  // ---- Patch GameScene so future runs use the tweaks ----
  // We do this by overriding the trash-count and speed at scene start.
  function patchGameSceneHooks() {
    const tryPatch = () => {
      const gs = window.game?.scene?.getScene?.("GameScene");
      if (!gs) return false;
      // Hook into create: wrap once.
      if (gs._tweaksHooked) return true;
      gs._tweaksHooked = true;
      const origCreate = gs.create.bind(gs);
      gs.create = function () {
        // adjust trash count BEFORE create reads it
        const z = window.GameState.currentZone();
        z.trashCount = Math.max(4, Math.round(z.trashCount * TWEAKS.trashMultiplier));
        origCreate();
        this.speed = TWEAKS.playerSpeed;
        // hide hazards if disabled
        if (!TWEAKS.hazards) applyAll();
      };
      return true;
    };
    if (!tryPatch()) {
      const id = setInterval(() => { if (tryPatch()) clearInterval(id); }, 200);
    }
  }

  // ---- Panel UI wiring ----
  function wirePanel() {
    const panel = document.getElementById("tweaks-panel");
    const closeBtn = document.getElementById("tw-close");
    const tcSel = document.getElementById("tw-titleColor");
    const spd = document.getElementById("tw-speed");
    const spdOut = document.getElementById("tw-speedOut");
    const trashSel = document.getElementById("tw-trash");
    const credCk = document.getElementById("tw-credits");
    const musicCk = document.getElementById("tw-music");
    const hazCk = document.getElementById("tw-hazards");

    // initial values
    tcSel.value = TWEAKS.titleColor;
    spd.value = TWEAKS.playerSpeed;
    spdOut.value = TWEAKS.playerSpeed;
    trashSel.value = String(TWEAKS.trashMultiplier);
    credCk.checked = !!TWEAKS.showCredits;
    musicCk.checked = !!TWEAKS.music;
    hazCk.checked = !!TWEAKS.hazards;

    tcSel.addEventListener("change", () => setTweak("titleColor", tcSel.value));
    spd.addEventListener("input", () => {
      spdOut.value = spd.value;
      setTweak("playerSpeed", parseInt(spd.value, 10));
    });
    trashSel.addEventListener("change", () =>
      setTweak("trashMultiplier", parseFloat(trashSel.value)));
    credCk.addEventListener("change", () => setTweak("showCredits", credCk.checked));
    musicCk.addEventListener("change", () => setTweak("music", musicCk.checked));
    hazCk.addEventListener("change", () => setTweak("hazards", hazCk.checked));

    closeBtn.addEventListener("click", () => {
      panel.hidden = true;
      try { window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*"); } catch (e) {}
    });

    // ---- Host edit-mode protocol ----
    window.addEventListener("message", (ev) => {
      const t = ev.data && ev.data.type;
      if (t === "__activate_edit_mode")    panel.hidden = false;
      if (t === "__deactivate_edit_mode")  panel.hidden = true;
    });
    // announce only AFTER the listener is live
    try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch (e) {}
  }

  // ---- Boot ----
  function init() {
    wirePanel();
    applyAll();
    patchGameSceneHooks();
    // Re-apply when MenuScene becomes active (title color)
    if (window.game) {
      window.game.events?.on?.("step", () => { /* no-op; reserved */ });
    }
    // Re-apply title color when the menu scene starts
    const watchMenu = setInterval(() => {
      const menu = window.game?.scene?.getScene?.("MenuScene");
      if (menu && menu.scene.isActive()) {
        applyAll();
      }
    }, 500);
    void watchMenu;
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();
