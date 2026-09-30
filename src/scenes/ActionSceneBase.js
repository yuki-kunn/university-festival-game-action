import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CHARACTERS, DASH, TEXT_RESOLUTION } from "../config.js";

// 横スクロールアクション系シーンの共通基底クラス。移動・ジャンプ・
// ダッシュ回避・HUD・ミス/クリア判定など、PlayScene（主人公）と
// MaricoPuzzleActionScene（マリコ）で共通する処理をここにまとめる。
// サブクラスは createStageObjects() をオーバーライドして、床・障害物・
// ゴールに加えて独自のギミック（スイッチ・ブロック等）を追加する。
export default class ActionSceneBase extends Phaser.Scene {
  init(data) {
    this.characterId = data.characterId;
    this.character = CHARACTERS.find(c => c.id === this.characterId) || CHARACTERS[0];
  }

  create() {
    this.stage = this.getStageData();
    this.cameras.main.setBackgroundColor(COLORS.background);
    // 物理ワールドの下端は、床の穴に落下できるよう画面外まで広げておく
    // （setCollideWorldBoundsがステージ高さちょうどで止めてしまうと、
    // 「落下してミスになる」演出自体が起きなくなるため）。カメラの
    // 境界は元のステージ高さのままにし、見た目のスクロール範囲は
    // 変えない。
    const FALL_MARGIN = 400;
    this.physics.world.setBounds(0, 0, this.stage.worldWidth, this.stage.worldHeight + FALL_MARGIN);
    this.cameras.main.setBounds(0, 0, this.stage.worldWidth, this.stage.worldHeight);

    this.isGameOver = false; // クリア/リトライ演出中の入力ロック用
    this.isDashing = false;
    this.isInvincible = false;
    this.canDash = true;
    this.facing = 1; // 1: 右向き, -1: 左向き

    this.createPlatforms();
    this.createObstacles();
    this.createGoal();
    this.createPlayer();
    this.createStageObjects(); // サブクラスでギミックを追加するフック
    this.createHud();
    this.setupInput();

    this.physics.add.collider(this.player, this.platformGroup);
    this.physics.add.overlap(this.player, this.obstacleGroup, () => this.handleMiss("障害物に接触"));
    this.physics.add.overlap(this.player, this.goalZone, () => this.handleClear());

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  // サブクラスで対象のステージデータ（stages/配下）を返す
  getStageData() {
    throw new Error("getStageData() must be implemented by subclass");
  }

  // サブクラスでスイッチ等の追加ギミックを実装するためのフック。
  // デフォルトでは何もしない。
  createStageObjects() {}

  createPlatforms() {
    this.platformGroup = this.physics.add.staticGroup();
    this.stage.platforms.forEach(p => {
      const rect = this.add.rectangle(p.x, p.y, p.width, p.height, COLORS.panel);
      rect.setStrokeStyle(2, COLORS.accentSoft);
      this.physics.add.existing(rect, true);
      this.platformGroup.add(rect);
    });
  }

  createObstacles() {
    this.obstacleGroup = this.physics.add.staticGroup();
    this.stage.obstacles.forEach(o => {
      const rect = this.add.rectangle(o.x, o.y, o.width, o.height, 0xd94f4f);
      this.physics.add.existing(rect, true);
      this.obstacleGroup.add(rect);
    });
  }

  createGoal() {
    const g = this.stage.goal;
    const rect = this.add.rectangle(g.x, g.y, g.width, g.height, COLORS.accent, 0.6);
    rect.setStrokeStyle(2, COLORS.accent);
    this.physics.add.existing(rect, true);
    this.goalZone = rect;
  }

  createPlayer() {
    const start = this.stage.playerStart;
    // 仮スプライト（色付き四角形）。将来ドット絵に差し替える。
    this.player = this.add.rectangle(start.x, start.y, 36, 56, this.character.color);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setMaxVelocity(DASH.speed, 1200);
  }

  // HUDの操作ガイド文言。サブクラスでオーバーライドして、パズル操作等
  // 固有の説明を追加できる。
  getHudHintText() {
    return `${this.character.name}｜←→移動 / スペース ジャンプ / Shift ダッシュ回避`;
  }

  createHud() {
    this.hudText = this.add
      .text(16, 16, this.getHudHintText(), {
        fontFamily: "sans-serif",
        fontSize: "13px",
        color: "#d4cfe0",
        backgroundColor: "rgba(20,18,26,0.7)",
        padding: { x: 8, y: 4 },
        resolution: TEXT_RESOLUTION
      })
      .setScrollFactor(0);

    this.messageText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "", {
        fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
        fontSize: "36px",
        color: "#f5f3fa",
        backgroundColor: "rgba(14,12,19,0.85)",
        padding: { x: 24, y: 16 },
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  }

  update() {
    if (this.isGameOver) return;

    // 画面下へ落下したら即ミス
    if (this.player.y > this.stage.worldHeight + 100) {
      this.handleMiss("落下");
      return;
    }

    if (this.isDashing) return; // ダッシュ中は移動入力を受け付けない（慣性で進む）

    const left = this.cursors.left.isDown || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keySpace);
    const dashPressed = Phaser.Input.Keyboard.JustDown(this.keyShift);

    if (left) {
      this.player.body.setVelocityX(-this.character.moveSpeed);
      this.facing = -1;
    } else if (right) {
      this.player.body.setVelocityX(this.character.moveSpeed);
      this.facing = 1;
    } else {
      this.player.body.setVelocityX(0);
    }

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    if (jumpPressed && onGround) {
      this.player.body.setVelocityY(-this.character.jumpPower);
    }

    if (dashPressed && this.canDash) {
      this.startDash();
    }
  }

  startDash() {
    this.isDashing = true;
    this.canDash = false;
    this.isInvincible = true;
    this.player.body.setVelocityX(DASH.speed * this.facing);
    this.player.body.setVelocityY(0);
    this.player.body.setAllowGravity(false);
    this.player.setAlpha(0.5);

    this.time.delayedCall(DASH.durationMs, () => {
      this.isDashing = false;
      this.player.body.setAllowGravity(true);
      this.player.body.setVelocityX(0);
    });

    this.time.delayedCall(DASH.invincibleMs, () => {
      this.isInvincible = false;
      this.player.setAlpha(1);
    });

    this.time.delayedCall(DASH.cooldownMs, () => {
      this.canDash = true;
    });
  }

  handleMiss(reason) {
    if (this.isGameOver || this.isInvincible) return;
    this.isGameOver = true;
    this.player.body.setVelocity(0, 0);
    this.showMessage(`ミス…（${reason}）`);
    this.time.delayedCall(900, () => this.scene.restart({ characterId: this.characterId }));
  }

  handleClear() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.player.body.setVelocity(0, 0);
    this.showMessage("ステージクリア！");
    this.time.delayedCall(1200, () => this.scene.start("TitleScene"));
  }

  showMessage(text) {
    this.messageText.setText(text).setVisible(true);
  }
}
