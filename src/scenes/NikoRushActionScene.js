import ActionSceneBase from "./ActionSceneBase.js";
import { playSe } from "../audio.js";
import { proceedAfter } from "../effects/resultBanner.js";
import { addNikoStageResult, resetNikoRun, stageScore } from "../score.js";

// ニコ担当：爽快アクション（ハイテンションなキッズゲーマー向け）。
// 高速移動・ミスしにくい構成・コイン収集によるスコア演出が特徴。
// クリア条件はゴール到達のみで、コインは取らなくてもクリアできる。
const COIN_SIZE = 20;

export default class NikoRushActionScene extends ActionSceneBase {
  constructor() {
    super("NikoRushActionScene");
  }

  init(data) {
    super.init(data);
    // ステージ1から始めるときは、新しいプレイとして記録を作り直す（ステージ1のやり直しも含む）
    if (this.stageIndex === 0) resetNikoRun(this.game);
  }

  create() {
    super.create();
    this.attemptStartedAt = this.time.now; // クリア時間の起点（ミスで再開したときは、その試行の開始から）
  }

  // クリア時間とコイン数を記録する（最終ステージのあと、スコア画面で合計する）
  onStageCleared() {
    this.lastResult = {
      stageIndex: this.stageIndex,
      coins: this.coinCount,
      totalCoins: this.stage.coins.length,
      timeMs: this.time.now - this.attemptStartedAt
    };
    addNikoStageResult(this.game, this.lastResult);
  }

  proceedAfterFinalClear() {
    proceedAfter(this, 3200, () => this.scene.start("NikoScoreScene"));
  }

  getHudHintText() {
    return `${this.character.name}｜←→移動 / スペース ジャンプ / Shift ダッシュ回避（空中は1回） / コインを集めよう！`;
  }

  getInitialScoreText() {
    this.coinCount = 0;
    return this.formatScoreText();
  }

  getClearSubText() {
    const r = this.lastResult;
    return `コイン ${r.coins}/${r.totalCoins}　${(r.timeMs / 1000).toFixed(1)}秒　スコア ${stageScore(r).total.toLocaleString("ja-JP")}`;
  }

  formatScoreText() {
    const total = this.stage.coins.length;
    return `コイン ${this.coinCount} / ${total}`;
  }

  createStageObjects() {
    this.coinGroup = this.physics.add.staticGroup();

    this.stage.coins.forEach(c => {
      const coin = this.add.sprite(c.x, c.y, "coin").setDisplaySize(COIN_SIZE, COIN_SIZE);
      coin.play({ key: "coin_spin", startFrame: Math.floor(Math.random() * 6) });
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
    // 連続で取るほど音が上がる
    playSe(this, "coin", { rate: 1 + Math.min(0.6, (this.coinCount - 1) * 0.05) });
    this.scoreText.setText(this.formatScoreText());
  }
}
