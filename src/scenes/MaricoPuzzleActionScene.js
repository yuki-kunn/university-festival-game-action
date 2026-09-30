import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEXT_RESOLUTION } from "../config.js";

// マリコ担当：パズル×アクション（スイッチ・ブロック操作で道を開きながら
// 進む横スクロールアクション）。詳細な実装は別Issueで行う。現時点では
// 準備中画面とタイトルへ戻る導線のみを用意する。
export default class MaricoPuzzleActionScene extends Phaser.Scene {
  constructor() {
    super("MaricoPuzzleActionScene");
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.background);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, "マリコ｜パズル×アクション", {
        fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
        fontSize: "28px",
        color: "#f5f3fa",
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, "現在製作中です", {
        fontFamily: "sans-serif",
        fontSize: "16px",
        color: "#d4cfe0",
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5);

    const backButton = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 60, "タイトルへ戻る", {
        fontFamily: "sans-serif",
        fontSize: "18px",
        color: "#ffffff",
        backgroundColor: "#4a3f66",
        padding: { x: 20, y: 8 },
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backButton.on("pointerdown", () => {
      this.scene.start("TitleScene");
    });
  }
}
