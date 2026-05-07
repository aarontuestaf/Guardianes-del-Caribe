/* ============================================================
   GameScene — top-down gameplay
   - Procedurally lays out a zone (playa / barrio / vertedero)
   - Spawns trash pickups, obstacles (toxic puddles, smoke)
   - Player: WASD / arrows + on-screen d-pad on touch
   - HUD via UIScene (score, fame, progress bar)
   ============================================================ */

class GameScene extends Phaser.Scene {
  constructor() { super("GameScene"); }

  create() {
    setPlaying(true);
    const W = this.scale.width, H = this.scale.height;

    // ---- World is bigger than the camera; camera follows player. ----
    this.WORLD_W = 720;
    this.WORLD_H = 540;
    this.physics.world.setBounds(0, 0, this.WORLD_W, this.WORLD_H);

    const zone = window.GameState.currentZone();
    this.zone = zone;
    this.trashRemaining = zone.trashCount;
    this.trashTotal = zone.trashCount;

    // ---- Background ground tiles based on biome ----
    this._buildGround(zone.biome);

    // ---- Decorations (palms, bushes, rocks, houses, trash piles) ----
    this._scatterDecor(zone.biome);

    // ---- Trash pickups ----
    this.trashGroup = this.physics.add.group();
    this._scatterTrash(zone.trashCount);

    // ---- Obstacles (toxic puddles, smoke) ----
    this.toxicGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.smokeGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this._scatterObstacles(zone.biome);

    // ---- Player ----
    this.player = this.physics.add.sprite(this.WORLD_W / 2, this.WORLD_H / 2, "player", 0);
    this.player.setCollideWorldBounds(true);
    // tighter hitbox around feet
    this.player.body.setSize(10, 8).setOffset(3, 11);
    this.player.facing = "down";
    this.player.invuln = 0;

    // overlap: pick up trash
    this.physics.add.overlap(this.player, this.trashGroup, this._pickupTrash, null, this);
    // overlap: toxic puddle (slow + small fame penalty, with cooldown)
    this.physics.add.overlap(this.player, this.toxicGroup, this._touchToxic, null, this);
    this.physics.add.overlap(this.player, this.smokeGroup, this._touchSmoke, null, this);

    // ---- Camera ----
    this.cameras.main.setBounds(0, 0, this.WORLD_W, this.WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // ---- Input ----
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: "W", A: "A", S: "S", D: "D", M: "M", ESC: "ESC",
    });
    this.touchDir = { x: 0, y: 0 };
    this._wireTouchControls();

    this.input.keyboard.on("keydown-M", () => SFX && SFX.toggleMute());
    this.input.keyboard.on("keydown-ESC", () => {
      this.scene.stop("UIScene");
      this.scene.start("MenuScene");
    });

    // ---- Banner: zone name + instruction ----
    this._showBanner(`${zone.name}`, "Recoge toda la basura para salvar el Caribe.");

    // ---- HUD ----
    this.scene.launch("UIScene", { gameScene: this });
    this.uiScene = this.scene.get("UIScene");

    // ---- Speed scales gently with level ----
    const lvl = window.GameState.zoneIndex;
    this.speed = 90 + Math.min(20, lvl * 3);
  }

  // ----------------------------------------------------------
  // Ground layer
  // ----------------------------------------------------------
  _buildGround(biome) {
    const TS = 16;
    const cols = Math.ceil(this.WORLD_W / TS);
    const rows = Math.ceil(this.WORLD_H / TS);

    let baseKey = "tile_grass";
    if (biome === "playa")      baseKey = "tile_sand";
    if (biome === "vertedero")  baseKey = "tile_dirt";
    if (biome === "barrio")     baseKey = "tile_grass";

    const base = this.add.tileSprite(0, 0, this.WORLD_W, this.WORLD_H, baseKey)
      .setOrigin(0).setDepth(-100);

    if (biome === "playa") {
      // Add an animated water strip along the top + shore line
      const water = this.add.tileSprite(0, 0, this.WORLD_W, 80, "tile_water_a")
        .setOrigin(0).setDepth(-99);
      this._waterTile = water;
      this._waterFrame = 0;
      this.time.addEvent({
        delay: 350, loop: true,
        callback: () => {
          this._waterFrame = 1 - this._waterFrame;
          water.setTexture(this._waterFrame ? "tile_water_b" : "tile_water_a");
        },
      });
      this.add.tileSprite(0, 80, this.WORLD_W, 16, "tile_shore").setOrigin(0).setDepth(-98);
    }

    if (biome === "barrio") {
      // a couple of road strips
      this.add.tileSprite(0, 240, this.WORLD_W, 32, "tile_road").setOrigin(0).setDepth(-98);
      this.add.tileSprite(380, 0, 32, this.WORLD_H, "tile_road").setOrigin(0).setDepth(-98);
    }

    if (biome === "vertedero") {
      // some scattered dirty patches darker
      const g = this.add.graphics({ x: 0, y: 0 }).setDepth(-99);
      g.fillStyle(0x6f4520, 0.6);
      for (let i = 0; i < 14; i++) {
        const x = Phaser.Math.Between(20, this.WORLD_W - 40);
        const y = Phaser.Math.Between(20, this.WORLD_H - 40);
        const r = Phaser.Math.Between(20, 50);
        g.fillCircle(x, y, r);
      }
    }
  }

  // ----------------------------------------------------------
  // Decor — palms, bushes, rocks, houses, trash mounds
  // ----------------------------------------------------------
  _scatterDecor(biome) {
    const decor = this.add.group();
    const place = (key, count, opts = {}) => {
      for (let i = 0; i < count; i++) {
        const x = Phaser.Math.Between(opts.minX ?? 20, opts.maxX ?? this.WORLD_W - 20);
        const y = Phaser.Math.Between(opts.minY ?? 110, opts.maxY ?? this.WORLD_H - 20);
        const s = this.add.image(x, y, key).setOrigin(0.5, 1);
        s.setDepth(y); // y-sort
        decor.add(s);
      }
    };

    if (biome === "playa") {
      place("palm", 12, { minY: 120 });
      place("rock", 6,  { minY: 120 });
      place("bush", 4,  { minY: 130 });
    } else if (biome === "barrio") {
      place("house_a", 4, { minY: 60, maxY: 230 });
      place("house_b", 3, { minY: 60, maxY: 230 });
      place("house_a", 3, { minY: 290, maxY: 500 });
      place("house_b", 3, { minY: 290, maxY: 500 });
      place("palm", 6, {});
      place("bush", 6, {});
    } else { // vertedero
      place("trashpile", 5, {});
      place("trashpile", 3, {});
      place("bush", 3, {});
      place("rock", 5, {});
      place("palm", 2, {});
    }
  }

  // ----------------------------------------------------------
  // Trash spawn
  // ----------------------------------------------------------
  _scatterTrash(count) {
    const kinds = [
      { key: "trash_bag",    points: 10, fame: 1 },
      { key: "trash_bottle", points: 6,  fame: 1 },
      { key: "trash_tire",   points: 15, fame: 2 },
      { key: "trash_can",    points: 5,  fame: 1 },
    ];
    for (let i = 0; i < count; i++) {
      const k = Phaser.Utils.Array.GetRandom(kinds);
      const x = Phaser.Math.Between(40, this.WORLD_W - 40);
      const y = Phaser.Math.Between(110, this.WORLD_H - 40);
      const s = this.trashGroup.create(x, y, k.key);
      s.setDepth(y);
      s.points = k.points;
      s.fame = k.fame;
      s.body.setSize(8, 8).setOffset(1, 1);
      s.setImmovable(true);
      // gentle bob
      this.tweens.add({
        targets: s, y: y - 1.5,
        duration: Phaser.Math.Between(900, 1400),
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
        delay: Phaser.Math.Between(0, 600),
      });
    }
  }

  // ----------------------------------------------------------
  // Obstacles — scale with level
  // ----------------------------------------------------------
  _scatterObstacles(biome) {
    const lvl = window.GameState.zoneIndex;
    const toxicCount = (biome === "vertedero" ? 6 : 2) + Math.min(6, lvl * 1);
    const smokeCount = (biome === "vertedero" ? 4 : 1) + Math.min(5, lvl);

    for (let i = 0; i < toxicCount; i++) {
      const x = Phaser.Math.Between(40, this.WORLD_W - 40);
      const y = Phaser.Math.Between(120, this.WORLD_H - 30);
      const s = this.toxicGroup.create(x, y, "toxic_puddle");
      s.setDepth(y).setOrigin(0.5);
      s.body.setSize(12, 6).setOffset(2, 3);
      this.tweens.add({
        targets: s, alpha: 0.7,
        duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });
    }
    for (let i = 0; i < smokeCount; i++) {
      const x = Phaser.Math.Between(60, this.WORLD_W - 60);
      const y = Phaser.Math.Between(120, this.WORLD_H - 60);
      const s = this.smokeGroup.create(x, y, "smoke_a");
      s.setDepth(y).setOrigin(0.5);
      s.body.setSize(8, 8).setOffset(2, 2);
      // 2-frame anim by swapping texture
      this.time.addEvent({
        delay: 220, loop: true,
        callback: () => s.setTexture(s.texture.key === "smoke_a" ? "smoke_b" : "smoke_a"),
      });
      // gentle drift
      this.tweens.add({
        targets: s, y: y - 6, alpha: 0.7,
        duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
        delay: Phaser.Math.Between(0, 400),
      });
    }
  }

  // ----------------------------------------------------------
  // Pickup
  // ----------------------------------------------------------
  _pickupTrash(player, trash) {
    if (!trash.active) return;
    const gs = window.GameState;
    gs.score += trash.points;
    gs.fame  += trash.fame;
    this.trashRemaining = Math.max(0, this.trashRemaining - 1);

    SFX && SFX.pickupTrash();

    // sparkle vfx
    const spark = this.add.image(trash.x, trash.y, "spark_a").setDepth(trash.y + 1);
    this.tweens.add({
      targets: spark, scale: 2, alpha: 0, y: trash.y - 8,
      duration: 320, onComplete: () => spark.destroy(),
    });
    const floater = this.add.text(trash.x, trash.y - 6, `+${trash.points}`, {
      fontFamily: "monospace", fontSize: "8px", color: "#ffd66e",
      stroke: "#1a2233", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(trash.y + 2);
    floater.setResolution(2);
    this.tweens.add({
      targets: floater, y: floater.y - 14, alpha: 0,
      duration: 600, onComplete: () => floater.destroy(),
    });

    trash.destroy();
    this.uiScene && this.uiScene.refresh();

    if (this.trashRemaining <= 0) this._winZone();
  }

  _touchToxic(player) {
    if (this.player.invuln > 0) return;
    this.player.invuln = 60; // ~1s
    const gs = window.GameState;
    gs.fame = Math.max(0, gs.fame - 1);
    SFX && SFX.hurt();
    this.cameras.main.shake(120, 0.004);
    this.player.setTint(0x9bff5a);
    this.time.delayedCall(220, () => this.player.clearTint());
    this.uiScene && this.uiScene.refresh();
  }

  _touchSmoke(player) {
    if (this.player.invuln > 0) return;
    this.player.invuln = 50;
    SFX && SFX.hurt();
    this.player.setTint(0x888888);
    this.time.delayedCall(220, () => this.player.clearTint());
  }

  // ----------------------------------------------------------
  // Win
  // ----------------------------------------------------------
  _winZone() {
    SFX && SFX.victory();
    this.physics.pause();
    this.player.anims.stop();
    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.time.delayedCall(480, () => {
      this.scene.stop("UIScene");
      this.scene.start("VictoryScene", { zoneName: this.zone.name });
    });
  }

  // ----------------------------------------------------------
  // Banner
  // ----------------------------------------------------------
  _showBanner(title, subtitle) {
    const W = this.scale.width, H = this.scale.height;
    const cam = this.cameras.main;

    const bg = this.add.rectangle(W / 2, 30, W - 24, 36, 0x1a2233, 0.85)
      .setStrokeStyle(2, 0x58c46a).setScrollFactor(0).setDepth(1000);
    const t = this.add.text(W / 2, 22, title, {
      fontFamily: "monospace", fontSize: "11px",
      color: "#ffd66e", fontStyle: "bold",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    t.setResolution(2);
    const s = this.add.text(W / 2, 38, subtitle, {
      fontFamily: "monospace", fontSize: "8px", color: "#fff7e6",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    s.setResolution(2);

    [bg, t, s].forEach(o => o.setAlpha(0));
    this.tweens.add({ targets: [bg, t, s], alpha: 1, duration: 250 });
    this.time.delayedCall(2800, () => {
      this.tweens.add({
        targets: [bg, t, s], alpha: 0, duration: 400,
        onComplete: () => [bg, t, s].forEach(o => o.destroy()),
      });
    });
  }

  // ----------------------------------------------------------
  // Touch controls
  // ----------------------------------------------------------
  _wireTouchControls() {
    const btns = document.querySelectorAll(".dpad-btn");
    const setDir = (dir, on) => {
      const v = on ? 1 : 0;
      if (dir === "up")    this.touchDir.y = on ? -1 : (this.touchDir.y === -1 ? 0 : this.touchDir.y);
      if (dir === "down")  this.touchDir.y = on ?  1 : (this.touchDir.y ===  1 ? 0 : this.touchDir.y);
      if (dir === "left")  this.touchDir.x = on ? -1 : (this.touchDir.x === -1 ? 0 : this.touchDir.x);
      if (dir === "right") this.touchDir.x = on ?  1 : (this.touchDir.x ===  1 ? 0 : this.touchDir.x);
    };
    btns.forEach(btn => {
      const dir = btn.dataset.dir;
      const press = (e) => { e.preventDefault(); btn.classList.add("pressed"); setDir(dir, true); };
      const release = (e) => { e.preventDefault(); btn.classList.remove("pressed"); setDir(dir, false); };
      btn.addEventListener("pointerdown", press);
      btn.addEventListener("pointerup", release);
      btn.addEventListener("pointerleave", release);
      btn.addEventListener("pointercancel", release);
    });

    // Clean up listeners when scene shuts down
    this.events.once("shutdown", () => {
      btns.forEach(btn => btn.classList.remove("pressed"));
    });
  }

  // ----------------------------------------------------------
  // Update — input + movement + animation + y-sort
  // ----------------------------------------------------------
  update() {
    if (!this.player || !this.player.body) return;

    const k = this.keys, c = this.cursors, td = this.touchDir;
    let vx = 0, vy = 0;
    const left  = k.A.isDown || c.left.isDown  || td.x === -1;
    const right = k.D.isDown || c.right.isDown || td.x ===  1;
    const up    = k.W.isDown || c.up.isDown    || td.y === -1;
    const down  = k.S.isDown || c.down.isDown  || td.y ===  1;

    if (left)  vx = -1;
    if (right) vx =  1;
    if (up)    vy = -1;
    if (down)  vy =  1;

    // normalize diagonals
    if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }

    this.player.setVelocity(vx * this.speed, vy * this.speed);

    // Determine facing + animation
    let anim = null, facing = this.player.facing;
    if (vx !== 0 || vy !== 0) {
      if (Math.abs(vx) >= Math.abs(vy)) facing = vx > 0 ? "right" : "left";
      else facing = vy > 0 ? "down" : "up";
      anim = `walk_${facing}`;
    } else {
      anim = `idle_${facing}`;
    }
    this.player.facing = facing;
    if (this.player.anims.currentAnim?.key !== anim) this.player.play(anim, true);

    // y-sort player against decor by depth
    this.player.setDepth(this.player.y);

    if (this.player.invuln > 0) this.player.invuln--;
  }
}
