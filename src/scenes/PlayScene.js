import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CHARACTERS } from "../config.js";

// 実際のアクション（移動・ジャンプ・回避、ステージギミック等）は
// 別Issueで実装する。ここでは選択したキャラクターを表示し、
// タイトルへ戻れることだけを確認できる仮画面にとどめる。
export default class PlayScene extends Phaser.Scene {
  constructor() {
    super("PlayScene");
  }

  init(data) {
    this.characterId = data.characterId;
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.background);

    const chara = CHARACTERS.find(c => c.id === this.characterId) || CHARACTERS[0];

    this.add
      .text(GAME_WIDTH / 2, 80, `選択中: ${chara.name}`, {
        fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
        fontSize: "24px",
        color: "#f5f3fa"
      })
      .setOrigin(0.5);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 60, 90, chara.color);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90, "ここに横スクロールアクション本編を実装予定", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#d4cfe0"
      })
      .setOrigin(0.5);

    const backButton = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 60, "タイトルへ戻る", {
        fontFamily: "sans-serif",
        fontSize: "18px",
        color: "#ffffff",
        backgroundColor: "#4a3f66",
        padding: { x: 20, y: 8 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backButton.on("pointerdown", () => {
      this.scene.start("TitleScene");
    });
  }
}
