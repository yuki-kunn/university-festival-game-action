import Phaser from "phaser";
import { addMuteButton, playBgm, playSe } from "../audio.js";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CHARACTERS, TEXT_RESOLUTION } from "../config.js";

// タイトル画面。夜の部室を背景に、ノベルパートと同じ見た目のロゴと
// 4人の立ち絵を並べる。ロゴ画像は tools/render_title_logo.mjs で生成。
const LOGO_DISPLAY = { width: 429, height: 181 };
const PORTRAIT_HEIGHT = 300;
// 立ち絵の並び（ロゴとボタンのある中央を空けて左右に2人ずつ）
const PORTRAIT_X = { mc: 90, marico: 225, niko: 735, nina: 870 };

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create() {
    this.starting = false;
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.add.image(0, 0, "bg_title").setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.createDust();
    this.createPortraits();
    this.createLogo();
    this.createStartButton();
    addMuteButton(this);
    playBgm(this, "daily");
  }

  // ゆっくり漂う光の粒
  createDust() {
    this.add.particles(0, 0, "spark", {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: 260, max: GAME_HEIGHT + 20 },
      lifespan: 5200,
      speedY: { min: -22, max: -8 },
      speedX: { min: -8, max: 8 },
      scale: { start: 0.16, end: 0 },
      alpha: { start: 0.55, end: 0 },
      tint: 0xc8b8ff,
      frequency: 260
    });
  }

  createPortraits() {
    CHARACTERS.forEach((chara, i) => {
      const portrait = this.add
        .image(PORTRAIT_X[chara.id], GAME_HEIGHT + 4, chara.portraitKey)
        .setOrigin(0.5, 1)
        .setTint(0xc9c0e0)
        .setAlpha(0);
      portrait.setScale(PORTRAIT_HEIGHT / portrait.height);
      const baseY = portrait.y;
      this.tweens.add({ targets: portrait, alpha: 1, duration: 600, delay: 300 + i * 150 });
      this.tweens.add({
        targets: portrait,
        y: baseY - 5,
        duration: 1800 + i * 200,
        delay: i * 250,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    });
  }

  createLogo() {
    const logo = this.add
      .image(GAME_WIDTH / 2, 170, "title_logo")
      .setDisplaySize(LOGO_DISPLAY.width, LOGO_DISPLAY.height)
      .setAlpha(0);
    this.tweens.add({ targets: logo, alpha: 1, duration: 800, delay: 200 });
    this.tweens.add({ targets: logo, y: logo.y - 4, duration: 2600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  createStartButton() {
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT / 2 + 60;
    const button = this.add.image(x, y, "ui_button").setDisplaySize(240, 64).setInteractive({ useHandCursor: true });
    const label = this.add
      .text(x, y, "はじめる", {
        fontFamily: "sans-serif",
        fontSize: "26px",
        color: "#ffffff",
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5);

    const group = [button, label];
    group.forEach(o => o.setAlpha(0));
    this.tweens.add({ targets: group, alpha: 1, duration: 500, delay: 700 });

    button.on("pointerover", () => {
      playSe(this, "hover");
      button.setTexture("ui_button_hover");
      label.setScale(1.04);
      button.setScale(button.scaleX * 1.04, button.scaleY * 1.04);
    });
    button.on("pointerout", () => {
      button.setTexture("ui_button");
      label.setScale(1);
      button.setDisplaySize(240, 64);
    });
    button.on("pointerdown", () => this.startGame());
  }

  startGame() {
    if (this.starting) return;
    this.starting = true;
    playSe(this, "click");
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("CharacterSelectScene"));
  }
}
