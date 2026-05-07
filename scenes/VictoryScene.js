/* ============================================================
   VictoryScene — celebration + Continuar / Volver al menú
   ============================================================ */

class VictoryScene extends Phaser.Scene {
  constructor() { super("VictoryScene"); }

  init(data) { this.zoneName = data.zoneName || "esta zona"; }

  create() {
    setPlaying(false);
    const W = this.scale.width, H = this.scale.height;
    const gs = window.GameState;

    // Festive background
    this.add.rectangle(0, 0, W, H, 0x0d2440).setOrigin(0);
    // soft sun rays
    const rays = this.add.graphics();
    rays.fillStyle(0xffd66e, 0.08);
    for (let i = 0; i < 16; i++) {
      const a1 = (i / 16) * Math.PI * 2;
      const a2 = a1 + 0.18;
      rays.fillTriangle(
        W / 2, H / 2,
        W / 2 + Math.cos(a1) * 400, H / 2 + Math.sin(a1) * 400,
        W / 2 + Math.cos(a2) * 400, H / 2 + Math.sin(a2) * 400,
      );
    }
    this.tweens.add({ targets: rays, rotation: Math.PI * 2, duration: 30000, repeat: -1 });
    rays.x = W / 2; rays.y = H / 2; rays.setPosition(0, 0);

    // Confetti particles
    const colors = [0x58c46a, 0xffd66e, 0xff7b5a, 0x6ed4ff, 0xfff7e6];
    for (let i = 0; i < 40; i++) {
      const c = Phaser.Utils.Array.GetRandom(colors);
      const r = this.add.rectangle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(-40, -10),
        3, 4, c
      );
      this.tweens.add({
        targets: r,
        y: H + 20,
        x: r.x + Phaser.Math.Between(-30, 30),
        rotation: Phaser.Math.FloatBetween(-2, 2),
        duration: Phaser.Math.Between(2200, 3800),
        delay: Phaser.Math.Between(0, 1200),
        repeat: -1,
        repeatDelay: Phaser.Math.Between(200, 1600),
        onRepeat: () => { r.y = -10; r.x = Phaser.Math.Between(0, W); }
      });
    }

    // Big title
    const t1 = this.add.text(W / 2, 50, "¡VICTORIA!", {
      fontFamily: "monospace", fontSize: "26px",
      color: "#ffd66e", stroke: "#1a2233", strokeThickness: 6, fontStyle: "bold",
    }).setOrigin(0.5);
    t1.setResolution(2);

    const t2 = this.add.text(W / 2, 84, `Has limpiado\n${this.zoneName}`, {
      fontFamily: "monospace", fontSize: "11px",
      color: "#fff7e6", align: "center",
      stroke: "#1a2233", strokeThickness: 4, lineSpacing: 4,
    }).setOrigin(0.5);
    t2.setResolution(2);

    // Stats card
    const cardY = 140;
    const card = this.add.rectangle(W / 2, cardY, 220, 36, 0x1a2233, 0.9)
      .setStrokeStyle(2, 0x58c46a);
    this.add.image(W / 2 - 80, cardY - 6, "icon_coin");
    const s = this.add.text(W / 2 - 70, cardY - 11, `${gs.score}  pts`, {
      fontFamily: "monospace", fontSize: "10px", color: "#ffd66e",
    });
    s.setResolution(2);
    this.add.image(W / 2 - 80, cardY + 8, "icon_leaf");
    const f = this.add.text(W / 2 - 70, cardY + 3, `${gs.fame}  fama`, {
      fontFamily: "monospace", fontSize: "10px", color: "#9bff7a",
    });
    f.setResolution(2);
    const motto = this.add.text(W / 2 + 30, cardY,
      "¡Sigue cuidando\nel Caribe!",
      { fontFamily: "monospace", fontSize: "8px", color: "#fff7e6",
        align: "center", lineSpacing: 3 }
    ).setOrigin(0.5);
    motto.setResolution(2);

    // Buttons
    const mkBtn = (x, y, w, h, label, color, onClick) => {
      const bg = this.add.rectangle(x, y, w, h, color).setStrokeStyle(3, 0x1a2233);
      const sh = this.add.rectangle(x + 2, y + 3, w, h, 0x000000, 0.45);
      sh.setDepth(-1);
      const tx = this.add.text(x, y, label, {
        fontFamily: "monospace", fontSize: "10px",
        color: "#1a2233", fontStyle: "bold",
      }).setOrigin(0.5);
      tx.setResolution(2);
      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerover", () => bg.setFillStyle(Phaser.Display.Color.IntegerToColor(color).lighten(8).color));
      bg.on("pointerout",  () => bg.setFillStyle(color));
      bg.on("pointerdown", () => { SFX && SFX.uiClick(); onClick(); });
      return bg;
    };

    mkBtn(W / 2 - 70, H - 38, 110, 26, "CONTINUAR", 0x58c46a, () => {
      window.GameState.zoneIndex++;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(310, () => this.scene.start("GameScene"));
    });
    mkBtn(W / 2 + 70, H - 38, 110, 26, "VOLVER AL MENÚ", 0xffd66e, () => {
      window.GameState.reset();
      SFX && SFX.stopMusic();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(310, () => this.scene.start("MenuScene"));
    });

    // Educational footer
    const edu = this.add.text(W / 2, H - 8,
      "Los vertederos a cielo abierto contaminan tierra, agua y aire.",
      { fontFamily: "monospace", fontSize: "7px", color: "#9bff7a" }
    ).setOrigin(0.5);
    edu.setResolution(2);

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }
}
