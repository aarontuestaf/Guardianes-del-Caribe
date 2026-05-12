/* ============================================================
   QuizScene — preguntas ambientales (capa educativa)
   Se lanza desde GameScene al cumplir hitos de limpieza.
   Pausa el juego, muestra panel pixel-art, evalúa respuesta.
   ============================================================ */

// ---- Banco de preguntas (10 distintas, agrupadas por zona/tema) ----
window.QUESTION_BANK = [
  // ---- Zona 1: Laudato Si' + Duquesa ----
  {
    zone: 1, topic: "Laudato Si'",
    q: '¿Qué significa "casa común"?',
    options: ["El planeta Tierra", "Una vivienda popular", "Un vertedero"],
    answer: 0,
    hint: 'Laudato Si\' llama así a la Tierra: nuestro hogar compartido.',
  },
  {
    zone: 1, topic: "Duquesa",
    q: "¿Qué problema afecta más a Duquesa?",
    options: ["Falta de turismo", "Vertedero a cielo abierto", "Exceso de árboles"],
    answer: 1,
    hint: "Duquesa es uno de los mayores vertederos a cielo abierto del país.",
  },
  {
    zone: 1, topic: "Laudato Si'",
    q: "¿Qué encíclica habla del cuidado del planeta?",
    options: ["Laudato Si'", "Rerum Novarum", "Pacem in Terris"],
    answer: 0,
    hint: "Laudato Si' (2015) trata del cuidado de la casa común.",
  },
  // ---- Zona 2: Caritas in Veritate + justicia social ----
  {
    zone: 2, topic: "Caritas in Veritate",
    q: "¿Qué encíclica relaciona desarrollo con justicia y amor?",
    options: ["Caritas in Veritate", "Laudate Deum", "Humanae Vitae"],
    answer: 0,
    hint: "Caritas in Veritate une caridad, verdad y desarrollo humano.",
  },
  {
    zone: 2, topic: "Justicia social",
    q: "¿Quiénes sufren más la contaminación?",
    options: ["Los más ricos", "Los más pobres", "Los turistas"],
    answer: 1,
    hint: "Las comunidades pobres viven más cerca de la basura y sus efectos.",
  },
  {
    zone: 2, topic: "Cienfuegos",
    q: "¿Qué río de Santiago recibe contaminación?",
    options: ["Río Ozama", "Río Nigua", "Río Yaque del Norte"],
    answer: 2,
    hint: "El Yaque del Norte cruza Santiago y recibe desechos urbanos.",
  },
  // ---- Zona 3: Laudate Deum + clima en el Caribe ----
  {
    zone: 3, topic: "Laudate Deum",
    q: "¿Qué encíclica insiste en actuar ya frente al cambio climático?",
    options: ["Laudate Deum", "Lumen Fidei", "Veritatis Splendor"],
    answer: 0,
    hint: "Laudate Deum (2023) urge actuar contra la crisis climática.",
  },
  {
    zone: 3, topic: "San Cristóbal",
    q: "¿Qué lugar de R.D. sufre inundaciones y basura?",
    options: ["San Cristóbal", "Constanza", "Jarabacoa"],
    answer: 0,
    hint: "San Cristóbal y el río Nigua sufren inundaciones con desechos.",
  },
  {
    zone: 3, topic: "Cultura del descarte",
    q: '¿Qué significa "cultura del descarte"?',
    options: [
      "Tirar lo que no sirve sin pensar",
      "Reciclar todo siempre",
      "Comprar productos nuevos",
    ],
    answer: 0,
    hint: "Es usar y tirar sin cuidar personas ni planeta.",
  },
  {
    zone: 3, topic: "Acción",
    q: "¿Qué acción ayuda más al medio ambiente?",
    options: ["Quemar basura", "Reducir y reciclar", "Tirar al río"],
    answer: 1,
    hint: "Reducir consumo y reciclar disminuye los vertederos.",
  },
];

// ---- Helpers ----
function getQuestionsForZone(zoneIdx) {
  // zoneIdx is 0-based; map to 1/2/3 cycling for procedural zones
  const z = (zoneIdx % 3) + 1;
  return window.QUESTION_BANK.filter(q => q.zone === z);
}

class QuizScene extends Phaser.Scene {
  constructor() { super("QuizScene"); }

  init(data) {
    this.parentScene = data.parentScene; // GameScene instance
    this.onClose = data.onClose;          // callback(success)
    this.question = data.question;
    this.attemptsLeft = data.attempts ?? 2;
    this.answered = false;
  }

  create() {
    const W = this.scale.width, H = this.scale.height;

    // Dark overlay
    this.add.rectangle(0, 0, W, H, 0x000000, 0.65).setOrigin(0).setDepth(0)
      .setInteractive(); // block clicks behind

    // Panel
    const pw = Math.min(W - 32, 340);
    const ph = 168;
    const px = W / 2, py = H / 2;

    // shadow
    this.add.rectangle(px + 3, py + 4, pw, ph, 0x000000, 0.5)
      .setDepth(1);
    // bg
    const bg = this.add.rectangle(px, py, pw, ph, 0xfff7e6)
      .setStrokeStyle(3, 0x1a2233).setDepth(2);
    // inner accent
    this.add.rectangle(px, py - ph/2 + 14, pw - 8, 22, 0x58c46a)
      .setDepth(2);

    // Header label
    const head = this.add.text(px, py - ph/2 + 14, "REFLEXIÓN ECOLÓGICA", {
      fontFamily: "monospace", fontSize: "10px",
      color: "#1a2233", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(3);
    head.setResolution(2);

    // Topic
    const topic = this.add.text(px, py - ph/2 + 32, `· ${this.question.topic} ·`, {
      fontFamily: "monospace", fontSize: "8px", color: "#7a5a18",
    }).setOrigin(0.5).setDepth(3);
    topic.setResolution(2);

    // Question
    const qText = this.add.text(px, py - ph/2 + 50, this.question.q, {
      fontFamily: "monospace", fontSize: "10px",
      color: "#1a2233", align: "center",
      wordWrap: { width: pw - 24 }, lineSpacing: 3,
    }).setOrigin(0.5, 0).setDepth(3);
    qText.setResolution(2);

    // Options as 3 buttons
    const opts = this.question.options;
    this.buttons = [];
    const startY = py + 8;
    for (let i = 0; i < opts.length; i++) {
      const by = startY + i * 22;
      const btnBg = this.add.rectangle(px, by, pw - 24, 18, 0xeadfb8)
        .setStrokeStyle(2, 0x1a2233).setDepth(3);
      const btnTxt = this.add.text(px - (pw - 24)/2 + 8, by, `${"ABC"[i]}.  ${opts[i]}`, {
        fontFamily: "monospace", fontSize: "9px", color: "#1a2233",
      }).setOrigin(0, 0.5).setDepth(4);
      btnTxt.setResolution(2);
      btnBg.setInteractive({ useHandCursor: true });
      btnBg.on("pointerover", () => !this.answered && btnBg.setFillStyle(0xffec99));
      btnBg.on("pointerout",  () => !this.answered && btnBg.setFillStyle(0xeadfb8));
      btnBg.on("pointerdown", () => this._answer(i, btnBg, btnTxt));
      this.buttons.push({ bg: btnBg, txt: btnTxt });
    }

    // Footer: attempts counter
    this.attemptsText = this.add.text(px - pw/2 + 10, py + ph/2 - 12,
      `Intentos: ${this.attemptsLeft}`, {
        fontFamily: "monospace", fontSize: "8px", color: "#b83a2e",
      }).setOrigin(0, 0.5).setDepth(3);
    this.attemptsText.setResolution(2);

    // Footer: progress
    const gs = window.GameState;
    const pCorrect = gs.zoneCorrect || 0;
    const pNeeded = gs.zoneNeeded || 1;
    this.progressText = this.add.text(px + pw/2 - 10, py + ph/2 - 12,
      `Correctas: ${pCorrect}/${pNeeded}`, {
        fontFamily: "monospace", fontSize: "8px", color: "#2f7a3d",
      }).setOrigin(1, 0.5).setDepth(3);
    this.progressText.setResolution(2);

    // Feedback line (hidden initially)
    this.feedback = this.add.text(px, py + ph/2 + 14, "", {
      fontFamily: "monospace", fontSize: "9px", color: "#fff7e6",
      stroke: "#1a2233", strokeThickness: 3, align: "center",
      wordWrap: { width: pw - 12 },
    }).setOrigin(0.5, 0).setDepth(5);
    this.feedback.setResolution(2);

    // Entry tween
    bg.setScale(0.85); bg.setAlpha(0);
    this.tweens.add({ targets: bg, scale: 1, alpha: 1, duration: 200, ease: "Back.easeOut" });

    // ESC: cancel without bonus (only after attempts exhausted, optional)
    this.input.keyboard.on("keydown-ESC", () => {
      if (this.answered) this._close(false);
    });
    // Number keys 1/2/3 as shortcuts
    this.input.keyboard.on("keydown-ONE",   () => this._answer(0, this.buttons[0].bg, this.buttons[0].txt));
    this.input.keyboard.on("keydown-TWO",   () => this._answer(1, this.buttons[1].bg, this.buttons[1].txt));
    this.input.keyboard.on("keydown-THREE", () => this._answer(2, this.buttons[2].bg, this.buttons[2].txt));
  }

  _answer(idx, btnBg, btnTxt) {
    if (this.answered) return;
    const correct = idx === this.question.answer;

    if (correct) {
      this.answered = true;
      btnBg.setFillStyle(0x58c46a);
      btnTxt.setColor("#fff7e6");
      window.SFX && SFX.pickupBig();
      this.cameras.main.flash(150, 88, 196, 106);
      this.feedback.setText("¡Correcto! Conciencia verde desbloqueada.");
      this.feedback.setColor("#9bff7a");

      // Rewards
      const gs = window.GameState;
      gs.score += 25;
      gs.fame  += 3;
      gs.zoneCorrect = (gs.zoneCorrect || 0) + 1;

      this.time.delayedCall(900, () => this._close(true));
    } else {
      this.attemptsLeft--;
      window.SFX && SFX.hurt();
      btnBg.setFillStyle(0xff7b5a);
      this.cameras.main.shake(120, 0.004);
      this.tweens.add({
        targets: btnBg, scale: 1.04, duration: 80, yoyo: true,
        onComplete: () => { if (!this.answered) btnBg.setFillStyle(0xeadfb8); },
      });

      if (this.attemptsLeft <= 0) {
        this.answered = true;
        this.feedback.setText(`Pista: ${this.question.hint}`);
        this.feedback.setColor("#ffd66e");
        // Highlight the correct one
        const ok = this.buttons[this.question.answer];
        ok.bg.setFillStyle(0x58c46a);
        ok.txt.setColor("#fff7e6");
        this.time.delayedCall(1800, () => this._close(false));
      } else {
        this.feedback.setText("Intenta de nuevo.");
        this.feedback.setColor("#ffb84a");
        this.attemptsText.setText(`Intentos: ${this.attemptsLeft}`);
      }
    }
  }

  _close(success) {
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.time.delayedCall(190, () => {
      this.scene.stop("QuizScene");
      if (this.onClose) this.onClose(success);
    });
  }
}

window.QuizScene = QuizScene;
window.getQuestionsForZone = getQuestionsForZone;
