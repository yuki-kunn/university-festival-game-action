import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CHARACTERS, TEXT_RESOLUTION } from "../config.js";

// カードにはノベルパートの立ち絵（BootSceneでプリロード）を表示する。
const PORTRAIT_HEIGHT = 230;

export default class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super("CharacterSelectScene");
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.background);

    this.add
      .text(GAME_WIDTH / 2, 60, "キャラクターを選んでください", {
        fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
        fontSize: "28px",
        color: "#f5f3fa",
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5);

    const cardWidth = 180;
    const cardHeight = 330;
    const gap = 24;
    const totalWidth = CHARACTERS.length * cardWidth + (CHARACTERS.length - 1) * gap;
    const startX = GAME_WIDTH / 2 - totalWidth / 2 + cardWidth / 2;
    const centerY = GAME_HEIGHT / 2 + 20;

    CHARACTERS.forEach((chara, i) => {
      const x = startX + i * (cardWidth + gap);
      this.createCharacterCard(chara, x, centerY, cardWidth, cardHeight);
    });
  }

  createCharacterCard(chara, x, y, width, height) {
    const container = this.add.container(x, y);

    const panel = this.add
      .rectangle(0, 0, width, height, COLORS.panel)
      .setStrokeStyle(2, COLORS.accentSoft);

    const portrait = this.add.image(0, 75, chara.portraitKey).setOrigin(0.5, 1);
    portrait.setScale(PORTRAIT_HEIGHT / portrait.height);

    const nameText = this.add
      .text(0, 100, chara.name, {
        fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
        fontSize: "22px",
        color: "#f5f3fa",
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5);

    const genreText = this.add
      .text(0, 135, chara.genreLabel, {
        fontFamily: "sans-serif",
        fontSize: "12px",
        color: "#d4cfe0",
        align: "center",
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5);

    container.add([panel, portrait, nameText, genreText]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerover", () => panel.setStrokeStyle(3, COLORS.accent));
    container.on("pointerout", () => panel.setStrokeStyle(2, COLORS.accentSoft));
    container.on("pointerdown", () => {
      this.scene.start(chara.sceneKey, { characterId: chara.id });
    });

    return container;
  }
}
