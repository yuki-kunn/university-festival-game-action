import Phaser from "phaser";
import { addMuteButton, playBgm, playSe } from "../audio.js";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_RESOLUTION } from "../config.js";
import {
  addRanking,
  fetchSharedRanking,
  loadRanking,
  normalizeName,
  previewRankIn,
  RANKING,
  submitSharedRanking
} from "../ranking.js";
import { formatTime, getNikoRun, runScore } from "../score.js";
import { STAGES } from "../stages/index.js";
import { addHomeButton, goHome } from "../ui.js";

// ニコの最終ステージをクリアしたあとのスコア画面。ステージごとの内訳と合計、
// ランキング（上位10件）を表示し、名前を入力してランキングに登録できる。
const SERIF = "'Hiragino Mincho ProN', 'Yu Mincho', serif";
const GOLD = "#ffd24c";
const COLORS_ACCENT = "#a68cf0";
const REGISTER_BUTTON_X = 370; // 「ランキングに登録」ボタンの位置（左のパネルの右端付近に揃える）

export default class NikoScoreScene extends Phaser.Scene {
  constructor() {
    super("NikoScoreScene");
  }

  init() {
    this.result = runScore(getNikoRun(this.game).stages);
    this.registered = false;
    this.rankingTexts = [];
    this.ranking = []; // 表示中のランキング
    this.sharedMode = null; // null: 読み込み中 / true: みんなの記録（サーバー） / false: この端末の記録
  }

  create() {
    this.add.image(0, 0, "bg_select").setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.35).setOrigin(0);

    this.text(GAME_WIDTH / 2, 30, "RESULT", 32, COLORS_ACCENT, { fontFamily: SERIF }).setOrigin(0.5);
    this.text(GAME_WIDTH / 2, 60, "ニコ｜爽快アクション", 13, "#d4cfe0").setOrigin(0.5);

    this.createBreakdown();
    this.createRankingPanel();
    this.createButtons();

    addMuteButton(this, { key: false }); // 名前入力でMキーを打てるように、キー操作は無効
    addHomeButton(this);
    playBgm(this, "daily");
    this.events.once("shutdown", () => this.closeNameInput());
  }

  text(x, y, str, size, color, extra = {}) {
    return this.add.text(x, y, str, {
      fontFamily: "sans-serif",
      fontSize: `${size}px`,
      color,
      resolution: TEXT_RESOLUTION,
      ...extra
    });
  }

  // ---- 左: ステージごとの内訳と合計 ----
  createBreakdown() {
    const left = 40;
    const top = 84;
    this.add.rectangle(left, top, 440, 326, COLORS.panel, 0.92).setOrigin(0).setStrokeStyle(2, COLORS.accentSoft);

    const cols = { stage: left + 16, coin: left + 196, time: left + 296, score: left + 424 };
    this.text(cols.stage, top + 14, "ステージ", 12, "#a99fc4");
    this.text(cols.coin, top + 14, "コイン", 12, "#a99fc4");
    this.text(cols.time, top + 14, "タイム", 12, "#a99fc4");
    this.text(cols.score, top + 14, "スコア", 12, "#a99fc4").setOrigin(1, 0);

    STAGES.niko.forEach((stage, i) => {
      const y = top + 46 + i * 40;
      const part = this.result.parts.find(p => p.stageIndex === i);
      this.text(cols.stage, y, `STAGE ${i + 1}  ${stage.name}`, 14, "#f5f3fa");
      if (part) {
        this.text(cols.coin, y, `${part.coins}/${part.totalCoins}`, 14, "#f5f3fa");
        this.text(cols.time, y, formatTime(part.timeMs), 14, "#f5f3fa");
        this.text(cols.score, y, part.total.toLocaleString("ja-JP"), 15, "#f5f3fa").setOrigin(1, 0);
      } else {
        this.text(cols.coin, y, "-", 14, "#7d7596");
      }
    });

    this.add.rectangle(left + 16, top + 170, 408, 2, COLORS.accentSoft).setOrigin(0);
    this.text(cols.stage, top + 186, "合計", 14, "#d4cfe0");
    this.text(cols.coin, top + 186, `${this.result.coins}/${this.result.totalCoins}`, 14, "#d4cfe0");
    this.text(cols.time, top + 186, formatTime(this.result.timeMs), 14, "#d4cfe0");

    this.text(left + 220, top + 224, "TOTAL SCORE", 12, "#a99fc4").setOrigin(0.5);
    this.totalScoreText = this.text(left + 220, top + 262, this.result.total.toLocaleString("ja-JP"), 52, GOLD, {
      fontStyle: "bold"
    }).setOrigin(0.5);
    const coinPts = this.result.parts.reduce((s, p) => s + p.coinPoints, 0);
    const bonus = this.result.parts.reduce((s, p) => s + p.timeBonus, 0);
    this.text(left + 220, top + 304, `コイン ${coinPts.toLocaleString("ja-JP")}  ＋  タイムボーナス ${bonus.toLocaleString("ja-JP")}`, 12, "#a99fc4").setOrigin(0.5);
  }

  // ---- 右: ランキング ----
  createRankingPanel() {
    const left = 500;
    const top = 84;
    this.add.rectangle(left, top, 420, 326, COLORS.panel, 0.92).setOrigin(0).setStrokeStyle(2, COLORS.accentSoft);
    this.text(left + 210, top + 18, "RANKING  TOP 10", 14, COLORS_ACCENT, { fontStyle: "bold" }).setOrigin(0.5);
    this.statusText = this.text(left + 210, top + 36, "読み込み中…", 11, "#a99fc4").setOrigin(0.5);
    this.rankingLeft = left;
    this.rankingTop = top + 52;
    this.messageText = this.text(left + 210, top + 308, "", 13, "#d4cfe0").setOrigin(0.5);
    this.renderRanking();
    this.loadRanking();
  }

  // 共有ランキング（サーバー）を取得する。取得できなければ、この端末の記録に切り替える。
  async loadRanking() {
    const shared = await fetchSharedRanking();
    if (!this.scene.isActive()) return; // 待っている間に別の画面へ移った
    this.applyRanking(shared ?? loadRanking(), shared !== null);
  }

  applyRanking(ranking, shared, highlightAt = null) {
    this.ranking = ranking;
    this.sharedMode = shared;
    this.statusText
      .setText(shared ? "みんなの記録" : "この端末の記録（サーバーに接続できません）")
      .setColor(shared ? "#8cf0c0" : "#f0c08c");
    this.renderRanking(highlightAt);
  }

  // highlightAt: 登録直後に強調する行（登録した記録の at）。
  renderRanking(highlightAt = null) {
    this.rankingTexts.forEach(t => t.destroy());
    this.rankingTexts = [];
    if (this.ranking.length === 0) {
      const empty = this.sharedMode === null ? "" : "まだ記録がありません";
      this.rankingTexts.push(this.text(this.rankingLeft + 210, this.rankingTop + 100, empty, 14, "#7d7596").setOrigin(0.5));
    }
    this.ranking.forEach((e, i) => {
      const y = this.rankingTop + i * 24;
      const color = e.at === highlightAt ? GOLD : "#f5f3fa";
      this.rankingTexts.push(
        this.text(this.rankingLeft + 40, y, `${i + 1}`, 14, color, { fontStyle: "bold" }).setOrigin(1, 0),
        this.text(this.rankingLeft + 56, y, e.name, 14, color),
        this.text(this.rankingLeft + 400, y, e.score.toLocaleString("ja-JP"), 14, color).setOrigin(1, 0)
      );
    });
    if (!this.registered && this.sharedMode !== null) {
      const rank = previewRankIn(this.ranking, { score: this.result.total, timeMs: this.result.timeMs });
      this.messageText.setText(rank ? `いま登録すると ${rank}位` : "このスコアは圏外です");
    }
  }

  // ---- ボタン ----
  createButtons() {
    const y = 470;
    this.registerButton = this.makeButton(REGISTER_BUTTON_X, y, "ランキングに登録", () => this.openNameInput());
    this.makeButton(660, y, "もう一度あそぶ", () => {
      this.scene.start("NikoRushActionScene", { characterId: "niko", stageIndex: 0 });
    });
  }

  makeButton(x, y, label, onClick) {
    const image = this.add.image(x, y, "ui_button").setDisplaySize(240, 58).setInteractive({ useHandCursor: true });
    const text = this.text(x, y, label, 20, "#ffffff").setOrigin(0.5);
    image.on("pointerover", () => {
      playSe(this, "hover");
      image.setTexture("ui_button_hover");
    });
    image.on("pointerout", () => image.setTexture("ui_button"));
    image.on("pointerdown", () => {
      playSe(this, "click");
      onClick();
    });
    return { image, text, destroy: () => [image, text].forEach(o => o.destroy()) };
  }

  // ---- 名前入力（ブラウザ標準の入力欄。日本語入力に対応） ----
  openNameInput() {
    if (this.registered || this.nameOverlay) return;
    const objects = [];
    objects.push(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0).setDepth(150).setInteractive());
    objects.push(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 480, 250, COLORS.panel, 1).setDepth(151).setStrokeStyle(2, COLORS.accent));
    objects.push(this.text(GAME_WIDTH / 2, 190, "名前を入力してください", 20, "#f5f3fa", { fontFamily: SERIF }).setOrigin(0.5).setDepth(152));
    objects.push(this.text(GAME_WIDTH / 2, 218, `${RANKING.nameMaxLength}文字まで`, 12, "#a99fc4").setOrigin(0.5).setDepth(152));

    // 入力欄はブラウザ標準の <input>（日本語入力に対応）を、キャンバスの上に重ねて置く。
    // 画面の拡大縮小（FIT）に合わせて、キャンバスの位置と拡大率から配置を計算する。
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = RANKING.nameMaxLength;
    input.placeholder = RANKING.defaultName;
    input.autocomplete = "off";
    input.setAttribute("aria-label", "ランキングに登録する名前");
    input.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.isComposing) this.submitName(input.value);
      if (e.key === "Escape") this.closeNameInput();
    });
    document.body.appendChild(input);
    this.nameInputNode = input;
    this.placeNameInput();
    this.nameInputResizeHandler = () => this.placeNameInput();
    window.addEventListener("resize", this.nameInputResizeHandler);
    this.scale.on("resize", this.nameInputResizeHandler);

    const ok = this.makeButton(GAME_WIDTH / 2 - 120, 336, "登録する", () => this.submitName(input.value));
    const cancel = this.text(GAME_WIDTH / 2 + 120, 336, "やめる", 17, "#d4cfe0", {
      backgroundColor: "#2a2535",
      padding: { x: 28, y: 14 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    cancel.on("pointerdown", () => {
      playSe(this, "click");
      this.closeNameInput();
    });
    [ok.image, ok.text].forEach(o => o.setDepth(152));
    cancel.setDepth(152);
    objects.push(ok.image, ok.text, cancel);

    this.nameOverlay = objects;
    setTimeout(() => input.focus(), 50);
  }

  // 入力欄を、ゲーム座標 (480, 268) の位置に、画面の拡大率に合わせた大きさで置く
  placeNameInput() {
    const input = this.nameInputNode;
    if (!input) return;
    const rect = this.game.canvas.getBoundingClientRect();
    const k = rect.width / GAME_WIDTH;
    input.style.cssText =
      `position:fixed;z-index:1000;left:${rect.left + (GAME_WIDTH / 2) * k}px;top:${rect.top + 268 * k}px;` +
      `transform:translate(-50%,-50%);box-sizing:border-box;width:${300 * k}px;padding:${10 * k}px ${14 * k}px;` +
      `font-size:${22 * k}px;text-align:center;border-radius:${10 * k}px;border:${2 * k}px solid #a68cf0;` +
      "background:#14121a;color:#f5f3fa;outline:none;font-family:sans-serif;";
  }

  closeNameInput() {
    this.nameOverlay?.forEach(o => o.destroy());
    this.nameOverlay = null;
    if (this.nameInputNode) {
      window.removeEventListener("resize", this.nameInputResizeHandler);
      this.scale.off("resize", this.nameInputResizeHandler);
      this.nameInputNode.remove();
      this.nameInputNode = null;
    }
  }

  // 名前を決めてランキングに登録する。まず共有ランキング（サーバー）に送り、送れなければこの端末に保存する。
  // 登録した順位（圏外なら null）を返す。
  async submitName(rawName) {
    if (this.registered) return null;
    this.registered = true;
    this.closeNameInput();
    const name = normalizeName(rawName);
    const entry = { name, score: this.result.total, coins: this.result.coins, timeMs: this.result.timeMs };
    this.registerButton.destroy();
    this.messageText.setText("登録しています…").setColor("#d4cfe0");

    const shared = await submitSharedRanking(entry);
    if (!this.scene.isActive()) return null;
    let rank;
    let note = "";
    if (shared) {
      rank = shared.rank;
      this.applyRanking(shared.ranking, true, shared.record.at);
    } else {
      const local = addRanking(entry);
      rank = local.rank;
      this.applyRanking(local.ranking, false, local.record.at);
      note = "（サーバーに接続できないため、この端末にだけ保存しました）";
    }
    this.messageText.setText(rank ? `${name}さん、${rank}位に登録しました！${note}` : `${name}さんのスコアは圏外でした${note}`).setColor(GOLD);
    playSe(this, rank ? "clear" : "click");
    return rank;
  }
}
