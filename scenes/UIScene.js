/* ============================================================
   UIScene — HUD overlay rendered above the GameScene.
   Shows zone name, score, fame, and a cleanup progress bar.
   ============================================================ */

class UIScene extends Phaser.Scene {
  constructor() { super("UIScene"); }

  init(data) {
    this.gameScene = data.gameScene;
  }

  create() {
    const W = this.scale.width;
    const gs = window.GameState;

    // Top-left: score + fame
    const padBg = this.add.rectangle(8, 8, 150, 28, 0x1a2233, 0.78)
      .setOrigin(0).setStrokeStyle(2, 0x58c46a);

    this.add.image(18, 16, "icon_coin");
    this.scoreText = this.add.text(28, 12, "0", {
      fontFamily: "monospace", fontSize: "10px", color: "#ffd66e",
    });
    this.scoreText.setResolution(2);

    this.add.image(80, 16, "icon_leaf");
    this.fameText = this.add.text(90, 12, "0", {
      fontFamily: "monospace", fontSize: "10px", color: "#9bff7a",
    });
    this.fameText.setResolution(2);

    // Top-right: zone label
    this.zoneText = this.add.text(W - 10, 12,
      `Zona ${gs.zoneIndex + 1}: ${this.gameScene.zone.name.split(",")[0]}`,
      { fontFamily: "monospace", fontSize: "9px", color: "#fff7e6",
        stroke: "#1a2233", strokeThickness: 3 }
    ).setOrigin(1, 0);
    this.zoneText.setResolution(2);

    // Bottom: cleanup progress bar
    const barW = W - 24, barH = 10, barY = this.scale.height - 18;
    this.barBg = this.add.rectangle(12, barY, barW, barH, 0x1a2233, 0.85)
      .setOrigin(0).setStrokeStyle(2, 0x58c46a);
    this.barFill = this.add.rectangle(14, barY + 2, 2, barH - 4, 0x58c46a)
      .setOrigin(0);
    this.barLabel = this.add.text(W / 2, barY - 9, "Limpieza 0%", {
      fontFamily: "monospace", fontSize: "8px", color: "#fff7e6",
      stroke: "#1a2233", strokeThickness: 3,
    }).setOrigin(0.5);
    this.barLabel.setResolution(2);

    this.refresh();
  }

  refresh() {
    const gs = window.GameState;
    const total = this.gameScene.trashTotal;
    const left = this.gameScene.trashRemaining;
    const cleaned = total - left;
    const pct = total > 0 ? cleaned / total : 0;

    this.scoreText.setText(String(gs.score));
    this.fameText.setText(String(gs.fame));
    this.barLabel.setText(`Limpieza ${Math.round(pct * 100)}%  ·  ${cleaned}/${total}`);

    const maxFill = (this.scale.width - 24) - 4;
    this.tweens.add({
      targets: this.barFill,
      width: Math.max(2, maxFill * pct),
      duration: 220, ease: "Sine.easeOut",
    });
  }
}
