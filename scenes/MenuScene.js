/* ============================================================
   MenuScene — title screen with animated Caribbean background
   ============================================================ */

class MenuScene extends Phaser.Scene {
  constructor() { super("MenuScene"); }

  create() {
    setPlaying(false);
    const W = this.scale.width, H = this.scale.height;

    // ---------- Sky gradient (drawn as stacked rects) ----------
    const skyTop = 0x6ed4ff, skyMid = 0xffd28a, skyBot = 0xff9b6e;
    for (let y = 0; y < H * 0.55; y++) {
      const t = y / (H * 0.55);
      const c = lerpColor(skyTop, skyMid, t);
      this.add.rectangle(0, y, W, 1, c).setOrigin(0);
    }

    // Sun
    this.add.image(W * 0.78, H * 0.22, "sun").setScale(2);

    // Distant mountains (silhouette, simple zig-zag)
    const mountains = this.add.graphics();
    mountains.fillStyle(0x2a6f3a, 1);
    mountains.beginPath();
    mountains.moveTo(0, H * 0.55);
    let x = 0;
    while (x < W) {
      const peakH = 30 + ((x * 7) % 20);
      mountains.lineTo(x + 30, H * 0.55 - peakH);
      mountains.lineTo(x + 60, H * 0.55);
      x += 60;
    }
    mountains.lineTo(W, H * 0.55);
    mountains.lineTo(W, H);
    mountains.lineTo(0, H);
    mountains.closePath();
    mountains.fillPath();

    // Ocean stripe
    this.add.rectangle(0, H * 0.55, W, 4, 0xd4f1ff).setOrigin(0);
    this.add.rectangle(0, H * 0.55 + 4, W, 30, 0x2a8fc8).setOrigin(0);

    // Sand foreground
    this.add.tileSprite(0, H * 0.55 + 34, W, H - (H * 0.55 + 34), "tile_sand")
      .setOrigin(0);

    // Palms
    this.add.image(40, H * 0.55 + 32, "palm").setOrigin(0.5, 1).setScale(1.2);
    this.add.image(W - 40, H * 0.55 + 36, "palm").setOrigin(0.5, 1).setScale(1.4);
    this.add.image(W * 0.18, H * 0.55 + 50, "palm").setOrigin(0.5, 1);
    this.add.image(W * 0.82, H * 0.55 + 56, "palm").setOrigin(0.5, 1);

    // Drifting clouds
    for (let i = 0; i < 4; i++) {
      const c = this.add.image(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(20, 70),
        "cloud"
      ).setScale(Phaser.Math.FloatBetween(0.8, 1.4)).setAlpha(0.95);
      this.tweens.add({
        targets: c,
        x: c.x + W,
        duration: Phaser.Math.Between(28000, 50000),
        repeat: -1,
        onRepeat: () => { c.x = -c.width; },
      });
    }

    // Ocean foam shimmer
    this.tweens.add({
      targets: this.add.rectangle(0, H * 0.55 + 4, W, 1, 0xfff7e6).setOrigin(0).setAlpha(0.8),
      alpha: 0.2, duration: 800, yoyo: true, repeat: -1,
    });

    // ---------- Title ----------
    const titleY = 56;
    const title = this.add.text(W / 2, titleY, "GUARDIANES", {
      fontFamily: "monospace", fontSize: "26px",
      color: "#fff7e6", stroke: "#1a2233", strokeThickness: 6,
      fontStyle: "bold",
    }).setOrigin(0.5);
    title.setResolution(2);
    const subtitle = this.add.text(W / 2, titleY + 22, "DEL CARIBE", {
      fontFamily: "monospace", fontSize: "20px",
      color: "#ffd66e", stroke: "#1a2233", strokeThickness: 5,
      fontStyle: "bold",
    }).setOrigin(0.5);
    subtitle.setResolution(2);

    this.tweens.add({
      targets: [title, subtitle], y: "+=2",
      duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });

    // ---------- Description ----------
    const desc = this.add.text(W / 2, titleY + 50,
      "Lucha contra la contaminación y limpia\nlas zonas afectadas de R.D.",
      {
        fontFamily: "monospace", fontSize: "9px",
        color: "#fff7e6", align: "center",
        stroke: "#1a2233", strokeThickness: 3,
        lineSpacing: 4,
      }
    ).setOrigin(0.5);
    desc.setResolution(2);

    // ---------- Start button ----------
    const btnW = 110, btnH = 26;
    const btnY = H - 50;
    const btnBg = this.add.rectangle(W / 2, btnY, btnW, btnH, 0x58c46a)
      .setStrokeStyle(3, 0x1a2233);
    const btnShadow = this.add.rectangle(W / 2 + 2, btnY + 3, btnW, btnH, 0x1a2233)
      .setAlpha(0.45);
    btnShadow.setDepth(-1);
    const btnText = this.add.text(W / 2, btnY, "EMPEZAR", {
      fontFamily: "monospace", fontSize: "12px",
      color: "#1a2233", fontStyle: "bold",
    }).setOrigin(0.5);
    btnText.setResolution(2);

    btnBg.setInteractive({ useHandCursor: true });
    btnBg.on("pointerover", () => btnBg.setFillStyle(0x7adc88));
    btnBg.on("pointerout",  () => btnBg.setFillStyle(0x58c46a));
    btnBg.on("pointerdown", () => {
      window.SFX && SFX.uiClick();
      window.SFX && SFX.startMusic();
      window.GameState.reset();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(310, () => this.scene.start("GameScene"));
    });

    // Pulse the button
    this.tweens.add({
      targets: [btnBg, btnText],
      scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });

    // Hint
    const hint = this.add.text(W / 2, H - 16,
      "WASD / Flechas para moverte  ·  M para silenciar",
      { fontFamily: "monospace", fontSize: "8px", color: "#fff7e6" }
    ).setOrigin(0.5).setAlpha(0.85);
    hint.setResolution(2);

    // Mute toggle
    this.input.keyboard.on("keydown-M", () => {
      const m = window.SFX ? SFX.toggleMute() : false;
      this._muteTip && this._muteTip.destroy();
      this._muteTip = this.add.text(W / 2, 14, m ? "🔇 silenciado" : "🔊 sonido", {
        fontFamily: "monospace", fontSize: "9px", color: "#fff7e6"
      }).setOrigin(0.5);
      this._muteTip.setResolution(2);
      this.time.delayedCall(900, () => this._muteTip && this._muteTip.destroy());
    });

    // Allow ENTER / SPACE to start too
    this.input.keyboard.on("keydown-ENTER", () => btnBg.emit("pointerdown"));
    this.input.keyboard.on("keydown-SPACE", () => btnBg.emit("pointerdown"));

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }
}

// ---------- helper ----------
function lerpColor(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
window.lerpColor = lerpColor;
