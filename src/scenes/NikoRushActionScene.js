import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEXT_RESOLUTION } from "../config.js";

// ニコ担当：爽快アクション（ハイテンションなキッズゲーマー向け。コイン
// 収集＋高速スクロール＋ジャンプ主体でミスしにくくテンポの速い体験）。
// 詳細な実装は別Issueで行う。現時点では準備中画面とタイトルへ戻る
// 導線のみを用意する。
export default class NikoRushActionScene extends Phaser.Scene {
  constructor() {
    super("NikoRushActionScene");
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.background);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, "ニコ｜爽快アクション", {
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
