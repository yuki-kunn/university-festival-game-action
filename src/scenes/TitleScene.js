import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEXT_RESOLUTION } from "../config.js";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.background);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, "不在証明", {
        fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
        fontSize: "64px",
        color: "#f5f3fa",
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, "ALIBI — Action Part", {
        fontFamily: "sans-serif",
        fontSize: "16px",
        color: "#d4cfe0",
        letterSpacing: 2,
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5);

    const startButton = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, "はじめる", {
        fontFamily: "sans-serif",
        fontSize: "28px",
        color: "#ffffff",
        backgroundColor: "#a68cf0",
        padding: { x: 32, y: 12 },
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on("pointerover", () => startButton.setScale(1.05));
    startButton.on("pointerout", () => startButton.setScale(1));
    startButton.on("pointerdown", () => {
      this.scene.start("CharacterSelectScene");
    });
  }
}
