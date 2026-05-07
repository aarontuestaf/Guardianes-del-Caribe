/* ============================================================
   Guardianes del Caribe — Phaser game configuration
   ============================================================ */

// Logical "design" resolution. Phaser's Scale.FIT will letterbox to fit
// any viewport while preserving the pixel-art aspect ratio.
const GAME_WIDTH  = 480;
const GAME_HEIGHT = 270;

window.GAME_WIDTH  = GAME_WIDTH;
window.GAME_HEIGHT = GAME_HEIGHT;

// Shared game state across scenes (level progression, score, etc.)
window.GameState = {
  zones: [
    { name: "Duquesa, Santo Domingo Norte",  trashCount: 14, biome: "vertedero" },
    { name: "Cienfuegos, Santiago",          trashCount: 18, biome: "barrio" },
    { name: "San Cristóbal",                 trashCount: 22, biome: "playa" },
    // After zone 3, we generate procedural Caribbean spots.
    { name: "Boca Chica",                    trashCount: 26, biome: "playa" },
    { name: "Higüey",                        trashCount: 30, biome: "barrio" },
    { name: "Puerto Plata",                  trashCount: 34, biome: "playa" },
    { name: "La Vega",                       trashCount: 38, biome: "vertedero" },
  ],
  zoneIndex: 0,
  score: 0,
  fame: 0,
  reset() {
    this.zoneIndex = 0;
    this.score = 0;
    this.fame = 0;
  },
  currentZone() {
    if (this.zoneIndex < this.zones.length) return this.zones[this.zoneIndex];
    // Procedurally extend if the player keeps going.
    const biomes = ["playa", "barrio", "vertedero"];
    return {
      name: "Zona Verde " + (this.zoneIndex + 1),
      trashCount: 30 + this.zoneIndex * 4,
      biome: biomes[this.zoneIndex % biomes.length],
    };
  },
};

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#0a1a2a",
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, VictoryScene],
};

// Track whether we're inside a play scene so style.css can hide the d-pad.
function setPlaying(isPlaying) {
  document.body.dataset.playing = isPlaying ? "true" : "false";
}
window.setPlaying = setPlaying;
setPlaying(false);

// Boot the game.
window.addEventListener("load", () => {
  window.game = new Phaser.Game(config);
});
