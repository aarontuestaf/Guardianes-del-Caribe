/* ============================================================
   BootScene
   Procedurally generates ALL pixel-art textures (so the game
   has zero external assets and runs cleanly on GitHub Pages).
   Also wires up Web Audio for retro SFX + ambient music.
   ============================================================ */

class BootScene extends Phaser.Scene {
  constructor() { super("BootScene"); }

  preload() {
    // Loading bar (drawn while we synthesize textures)
    const w = this.scale.width, h = this.scale.height;
    const bg = this.add.rectangle(0, 0, w, h, 0x07101c).setOrigin(0);
    const title = this.add.text(w / 2, h / 2 - 30, "GUARDIANES DEL CARIBE",
      { fontFamily: "monospace", fontSize: "16px", color: "#58c46a" }
    ).setOrigin(0.5);
    title.setResolution(2);

    const barBg = this.add.rectangle(w / 2, h / 2 + 6, 220, 14, 0x1a2233)
      .setStrokeStyle(2, 0x58c46a);
    const bar = this.add.rectangle(w / 2 - 108, h / 2 + 6, 4, 8, 0x58c46a)
      .setOrigin(0, 0.5);

    const tip = this.add.text(w / 2, h / 2 + 30, "Cargando isla…",
      { fontFamily: "monospace", fontSize: "10px", color: "#fff7e6" }
    ).setOrigin(0.5);
    tip.setResolution(2);

    // We don't actually load files, so simulate a brief load tick.
    this._loadProgress = 0;
    this._loadBar = bar;
  }

  create() {
    // Animate the loading bar over a few frames while textures generate.
    this.time.addEvent({
      delay: 60, repeat: 16,
      callback: () => {
        this._loadProgress = Math.min(1, this._loadProgress + 0.07);
        this._loadBar.width = 4 + this._loadProgress * 212;
      },
    });

    // Generate all textures.
    this._generateTextures();
    this._registerAnimations();

    // Web Audio context (lazy: requires a user gesture on most browsers).
    window.SFX = makeSfxEngine();

    this.time.delayedCall(1100, () => this.scene.start("MenuScene"));
  }

  // ----------------------------------------------------------
  // Texture generation
  // Each texture is drawn as a tiny 2D grid of color hex codes.
  // ----------------------------------------------------------
  _generateTextures() {
    // ---------- palette ----------
    const P = {
      tr: null, // transparent
      sky1: 0x6ed4ff, sky2: 0x9be4ff,
      sand: 0xf5e0a8, sand2: 0xead09a, sandShadow: 0xcaa66e,
      grass1: 0x58c46a, grass2: 0x3f9a52, grassShadow: 0x2a6f3a,
      dirt: 0x8b5a2b, dirt2: 0x6f4520,
      road: 0x4a4a52, road2: 0x3a3a42,
      water1: 0x2a8fc8, water2: 0x4cb5e6, waterFoam: 0xd4f1ff,
      ink: 0x1a2233, dark: 0x0e1620,
      paper: 0xfff7e6,
      skin: 0xd9a878, skinShade: 0xa9784f,
      hair: 0x2a1a10,
      shirt: 0x2e7dd2, shirtDark: 0x1d5fa8,
      pants: 0x2a3a55,
      shoe: 0x1a1a22,
      bag: 0x1a1a22, bagH: 0x444450,
      bottle: 0x9be4ff, bottleC: 0x58c46a,
      tire: 0x222228, tireH: 0x44444a,
      can: 0xc8c8d0, canRed: 0xc23a3a,
      smoke1: 0x77777f, smoke2: 0x555560,
      toxic1: 0x7bc24a, toxic2: 0x4f8a2a,
      palmT: 0x6f4520, palmTH: 0x4a2e15,
      palmL: 0x2a6f3a, palmLH: 0x1a4a25,
      bush: 0x2f7a3d, bushH: 0x1d5326,
      rock: 0x6e6e7a, rockH: 0x484852,
      wallA: 0xe8b76f, wallB: 0xd29654, // dominican-pastel wall
      wallC: 0xf38ea8, wallD: 0xc66483,
      wallE: 0x9bd4ff, wallF: 0x6aa9d6,
      roof: 0xb83a2e, roofH: 0x7a2118,
      door: 0x4a2a18,
      coral: 0xff7b5a, gold: 0xffd66e,
    };

    // helper: draw a 2D pixel grid into a texture
    const makePixelTexture = (key, grid, scale = 1) => {
      const h = grid.length;
      const w = grid[0].length;
      const g = this.add.graphics({ x: 0, y: 0 });
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const c = grid[y][x];
          if (c === null || c === undefined) continue;
          g.fillStyle(c, 1);
          g.fillRect(x * scale, y * scale, scale, scale);
        }
      }
      g.generateTexture(key, w * scale, h * scale);
      g.destroy();
    };

    // shorthand for color array sugar
    const row = (...cs) => cs;

    // ============================================================
    // TILES (16×16 each)
    // ============================================================
    const tile = (fill, accents = {}) => {
      const grid = Array.from({ length: 16 }, () => Array(16).fill(fill));
      if (accents.specks) {
        for (const [x, y, c] of accents.specks) grid[y][x] = c;
      }
      if (accents.dither) {
        for (let y = 0; y < 16; y++)
          for (let x = 0; x < 16; x++)
            if (((x + y) % 6 === 0)) grid[y][x] = accents.dither;
      }
      return grid;
    };

    // grass tile w/ scattered tufts
    const grassGrid = tile(P.grass1, { dither: P.grass2 });
    // sprinkle a few darker tufts
    [[3,4],[12,2],[7,9],[10,12],[2,11],[14,8],[5,14]].forEach(([x,y])=>{
      grassGrid[y][x] = P.grassShadow;
      if (grassGrid[y-1]) grassGrid[y-1][x] = P.grass2;
    });
    makePixelTexture("tile_grass", grassGrid);

    // sand
    const sandGrid = tile(P.sand, { dither: P.sand2 });
    [[2,3],[8,5],[13,9],[5,12],[11,13]].forEach(([x,y])=>{
      sandGrid[y][x] = P.sandShadow;
    });
    makePixelTexture("tile_sand", sandGrid);

    // dirt (vertedero)
    const dirtGrid = tile(P.dirt, { dither: P.dirt2 });
    [[2,2],[6,5],[12,3],[9,9],[3,12],[14,11],[7,14]].forEach(([x,y])=>{
      dirtGrid[y][x] = P.dark;
    });
    makePixelTexture("tile_dirt", dirtGrid);

    // road (barrio)
    const roadGrid = tile(P.road, { dither: P.road2 });
    // dashed line down center
    for (let y = 1; y < 15; y += 4) {
      roadGrid[y][7] = P.paper; roadGrid[y][8] = P.paper;
      roadGrid[y+1][7] = P.paper; roadGrid[y+1][8] = P.paper;
    }
    makePixelTexture("tile_road", roadGrid);

    // water (animated 2 frames)
    const water = (offset) => {
      const grid = tile(P.water1, { dither: P.water2 });
      // foam ripples
      for (let i = 0; i < 16; i++) {
        const fx = (i + offset) % 16;
        if ((i % 4) === 0) grid[i][fx] = P.waterFoam;
      }
      return grid;
    };
    makePixelTexture("tile_water_a", water(0));
    makePixelTexture("tile_water_b", water(2));

    // sand-water shore (top half water, bottom half sand)
    const shoreGrid = [];
    for (let y = 0; y < 16; y++) {
      const r = [];
      for (let x = 0; x < 16; x++) {
        if (y < 7) r.push(P.water1);
        else if (y === 7) r.push(P.waterFoam);
        else if (y === 8) r.push(P.sand2);
        else r.push(P.sand);
      }
      shoreGrid.push(r);
    }
    makePixelTexture("tile_shore", shoreGrid);

    // ============================================================
    // PROPS
    // ============================================================

    // Palm tree (16×32) — cute Caribbean palm
    {
      const W = 16, H = 32;
      const g = Array.from({length: H}, () => Array(W).fill(null));
      // trunk
      for (let y = 14; y < 32; y++) {
        g[y][7] = P.palmTH;
        g[y][8] = P.palmT;
      }
      // trunk segment lines
      for (let y = 16; y < 32; y += 3) g[y][7] = P.palmTH;
      // leaves (cluster around top)
      const leaf = (cx, cy, pts) => {
        for (const [dx, dy, c] of pts) {
          const x = cx + dx, y = cy + dy;
          if (x>=0 && x<W && y>=0 && y<H) g[y][x] = c;
        }
      };
      // 4 fronds
      const L = P.palmL, LH = P.palmLH;
      // left frond
      leaf(7, 10, [
        [-1,0,L],[-2,0,L],[-3,0,L],[-4,1,L],[-5,2,LH],
        [-1,1,LH],[-2,1,LH]
      ]);
      // right frond
      leaf(8, 10, [
        [1,0,L],[2,0,L],[3,0,L],[4,1,L],[5,2,LH],
        [1,1,LH],[2,1,LH]
      ]);
      // top frond
      leaf(7, 8, [
        [0,-1,L],[1,-1,L],[0,-2,L],[1,-2,L],[-1,-3,LH],[2,-3,LH]
      ]);
      // bottom frond (drooping)
      leaf(7, 13, [
        [-2,0,L],[-3,1,L],[-4,2,LH],
        [3,0,L],[4,1,L],[5,2,LH]
      ]);
      // coconuts
      g[12][6] = P.palmTH; g[12][9] = P.palmTH;
      g[13][6] = P.dirt2;  g[13][9] = P.dirt2;
      makePixelTexture("palm", g);
    }

    // Bush (16×12)
    {
      const W = 16, H = 12;
      const g = Array.from({length: H}, () => Array(W).fill(null));
      const fill = (x0, y0, w, h, c) => {
        for (let y = y0; y < y0+h; y++)
          for (let x = x0; x < x0+w; x++)
            g[y][x] = c;
      };
      fill(2, 4, 12, 7, P.bush);
      fill(3, 3, 10, 1, P.bush);
      fill(4, 2, 8, 1, P.bush);
      // shading
      fill(2, 8, 12, 3, P.bushH);
      // hilights
      g[5][4] = P.leaf2; g[6][9] = P.leaf2;
      makePixelTexture("bush", g);
    }

    // Rock (12×8)
    {
      const W = 12, H = 8;
      const g = Array.from({length: H}, () => Array(W).fill(null));
      const fill = (x0, y0, w, h, c) => {
        for (let y = y0; y < y0+h; y++)
          for (let x = x0; x < x0+w; x++)
            g[y][x] = c;
      };
      fill(2, 2, 8, 5, P.rock);
      fill(1, 4, 10, 3, P.rock);
      fill(2, 5, 8, 2, P.rockH);
      g[2][3] = P.paper;
      makePixelTexture("rock", g);
    }

    // House (32×28) — pastel Caribbean home
    {
      const W = 32, H = 28;
      const g = Array.from({length: H}, () => Array(W).fill(null));
      const fill = (x0, y0, w, h, c) => {
        for (let y = y0; y < y0+h; y++)
          for (let x = x0; x < x0+w; x++)
            if (g[y] && g[y][x] !== undefined) g[y][x] = c;
      };
      // body
      fill(2, 10, 28, 16, P.wallA);
      // body shading bottom
      fill(2, 22, 28, 4, P.wallB);
      // roof — triangular-ish
      for (let i = 0; i < 8; i++) {
        fill(2 + i, 10 - i, 28 - i*2, 1, P.roof);
      }
      // roof shadow
      fill(2, 10, 28, 1, P.roofH);
      // door
      fill(14, 17, 5, 9, P.door);
      g[18][16] = P.gold; // doorknob
      // windows
      fill(6, 14, 5, 4, P.wallE);
      g[15][7] = P.wallF; g[15][9] = P.wallF;
      fill(21, 14, 5, 4, P.wallE);
      g[15][22] = P.wallF; g[15][24] = P.wallF;
      makePixelTexture("house_a", g);
    }
    // House B — pink variant
    {
      const W = 32, H = 28;
      const g = Array.from({length: H}, () => Array(W).fill(null));
      const fill = (x0, y0, w, h, c) => {
        for (let y = y0; y < y0+h; y++)
          for (let x = x0; x < x0+w; x++)
            if (g[y] && g[y][x] !== undefined) g[y][x] = c;
      };
      fill(2, 10, 28, 16, P.wallC);
      fill(2, 22, 28, 4, P.wallD);
      for (let i = 0; i < 8; i++) fill(2 + i, 10 - i, 28 - i*2, 1, P.roof);
      fill(2, 10, 28, 1, P.roofH);
      fill(14, 17, 5, 9, P.door);
      g[18][16] = P.gold;
      fill(6, 14, 5, 4, P.wallE);
      fill(21, 14, 5, 4, P.wallE);
      makePixelTexture("house_b", g);
    }

    // Trash mountain (vertedero) silhouette 32×20
    {
      const W = 32, H = 20;
      const g = Array.from({length: H}, () => Array(W).fill(null));
      const fill = (x0, y0, w, h, c) => {
        for (let y = y0; y < y0+h; y++)
          for (let x = x0; x < x0+w; x++)
            if (g[y] && g[y][x] !== undefined) g[y][x] = c;
      };
      // mound
      for (let y = 0; y < H; y++) {
        const w = Math.min(W, 6 + y * 1.5);
        const x0 = Math.max(0, Math.floor((W - w) / 2));
        fill(x0, y, Math.floor(w), 1, y < 4 ? P.dirt2 : P.dirt);
      }
      // bits of trash
      [[10,5,P.bag],[14,4,P.bottle],[18,6,P.canRed],[8,9,P.tire],[22,10,P.bag],
       [12,12,P.can],[20,14,P.bottle],[6,15,P.bag]].forEach(([x,y,c])=>{
        g[y][x] = c; if (g[y][x+1]!==undefined) g[y][x+1] = c;
      });
      makePixelTexture("trashpile", g);
    }

    // ============================================================
    // TRASH PICKUPS (small, 10×10)
    // ============================================================

    // Trash bag
    {
      const g = Array.from({length: 10}, () => Array(10).fill(null));
      const F = (x0, y0, w, h, c) => {
        for (let y = y0; y < y0+h; y++)
          for (let x = x0; x < x0+w; x++) g[y][x] = c;
      };
      F(2, 3, 6, 6, P.bag);
      F(2, 8, 6, 1, P.dark);
      F(3, 2, 4, 1, P.bag);
      F(4, 1, 2, 1, P.bagH); // tied top
      g[4][3] = P.bagH; g[4][6] = P.bagH;
      // hilight
      g[4][3] = P.bagH; g[5][3] = P.bagH;
      makePixelTexture("trash_bag", g);
    }

    // Bottle
    {
      const g = Array.from({length: 10}, () => Array(10).fill(null));
      const F = (x0, y0, w, h, c) => {
        for (let y = y0; y < y0+h; y++)
          for (let x = x0; x < x0+w; x++) g[y][x] = c;
      };
      F(4, 1, 2, 2, P.bottleC); // cap
      F(4, 3, 2, 1, P.paper);   // neck
      F(3, 4, 4, 5, P.bottle);  // body
      F(3, 8, 4, 1, P.dark);
      g[5][4] = P.paper; // shine
      makePixelTexture("trash_bottle", g);
    }

    // Tire
    {
      const g = Array.from({length: 10}, () => Array(10).fill(null));
      const F = (x0, y0, w, h, c) => {
        for (let y = y0; y < y0+h; y++)
          for (let x = x0; x < x0+w; x++) g[y][x] = c;
      };
      F(1, 2, 8, 6, P.tire);
      F(2, 3, 6, 4, P.tireH);
      F(3, 4, 4, 2, P.dark);
      // ground line
      F(1, 8, 8, 1, P.dark);
      makePixelTexture("trash_tire", g);
    }

    // Can
    {
      const g = Array.from({length: 10}, () => Array(10).fill(null));
      const F = (x0, y0, w, h, c) => {
        for (let y = y0; y < y0+h; y++)
          for (let x = x0; x < x0+w; x++) g[y][x] = c;
      };
      F(3, 2, 4, 6, P.can);
      F(3, 3, 4, 1, P.canRed);
      F(3, 5, 4, 1, P.canRed);
      F(3, 7, 4, 1, P.dark);
      g[2][4] = P.dark; g[2][5] = P.dark;
      makePixelTexture("trash_can", g);
    }

    // ============================================================
    // OBSTACLES
    // ============================================================

    // Toxic puddle (16×10)
    {
      const W = 16, H = 10;
      const g = Array.from({length: H}, () => Array(W).fill(null));
      const F = (x0, y0, w, h, c) => {
        for (let y = y0; y < y0+h; y++)
          for (let x = x0; x < x0+w; x++) g[y][x] = c;
      };
      F(2, 3, 12, 5, P.toxic2);
      F(3, 4, 10, 3, P.toxic1);
      F(5, 4, 1, 1, P.paper);
      F(10, 5, 1, 1, P.paper);
      makePixelTexture("toxic_puddle", g);
    }

    // Smoke puff (12×12) — 2 frames
    const smoke = (variant) => {
      const W = 12, H = 12;
      const g = Array.from({length: H}, () => Array(W).fill(null));
      const c1 = P.smoke1, c2 = P.smoke2;
      // round-ish blob
      const ring = variant === 0
        ? [[5,2],[6,2],[4,3],[7,3],[3,4],[8,4],[3,5],[8,5],[3,6],[8,6],[4,7],[7,7],[5,8],[6,8]]
        : [[4,2],[5,2],[6,2],[3,3],[7,3],[2,4],[8,4],[2,5],[8,5],[3,6],[7,6],[4,7],[6,7]];
      for (const [x,y] of ring) g[y][x] = c2;
      // fill interior
      for (let y = 3; y < 8; y++)
        for (let x = 4; x < 8; x++)
          if (!g[y][x]) g[y][x] = c1;
      return g;
    };
    makePixelTexture("smoke_a", smoke(0));
    makePixelTexture("smoke_b", smoke(1));

    // ============================================================
    // PLAYER (16×20) — eco-warrior
    // 4 directions × 2 walking frames = 8 frames in one strip
    // ============================================================
    {
      const FW = 16, FH = 20, FRAMES = 8;
      const SHEET_W = FW * FRAMES;
      const sheet = Array.from({length: FH}, () => Array(SHEET_W).fill(null));

      // ----- helpers to draw within a frame at (fx, fy=0) -----
      const set = (frame, x, y, c) => {
        const gx = frame * FW + x;
        if (sheet[y] && sheet[y][gx] !== undefined && c !== null) sheet[y][gx] = c;
      };
      const fill = (frame, x0, y0, w, h, c) => {
        for (let y = y0; y < y0+h; y++)
          for (let x = x0; x < x0+w; x++)
            set(frame, x, y, c);
      };

      // Body template per direction. Walking = bob legs + arm sway.
      // Frames: 0,1 = down ; 2,3 = up ; 4,5 = right ; 6,7 = left
      const drawPerson = (frame, dir, step) => {
        // Shadow under feet
        for (let x = 4; x < 12; x++) set(frame, x, 18, P.dark);

        // Common body (torso/head)
        // Head
        fill(frame, 5, 2, 6, 5, P.skin);
        // hair cap
        fill(frame, 5, 1, 6, 2, P.hair);
        if (dir === "up") {
          // back of head: more hair
          fill(frame, 5, 2, 6, 3, P.hair);
        }
        // shading on right of head
        fill(frame, 10, 3, 1, 3, P.skinShade);

        // Eyes (only for non-up)
        if (dir !== "up") {
          const eyes = dir === "down" ? [[7,5],[9,5]]
                     : dir === "right" ? [[9,5]]
                     : [[6,5]];
          for (const [x,y] of eyes) set(frame, x, y, P.ink);
        }

        // Torso (shirt) 6 wide
        fill(frame, 4, 7, 8, 6, P.shirt);
        fill(frame, 4, 12, 8, 1, P.shirtDark);
        // little eco leaf badge
        set(frame, 7, 9, P.leaf2);
        set(frame, 8, 9, P.leaf2);
        set(frame, 7, 10, P.grass1);

        // Arms — swing with step
        const armSwing = step === 0 ? 0 : 1;
        if (dir === "down" || dir === "up") {
          fill(frame, 3, 7 + armSwing, 1, 5, P.shirt);
          fill(frame, 12, 7 + (1 - armSwing), 1, 5, P.shirt);
          // hands
          set(frame, 3, 12 + armSwing, P.skin);
          set(frame, 12, 12 + (1 - armSwing), P.skin);
        } else if (dir === "right") {
          fill(frame, 12, 7 + armSwing, 1, 5, P.shirt);
          set(frame, 12, 12 + armSwing, P.skin);
          // back arm tucked
          fill(frame, 4, 8, 1, 4, P.shirtDark);
        } else { // left
          fill(frame, 3, 7 + armSwing, 1, 5, P.shirt);
          set(frame, 3, 12 + armSwing, P.skin);
          fill(frame, 11, 8, 1, 4, P.shirtDark);
        }

        // Legs — alternate
        const legA = step === 0 ? 0 : 1;
        const legB = 1 - legA;
        // pants base
        fill(frame, 5, 13, 6, 4, P.pants);
        // legs split
        fill(frame, 5 + legA, 15, 2, 2, P.pants);
        fill(frame, 9 - legB, 15, 2, 2, P.pants);
        // shoes
        fill(frame, 5 + legA, 17, 2, 1, P.shoe);
        fill(frame, 9 - legB, 17, 2, 1, P.shoe);
      };

      // down 0,1
      drawPerson(0, "down", 0);
      drawPerson(1, "down", 1);
      // up 2,3
      drawPerson(2, "up", 0);
      drawPerson(3, "up", 1);
      // right 4,5
      drawPerson(4, "right", 0);
      drawPerson(5, "right", 1);
      // left 6,7  (mirror right by re-drawing)
      drawPerson(6, "left", 0);
      drawPerson(7, "left", 1);

      // Now bake the strip and split into spritesheet frames.
      // We draw to a graphics, generate one big texture, then slice.
      const g = this.add.graphics({ x: 0, y: 0 });
      for (let y = 0; y < FH; y++) {
        for (let x = 0; x < SHEET_W; x++) {
          const c = sheet[y][x];
          if (c === null) continue;
          g.fillStyle(c, 1);
          g.fillRect(x, y, 1, 1);
        }
      }
      const sheetKey = "_player_sheet";
      g.generateTexture(sheetKey, SHEET_W, FH);
      g.destroy();

      // Re-add as spritesheet by drawing to canvas via Phaser's textures.addSpriteSheet
      // (Phaser supports adding a spritesheet from an existing texture by frame parsing.)
      const tex = this.textures.get(sheetKey).getSourceImage();
      this.textures.addSpriteSheet("player", tex, {
        frameWidth: FW, frameHeight: FH, endFrame: FRAMES - 1,
      });
    }

    // ============================================================
    // UI bits
    // ============================================================

    // Heart / leaf icon for HUD
    {
      const g = Array.from({length: 10}, () => Array(10).fill(null));
      const F = (x0, y0, w, h, c) => {
        for (let y = y0; y < y0+h; y++)
          for (let x = x0; x < x0+w; x++) g[y][x] = c;
      };
      F(4, 1, 3, 1, P.grass1);
      F(2, 2, 6, 5, P.grass1);
      F(3, 7, 4, 1, P.grass1);
      F(4, 8, 2, 1, P.grass1);
      // stem
      F(4, 6, 2, 3, P.palmT);
      // hilight
      g[3][3] = P.leaf2 ?? 0x9be4ff;
      makePixelTexture("icon_leaf", g);
    }

    // Coin / fame icon
    {
      const g = Array.from({length: 10}, () => Array(10).fill(null));
      const F = (x0, y0, w, h, c) => {
        for (let y = y0; y < y0+h; y++)
          for (let x = x0; x < x0+w; x++) g[y][x] = c;
      };
      F(3, 1, 4, 1, P.gold);
      F(2, 2, 6, 6, P.gold);
      F(3, 8, 4, 1, P.gold);
      F(2, 4, 1, 2, P.dark);
      F(7, 4, 1, 2, P.dark);
      makePixelTexture("icon_coin", g);
    }

    // Sparkle (for pickup VFX) — 6×6, 2 frames
    {
      for (const [k, pts] of [
        ["spark_a", [[3,1],[3,2],[3,3],[3,4],[1,3],[2,3],[4,3],[5,3]]],
        ["spark_b", [[1,1],[5,1],[1,5],[5,5],[3,3],[2,2],[4,4],[2,4],[4,2]]],
      ]) {
        const g = Array.from({length: 6}, () => Array(6).fill(null));
        for (const [x,y] of pts) g[y][x] = 0xfff7e6;
        makePixelTexture(k, g);
      }
    }

    // 1×1 white pixel for tinting / particles
    {
      const g = [[0xffffff]];
      makePixelTexture("pixel", g);
    }

    // Cloud (24×8)
    {
      const W = 24, H = 8;
      const g = Array.from({length: H}, () => Array(W).fill(null));
      const F = (x0, y0, w, h, c) => {
        for (let y = y0; y < y0+h; y++)
          for (let x = x0; x < x0+w; x++) g[y][x] = c;
      };
      F(4, 3, 16, 3, 0xffffff);
      F(2, 4, 20, 2, 0xffffff);
      F(6, 2, 4, 1, 0xffffff);
      F(12, 2, 6, 1, 0xffffff);
      // soft underside
      F(4, 5, 16, 1, 0xeaf3ff);
      makePixelTexture("cloud", g);
    }

    // Sun (16×16)
    {
      const W = 16, H = 16;
      const g = Array.from({length: H}, () => Array(W).fill(null));
      const F = (x0, y0, w, h, c) => {
        for (let y = y0; y < y0+h; y++)
          for (let x = x0; x < x0+w; x++) g[y][x] = c;
      };
      F(5, 3, 6, 10, 0xffd66e);
      F(3, 5, 10, 6, 0xffd66e);
      F(6, 2, 4, 1, 0xffd66e);
      F(6, 13, 4, 1, 0xffd66e);
      F(2, 6, 1, 4, 0xffd66e);
      F(13, 6, 1, 4, 0xffd66e);
      // shading
      F(9, 7, 2, 4, 0xffb84a);
      makePixelTexture("sun", g);
    }
  }

  // ----------------------------------------------------------
  // Animations
  // ----------------------------------------------------------
  _registerAnimations() {
    const mk = (key, frames, rate, repeat = -1) => {
      this.anims.create({
        key, frameRate: rate, repeat,
        frames: this.anims.generateFrameNumbers("player", { frames }),
      });
    };
    mk("walk_down",  [0, 1], 6);
    mk("walk_up",    [2, 3], 6);
    mk("walk_right", [4, 5], 6);
    mk("walk_left",  [6, 7], 6);
    mk("idle_down",  [0],    1, 0);
    mk("idle_up",    [2],    1, 0);
    mk("idle_right", [4],    1, 0);
    mk("idle_left",  [6],    1, 0);
  }
}

/* ============================================================
   Tiny SFX engine — uses WebAudio to synth retro chiptune
   sounds and a chill ambient loop. No assets needed.
   ============================================================ */
function makeSfxEngine() {
  let ctx = null;
  let musicGain = null;
  let musicNodes = [];
  let muted = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function blip({ freq = 440, dur = 0.08, type = "square", vol = 0.15, sweep = 0 }) {
    const c = ensure(); if (!c || muted) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (sweep) o.frequency.exponentialRampToValueAtTime(
      Math.max(40, freq + sweep), c.currentTime + dur
    );
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  }

  function pickupTrash() {
    blip({ freq: 660, dur: 0.06, type: "square", vol: 0.18, sweep: 220 });
    setTimeout(() => blip({ freq: 990, dur: 0.07, type: "triangle", vol: 0.18 }), 60);
  }
  function pickupBig() {
    blip({ freq: 523, dur: 0.07, type: "square", vol: 0.2 });
    setTimeout(() => blip({ freq: 784, dur: 0.07, type: "square", vol: 0.2 }), 70);
    setTimeout(() => blip({ freq: 1046, dur: 0.12, type: "triangle", vol: 0.22 }), 140);
  }
  function hurt() {
    blip({ freq: 220, dur: 0.18, type: "sawtooth", vol: 0.2, sweep: -120 });
  }
  function uiClick() {
    blip({ freq: 880, dur: 0.05, type: "square", vol: 0.12 });
  }
  function victory() {
    const seq = [523, 659, 784, 1046];
    seq.forEach((f, i) => setTimeout(() =>
      blip({ freq: f, dur: 0.18, type: "triangle", vol: 0.22 }), i * 130));
  }

  // Simple retro Caribbean-flavored loop: bass + steel-drum-like bell.
  function startMusic() {
    const c = ensure(); if (!c || muted) return;
    stopMusic();
    musicGain = c.createGain();
    musicGain.gain.value = 0.06;
    musicGain.connect(c.destination);

    const tempo = 110;
    const beat = 60 / tempo; // seconds per beat
    const bar = beat * 4;
    const start = c.currentTime + 0.1;

    // chord progression (Caribbean lilt): I - V - vi - IV in C
    const chords = [
      ["C4", "E4", "G4"],
      ["G3", "B3", "D4"],
      ["A3", "C4", "E4"],
      ["F3", "A3", "C4"],
    ];
    const note = (name) => {
      const A4 = 440;
      const map = { C:-9, "C#":-8, D:-7, "D#":-6, E:-5, F:-4, "F#":-3,
                    G:-2, "G#":-1, A:0, "A#":1, B:2 };
      const m = name.match(/([A-G]#?)(\d)/);
      const semi = map[m[1]] + (parseInt(m[2]) - 4) * 12;
      return A4 * Math.pow(2, semi / 12);
    };

    const bars = 32; // schedule a long run; we'll reschedule before it ends
    for (let b = 0; b < bars; b++) {
      const t0 = start + b * bar;
      const chord = chords[b % chords.length];
      // bass on beats 1,3
      [0, 2].forEach(beatIdx => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(note(chord[0]) / 2, t0 + beatIdx * beat);
        g.gain.setValueAtTime(0.0001, t0 + beatIdx * beat);
        g.gain.exponentialRampToValueAtTime(0.5, t0 + beatIdx * beat + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + beatIdx * beat + beat * 0.7);
        o.connect(g).connect(musicGain);
        o.start(t0 + beatIdx * beat);
        o.stop(t0 + beatIdx * beat + beat);
        musicNodes.push(o);
      });
      // steel-drum-ish arpeggio on offbeats
      const arp = [chord[1], chord[2], chord[1], chord[0]];
      for (let i = 0; i < 4; i++) {
        const t = t0 + i * beat + beat * 0.5;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(note(arp[i]) * 2, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        // slight detuned doubler for steel-drum shimmer
        const o2 = c.createOscillator();
        o2.type = "sine";
        o2.frequency.setValueAtTime(note(arp[i]) * 2 * 1.005, t);
        const g2 = c.createGain();
        g2.gain.setValueAtTime(0.0001, t);
        g2.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.connect(g).connect(musicGain);
        o2.connect(g2).connect(musicGain);
        o.start(t); o.stop(t + 0.4);
        o2.start(t); o2.stop(t + 0.4);
        musicNodes.push(o, o2);
      }
    }

    // schedule the next chunk before this ends
    if (window._musicTimeout) clearTimeout(window._musicTimeout);
    window._musicTimeout = setTimeout(startMusic, bars * bar * 1000 - 1500);
  }

  function stopMusic() {
    if (window._musicTimeout) { clearTimeout(window._musicTimeout); window._musicTimeout = null; }
    for (const n of musicNodes) { try { n.stop(); } catch(e) {} }
    musicNodes = [];
    if (musicGain) { try { musicGain.disconnect(); } catch(e) {} musicGain = null; }
  }

  function toggleMute() {
    muted = !muted;
    if (muted) stopMusic();
    return muted;
  }

  return { pickupTrash, pickupBig, hurt, uiClick, victory, startMusic, stopMusic, toggleMute, isMuted: () => muted };
}
