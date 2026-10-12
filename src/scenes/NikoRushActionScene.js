import ActionSceneBase from "./ActionSceneBase.js";
import { NIKO_STAGE1 } from "../stages/nikoStage1.js";

// ニコ担当：爽快アクション（ハイテンションなキッズゲーマー向け）。
// 高速移動・ミスしにくい構成・コイン収集によるスコア演出が特徴。
// クリア条件はゴール到達のみで、コインは取らなくてもクリアできる。
const COIN_COLOR = 0xffd24c;
const COIN_RADIUS = 10;

export default class NikoRushActionScene extends ActionSceneBase {
  constructor() {
    super("NikoRushActionScene");
  }

  getStageData() {
    return NIKO_STAGE1;
  }

  getHudHintText() {
    return `${this.character.name}｜←→移動 / スペース ジャンプ / Shift ダッシュ回避 / コインを集めよう！`;
  }

  getInitialScoreText() {
    this.coinCount = 0;
    return this.formatScoreText();
  }

  formatScoreText() {
    const total = this.stage.coins.length;
    return `コイン ${this.coinCount} / ${total}`;
  }

  createStageObjects() {
    this.coinGroup = this.physics.add.staticGroup();

    this.stage.coins.forEach(c => {
      const coin = this.add.circle(c.x, c.y, COIN_RADIUS, COIN_COLOR);
      coin.setStrokeStyle(2, 0xffffff, 0.6);
      this.physics.add.existing(coin, true);
      this.coinGroup.add(coin);
    });

    this.physics.add.overlap(this.player, this.coinGroup, (player, coin) => {
      this.collectCoin(coin);
    });
  }

  collectCoin(coin) {
    // staticGroupからの除去＋破棄。同一フレームでの二重取得を防ぐため、
    // disableBody(true, true)でボディ無効化と非表示を同時に行う。
    this.coinGroup.killAndHide(coin);
    coin.body.enable = false;

    this.coinCount += 1;
    this.scoreText.setText(this.formatScoreText());
  }
}
