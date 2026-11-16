import Phaser from "phaser";
import { addMuteButton, playBgm, playSe, stopBgm } from "../audio.js";
import { addHomeButton } from "../ui.js";
import { proceedAfter, returnToTitleAfter, showResultBanner } from "../effects/resultBanner.js";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEXT_RESOLUTION } from "../config.js";
import { buildNinaRooms } from "../stages/ninaRooms.js";

// ニナ担当：脱出系論理パズル（激ムズ）。一人称視点で、左右の矢印で
// 東西南北4方向の壁を巡回しながらオブジェクトをクリックして調査し、
// ヒントを集めて最終的にドアのコード入力で脱出する。移動・ジャンプ等
// のアクション要素は持たないため、独立したシーンとして実装する。
const WALL_CENTER_X = GAME_WIDTH / 2;
const WALL_CENTER_Y = GAME_HEIGHT / 2 + 10;
const WALL_WIDTH = GAME_WIDTH - 40;
const WALL_HEIGHT = 420;
const EXAMINE_PANEL_WIDTH = GAME_WIDTH - 120;
const EXAMINE_BOTTOM_MARGIN = 46; // 左下のホーム・右下のミュートボタンに重ならない高さ

export default class NinaEscapeRoomScene extends Phaser.Scene {
  constructor() {
    super("NinaEscapeRoomScene");
  }

  init(data) {
    this.roomIndex = data?.roomIndex ?? 0;
    // 2部屋目のカレンダー・金庫は「実際の今日 + 1日」で決まる。data.today はテスト用に日付を固定するため。
    const rooms = buildNinaRooms(data?.today ?? new Date());
    this.roomCount = rooms.length;
    this.room = rooms[this.roomIndex];
    this.examinedIds = new Set();
    this.hints = {}; // hintKey -> hintValue（判明したもののみ格納）
    this.attemptsLeft = this.room.maxAttempts;
    this.isCodeInputOpen = false;
    this.isFinished = false;
    this.currentWallIndex = 0; // room.wallOrderの添字
    this.backRevealed = new Set(); // 裏面を見たオブジェクト（集合写真）
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.background);

    this.add
      .text(GAME_WIDTH / 2, 20, "ニナ｜脱出パズル（激ムズ）", {
        fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
        fontSize: "18px",
        color: "#f5f3fa",
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5, 0);

    this.add
      .text(GAME_WIDTH / 2, 44, `ROOM ${this.roomIndex + 1}/${this.roomCount}  ${this.room.name}`, {
        fontFamily: "sans-serif",
        fontSize: "13px",
        color: "#d4cfe0",
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5, 0);

    this.attemptsText = this.add
      .text(GAME_WIDTH - 16, 16, this.formatAttemptsText(), {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#d4cfe0",
        backgroundColor: "rgba(20,18,26,0.7)",
        padding: { x: 10, y: 6 },
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(1, 0);

    this.wallLabelText = this.add
      .text(16, 16, "", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#d4cfe0",
        backgroundColor: "rgba(20,18,26,0.7)",
        padding: { x: 10, y: 6 },
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0, 0);

    // 壁の背景画像。面を切り替えるたびにテクスチャを差し替える。
    this.wallBackground = this.add
      .image(WALL_CENTER_X, WALL_CENTER_Y, this.getWallTextureKey())
      .setDisplaySize(WALL_WIDTH, WALL_HEIGHT);
    this.add.rectangle(WALL_CENTER_X, WALL_CENTER_Y, WALL_WIDTH, WALL_HEIGHT).setStrokeStyle(2, COLORS.accentSoft);

    this.objectContainer = this.add.container(0, 0);

    this.createArrowButtons();
    this.createExamineBox();
    this.createCodeInputBox();
    addMuteButton(this);
    addHomeButton(this);
    playBgm(this, this.room.bgm);

    this.renderCurrentWall();
  }

  formatAttemptsText() {
    return `残り試行回数 ${this.attemptsLeft}`;
  }

  getWallTextureKey() {
    return `${this.room.wallPrefix}${this.getCurrentWall()}`;
  }

  getCurrentWall() {
    return this.room.wallOrder[this.currentWallIndex];
  }

  createArrowButtons() {
    const arrowStyle = {
      fontFamily: "sans-serif",
      fontSize: "32px",
      color: "#ffffff",
      backgroundColor: "rgba(74,63,102,0.85)",
      padding: { x: 18, y: 10 },
      resolution: TEXT_RESOLUTION
    };

    this.leftArrow = this.add
      .text(40, GAME_HEIGHT / 2 + 10, "◀", arrowStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.leftArrow.on("pointerdown", () => this.turnWall(-1));

    this.rightArrow = this.add
      .text(GAME_WIDTH - 40, GAME_HEIGHT / 2 + 10, "▶", arrowStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.rightArrow.on("pointerdown", () => this.turnWall(1));
  }

  turnWall(direction) {
    if (this.isFinished) return;
    const wallCount = this.room.wallOrder.length;
    this.currentWallIndex = (this.currentWallIndex + direction + wallCount) % wallCount;
    this.examineBox.setVisible(false); // 開いている説明文は、視点を動かしたら閉じる
    playSe(this, "turn");
    this.renderCurrentWall();
  }

  renderCurrentWall() {
    this.objectContainer.removeAll(true); // 既存の壁オブジェクトを破棄

    const wall = this.getCurrentWall();
    this.wallBackground.setTexture(this.getWallTextureKey());
    this.wallLabelText.setText(this.room.wallLabels[wall]);

    const objectsOnWall = this.room.objects.filter(obj => obj.wall === wall);
    objectsOnWall.forEach(obj => this.createObjectSprite(obj));
  }

  // 状態に応じた画像を選ぶ。openWhenExamined のオブジェクトは調査後に開いた絵（_open）、
  // 「裏面・鏡に映した姿」を見たオブジェクトはその絵（_back）になる。
  getObjectTextureKey(obj) {
    const base = `obj_${obj.id}`;
    if (obj.openWhenExamined && this.examinedIds.has(obj.id)) return `${base}_open`;
    if (this.backRevealed.has(obj.id)) return `${base}_back`;
    return base;
  }

  createObjectSprite(obj) {
    const image = this.add.image(obj.x, obj.y, this.getObjectTextureKey(obj)).setDisplaySize(obj.width, obj.height);
    image.setInteractive({ useHandCursor: true });

    // ラベルはホバー時のみ表示する
    const label = this.add
      .text(obj.x, obj.y - obj.height / 2 - 14, obj.label, {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#f5f3fa",
        backgroundColor: "rgba(20,18,26,0.85)",
        padding: { x: 8, y: 3 },
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5)
      .setVisible(false);

    image.on("pointerdown", () => this.handleObjectClick(obj));
    image.on("pointerover", () => {
      image.setScale(image.scaleX * 1.04, image.scaleY * 1.04);
      label.setVisible(true);
    });
    image.on("pointerout", () => {
      image.setDisplaySize(obj.width, obj.height);
      label.setVisible(false);
    });

    this.objectContainer.add([image, label]);

    // 画像に焼き込まず、ゲーム側で描く文字（日めくりの日付・金庫の暗証の数字など）
    (obj.overlays ?? []).forEach(o => {
      if (o.when === "examined" && !this.examinedIds.has(obj.id)) return;
      const text = this.add
        .text(obj.x + o.dx, obj.y + o.dy, o.text, {
          fontFamily: "sans-serif",
          fontSize: `${o.size}px`,
          fontStyle: "bold",
          color: o.color,
          resolution: TEXT_RESOLUTION
        })
        .setOrigin(0.5);
      this.objectContainer.add(text);
    });

    // 調査済みの印
    if (this.examinedIds.has(obj.id) && !obj.isExit) {
      const badge = this.add
        .text(obj.x + obj.width / 2 - 6, obj.y - obj.height / 2 + 6, "✓", {
          fontFamily: "sans-serif",
          fontSize: "14px",
          color: "#14121a",
          backgroundColor: "#8cf0c0",
          padding: { x: 5, y: 1 },
          resolution: TEXT_RESOLUTION
        })
        .setOrigin(0.5);
      this.objectContainer.add(badge);
    }
  }

  createExamineBox() {
    this.examineBox = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 90).setVisible(false);

    this.examinePanel = this.add.rectangle(0, 0, EXAMINE_PANEL_WIDTH, 140, COLORS.panel, 0.97);
    this.examinePanel.setStrokeStyle(2, COLORS.accentSoft);

    this.examineText = this.add
      .text(0, 0, "", {
        fontFamily: "sans-serif",
        fontSize: "15px",
        color: "#f5f3fa",
        align: "center",
        lineSpacing: 4,
        // 日本語は空白で区切れないため、useAdvancedWrap で文字単位でも折り返す
        wordWrap: { width: EXAMINE_PANEL_WIDTH - 60, useAdvancedWrap: true },
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5);

    this.examineCloseButton = this.add
      .text(0, 0, "閉じる", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#ffffff",
        backgroundColor: "#4a3f66",
        padding: { x: 16, y: 6 },
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.examineCloseButton.on("pointerdown", () => this.examineBox.setVisible(false));

    this.examineBox.add([this.examinePanel, this.examineText, this.examineCloseButton]);
    this.layoutExamineBox();
  }

  // 文字量に合わせて枠の高さを決め、画面の下端に揃える（文字が枠をはみ出さないように）
  layoutExamineBox() {
    const textHeight = this.examineText.height;
    const panelHeight = Math.max(110, textHeight + 78);
    this.examinePanel.setSize(EXAMINE_PANEL_WIDTH, panelHeight);
    this.examinePanel.setDisplaySize(EXAMINE_PANEL_WIDTH, panelHeight);
    this.examineBox.y = GAME_HEIGHT - EXAMINE_BOTTOM_MARGIN - panelHeight / 2;
    this.examineText.y = -panelHeight / 2 + 18 + textHeight / 2;
    this.examineCloseButton.y = panelHeight / 2 - 28;
  }

  handleObjectClick(obj) {
    if (this.isFinished) return;

    if (obj.isExit) {
      playSe(this, "click");
      this.openCodeInput();
      return;
    }

    const requires = [].concat(obj.requires ?? []);
    if (!requires.every(id => this.examinedIds.has(id))) {
      playSe(this, "click");
      this.showExamineText(obj.requiresMessage || "まだ調べられないようだ。");
      return;
    }

    this.examinedIds.add(obj.id);
    playSe(this, "examine");

    // requiresForBackを持つオブジェクト（集合写真）は、その前提
    // （木箱）を既に調べていれば「裏面」の説明とヒントを使う。
    // 前提をまだ満たしていなければ、通常のexamineText（表面＝
    // ミスリード側）だけを見せ、hintKeyは確定させない。
    if (obj.requiresForBack) {
      if (this.examinedIds.has(obj.requiresForBack)) {
        this.backRevealed.add(obj.id);
        if (obj.hintKey) {
          this.hints[obj.hintKey] = obj.hintValue;
        }
        this.showExamineText(obj.examineBackText || obj.examineText);
      } else {
        this.showExamineText(obj.examineText);
      }
    } else {
      if (obj.hintKey) {
        this.hints[obj.hintKey] = obj.hintValue;
      }
      this.showExamineText(obj.examineText);
    }

    this.renderCurrentWall(); // 調査済み色に更新するため再描画
  }

  showExamineText(text) {
    this.examineText.setText(text);
    this.layoutExamineBox();
    this.examineBox.setVisible(true);
  }

  createCodeInputBox() {
    this.codeInputBox = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setVisible(false);

    const panel = this.add.rectangle(0, 25, 420, 270, COLORS.panel, 0.97);
    panel.setStrokeStyle(2, COLORS.accent);

    const title = this.add
      .text(0, -80, "4桁のコードを入力してください", {
        fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
        fontSize: "16px",
        color: "#f5f3fa",
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5);

    this.codeDisplayText = this.add
      .text(0, -30, "＿＿＿＿", {
        fontFamily: "sans-serif",
        fontSize: "32px",
        color: "#ffffff",
        letterSpacing: 8,
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5);

    this.codeDigits = [];

    // 数字パッド（0-9）
    const padStartX = -150;
    const padY = 30;
    for (let i = 0; i <= 9; i++) {
      const bx = padStartX + (i % 5) * 60;
      const by = padY + Math.floor(i / 5) * 50;
      const btn = this.add
        .text(bx, by, String(i), {
          fontFamily: "sans-serif",
          fontSize: "18px",
          color: "#ffffff",
          backgroundColor: "#4a3f66",
          padding: { x: 14, y: 8 },
          resolution: TEXT_RESOLUTION
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      btn.on("pointerdown", () => this.inputDigit(String(i)));
      this.codeInputBox.add(btn);
    }

    const clearButton = this.add
      .text(-150, 140, "クリア", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#ffffff",
        backgroundColor: "#4a3f66",
        padding: { x: 10, y: 6 },
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    clearButton.on("pointerdown", () => this.clearCodeInput());

    const submitButton = this.add
      .text(20, 140, "決定", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#ffffff",
        backgroundColor: "#a68cf0",
        padding: { x: 16, y: 6 },
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    submitButton.on("pointerdown", () => this.submitCode());

    const cancelButton = this.add
      .text(150, 140, "閉じる", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#d4cfe0",
        backgroundColor: "#2a2535",
        padding: { x: 10, y: 6 },
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    cancelButton.on("pointerdown", () => this.codeInputBox.setVisible(false));

    this.codeInputBox.add([panel, title, this.codeDisplayText, clearButton, submitButton, cancelButton]);
    // 数字ボタンは先にコンテナへ追加済みなので、パネルを最背面に送る（前面だと数字が隠れる）
    this.codeInputBox.sendToBack(panel);
  }

  openCodeInput() {
    this.examineBox.setVisible(false);
    this.clearCodeInput();
    this.codeInputBox.setVisible(true);
  }

  inputDigit(digit) {
    if (this.codeDigits.length >= 4) return;
    this.codeDigits.push(digit);
    playSe(this, "key");
    this.updateCodeDisplay();
  }

  clearCodeInput() {
    this.codeDigits = [];
    this.updateCodeDisplay();
  }

  updateCodeDisplay() {
    const filled = this.codeDigits.join("");
    const blanks = "＿".repeat(4 - this.codeDigits.length);
    this.codeDisplayText.setText(filled + blanks);
  }

  submitCode() {
    if (this.codeDigits.length !== 4) return;

    const entered = this.codeDigits.join("");
    if (entered === this.room.code) {
      this.handleEscapeSuccess();
      return;
    }

    this.attemptsLeft -= 1;
    this.attemptsText.setText(this.formatAttemptsText());
    this.clearCodeInput();

    playSe(this, "wrong");

    if (this.attemptsLeft <= 0) {
      this.handleEscapeFailure();
      return;
    }

    this.showExamineText(`コードが違うようだ……。（残り試行回数: ${this.attemptsLeft}）`);
    this.codeInputBox.setVisible(false);
  }

  handleEscapeSuccess() {
    this.isFinished = true;
    this.codeInputBox.setVisible(false);
    this.examineBox.setVisible(false);
    stopBgm(this);
    playSe(this, "unlock");
    this.time.delayedCall(450, () => playSe(this, "clear"));
    const isLast = this.roomIndex >= this.roomCount - 1;
    showResultBanner(this, "escape", {
      subText: isLast ? `${this.room.escapeText}　全部屋脱出！` : this.room.escapeText,
      portraitKey: "select_nina"
    });
    if (isLast) {
      returnToTitleAfter(this, 3600);
    } else {
      proceedAfter(this, 3200, () => this.scene.restart({ characterId: "nina", roomIndex: this.roomIndex + 1 }));
    }
  }

  handleEscapeFailure() {
    this.isFinished = true;
    this.codeInputBox.setVisible(false);
    this.examineBox.setVisible(false);
    stopBgm(this);
    playSe(this, "miss");
    showResultBanner(this, "miss", { subText: "ダイヤルが固まってしまった。これ以上は開けられないようだ。" });
    returnToTitleAfter(this, 2600);
  }
}
