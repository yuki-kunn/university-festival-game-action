import Phaser from "phaser";
import { addMuteButton, playBgm, playSe, stopBgm } from "../audio.js";
import { proceedAfter, returnToTitleAfter, showResultBanner } from "../effects/resultBanner.js";
import { addHomeButton } from "../ui.js";
import { isGroundedRecently, shouldJump } from "../input.js";
import { STAGES } from "../stages/index.js";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CHARACTERS, DASH, SPRITE, STAGE_ART, TEXT_RESOLUTION } from "../config.js";

// 横スクロールアクション系シーンの共通基底クラス。移動・ジャンプ・
// ダッシュ回避・HUD・ミス/クリア判定など、PlayScene（主人公）と
// MaricoPuzzleActionScene（マリコ）で共通する処理をここにまとめる。
// サブクラスは createStageObjects() をオーバーライドして、床・障害物・
// ゴールに加えて独自のギミック（スイッチ・ブロック等）を追加する。
export default class ActionSceneBase extends Phaser.Scene {
  init(data) {
    this.characterId = data.characterId;
    this.character = CHARACTERS.find(c => c.id === this.characterId) || CHARACTERS[0];
    this.stageIndex = data.stageIndex ?? 0;
    this.stageCount = STAGES[this.character.id].length;
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
    this.airDashUsed = false; // 空中ダッシュは着地するまでに1回だけ
    this.jumpPressedAt = -Infinity; // ジャンプを押した時刻（先行入力）
    this.lastGroundedAt = -Infinity; // 最後に接地していた時刻（猶予時間）
    this.facing = 1; // 1: 右向き, -1: 左向き

    this.createBackground();
    this.createPlatforms();
    this.createObstacles();
    this.createGoal();
    this.createPlayer();
    this.createStageObjects(); // サブクラスでギミックを追加するフック
    this.createHud();
    this.setupInput();
    addMuteButton(this);
    addHomeButton(this);
    playBgm(this, this.character.bgmKey);

    this.physics.add.collider(this.player, this.platformGroup);
    this.physics.add.overlap(this.player, this.obstacleGroup, () => this.handleMiss("障害物に接触"));
    this.physics.add.overlap(this.player, this.goalZone, () => this.handleClear());

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  // 現在のキャラ・ステージ番号に対応するステージデータ（stages/index.js）を返す
  getStageData() {
    return STAGES[this.character.id][this.stageIndex];
  }

  // サブクラスでスイッチ等の追加ギミックを実装するためのフック。
  // デフォルトでは何もしない。
  createStageObjects() {}

  // キャラ別の背景を、カメラより遅く動かして奥行きを出す。
  createBackground() {
    this.background = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, this.stage.bgKey ?? this.character.bgKey)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-10);
  }

  createPlatforms() {
    this.platformGroup = this.physics.add.staticGroup();
    this.stage.platforms.forEach(p => {
      const tile = this.add.tileSprite(p.x, p.y, p.width, p.height, "tile_ground");
      tile.setTileScale(STAGE_ART.scale, STAGE_ART.scale);
      this.physics.add.existing(tile, true);
      this.platformGroup.add(tile);
    });
  }

  createObstacles() {
    this.obstacleGroup = this.physics.add.staticGroup();
    this.stage.obstacles.forEach(o => {
      const spike = this.add.image(o.x, o.y, "spike").setDisplaySize(o.width, o.height);
      this.physics.add.existing(spike, true);
      this.obstacleGroup.add(spike);
    });
  }

  createGoal() {
    const g = this.stage.goal;
    const door = this.add.image(g.x, g.y, "goal").setDisplaySize(g.width, g.height);
    this.physics.add.existing(door, true);
    this.goalZone = door;
    this.tweens.add({ targets: door, alpha: 0.75, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  createPlayer() {
    const start = this.stage.playerStart;
    this.player = this.add.sprite(start.x, start.y, this.character.spriteKey).setScale(SPRITE.scale).setDepth(10);
    this.physics.add.existing(this.player);
    // 当たり判定は従来どおり 36x56。コマ内の足元（下端から4px上）に合わせる。
    // setSize/setOffsetは拡大前のコマ座標で指定する。
    const bodyW = 36 / SPRITE.scale;
    const bodyH = 56 / SPRITE.scale;
    this.player.body.setSize(bodyW, bodyH);
    this.player.body.setOffset((SPRITE.frameWidth - bodyW) / 2, 140 - bodyH);
    this.player.play(`${this.character.id}_idle`);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setMaxVelocity(DASH.speed, 1200);
  }

  // HUDの操作ガイド文言。サブクラスでオーバーライドして、パズル操作等
  // 固有の説明を追加できる。
  getHudHintText() {
    return `${this.character.name}｜←→移動 / スペース ジャンプ / Shift ダッシュ回避（空中は1回）`;
  }

  // 右上のスコア表示欄の初期テキスト。nullを返すとスコア欄自体を
  // 作らない（デフォルト）。コイン収集などスコア要素を持つサブクラス
  // （例: NikoRushActionScene）でオーバーライドする。
  getInitialScoreText() {
    return null;
  }

  createHud() {
    this.hudText = this.add
      .text(16, 16, this.getHudHintText(), {
        fontFamily: "sans-serif",
        fontSize: "13px",
        color: "#d4cfe0",
        backgroundColor: "rgba(20,18,26,0.7)",
        padding: { x: 8, y: 4 },
        // 長い操作説明は折り返して、画面中央上部のSTAGE表示（幅の中心±120px）と重ならないようにする
        wordWrap: { width: 320, useAdvancedWrap: true },
        resolution: TEXT_RESOLUTION
      })
      .setScrollFactor(0);

    // ステージ番号と名前（画面上部中央）
    this.stageLabel = this.add
      .text(GAME_WIDTH / 2, 16, `STAGE ${this.stageIndex + 1}/${this.stageCount}  ${this.stage.name}`, {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#f5f3fa",
        backgroundColor: "rgba(20,18,26,0.7)",
        padding: { x: 10, y: 4 },
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    // スコア表示はコイン収集等、一部のジャンルでのみ使う任意要素。
    // getInitialScoreText()がnull以外を返すサブクラスでのみ表示する。
    const initialScoreText = this.getInitialScoreText();
    if (initialScoreText !== null) {
      this.scoreText = this.add
        .text(GAME_WIDTH - 16, 16, initialScoreText, {
          fontFamily: "sans-serif",
          fontSize: "16px",
          color: "#f5f3fa",
          backgroundColor: "rgba(20,18,26,0.7)",
          padding: { x: 10, y: 6 },
          resolution: TEXT_RESOLUTION
        })
        .setOrigin(1, 0)
        .setScrollFactor(0);
    }
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // ジャンプとダッシュは、キーの押下イベントで受ける。JustDown は「押して離すまでが1フレームに
    // 収まる短いタップ」だと押したこと自体が消えるため、描画が遅いPCで入力が抜けてしまう。
    this.dashRequested = false;
    const onKeyDown = (event, handler) => {
      this.input.keyboard.on(event, handler);
      this.events.once("shutdown", () => this.input.keyboard.off(event, handler));
    };
    const requestJump = () => {
      this.jumpPressedAt = this.time.now;
    };
    onKeyDown("keydown-SPACE", requestJump);
    onKeyDown("keydown-UP", requestJump);
    onKeyDown("keydown-SHIFT", () => {
      this.dashRequested = true;
    });
  }

  update() {
    this.background.tilePositionX = this.cameras.main.scrollX * STAGE_ART.bgParallax;
    const now = this.time.now;

    // 入力は毎フレーム読む。早期returnで読み飛ばすと、押した瞬間の入力が古いまま残るため。
    const left = this.cursors.left.isDown || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;
    const dashPressed = this.dashRequested;
    this.dashRequested = false;

    if (this.isGameOver) return;

    // 画面下へ落下したら即ミス
    if (this.player.y > this.stage.worldHeight + 100) {
      this.handleMiss("落下");
      return;
    }

    if (this.isDashing) return; // ダッシュ中は移動入力を受け付けない（慣性で進む）

    if (left) {
      this.player.body.setVelocityX(-this.character.moveSpeed);
      this.facing = -1;
    } else if (right) {
      this.player.body.setVelocityX(this.character.moveSpeed);
      this.facing = 1;
    } else {
      this.player.body.setVelocityX(0);
    }

    const touching = this.player.body.blocked.down || this.player.body.touching.down;
    if (touching && this.player.body.velocity.y >= 0) this.lastGroundedAt = now;
    this.tryJump(now);

    // 着地中に接地判定が1フレーム外れても、地上として扱う（空中ダッシュを消費しない・ジャンプ姿にならない）
    const onGround = isGroundedRecently({
      now,
      lastGroundedAt: this.lastGroundedAt,
      velocityY: this.player.body.velocity.y,
      frameMs: this.game.loop.delta
    });
    if (onGround) this.airDashUsed = false;

    if (dashPressed && this.tryDash(onGround)) return;

    this.updateAnimation(left || right, onGround);
  }

  // 先行入力と猶予時間を考慮してジャンプする。ジャンプしたら true。
  tryJump(now) {
    const frameMs = this.game.loop.delta; // 描画が遅い環境でも、押したジャンプを取りこぼさないため
    if (!shouldJump({ now, jumpPressedAt: this.jumpPressedAt, lastGroundedAt: this.lastGroundedAt, frameMs })) return false;
    playSe(this, "jump");
    this.player.body.setVelocityY(-this.character.jumpPower);
    this.jumpPressedAt = -Infinity;
    this.lastGroundedAt = -Infinity; // 同じ入力で二重にジャンプしない
    return true;
  }

  updateAnimation(moving, onGround) {
    this.player.setFlipX(this.facing < 0);
    let name = "idle";
    if (!onGround) {
      name = this.player.body.velocity.y < 0 ? "jump_up" : "jump_down";
    } else if (moving) {
      name = "run";
    }
    this.player.anims.play(`${this.character.id}_${name}`, true);
  }

  // ダッシュを試みる。クールダウン中、または空中で既にダッシュを使った場合は出ない。
  // 空中ダッシュを1回に制限するのは、連続ダッシュで穴やパズルを飛ばせないようにするため。
  tryDash(onGround) {
    if (!this.canDash) return false;
    if (!onGround) {
      if (this.airDashUsed) return false;
      this.airDashUsed = true;
    }
    this.startDash();
    return true;
  }

  startDash() {
    playSe(this, "dash");
    this.isDashing = true;
    this.canDash = false;
    this.isInvincible = true;
    this.player.body.setVelocityX(DASH.speed * this.facing);
    this.player.body.setVelocityY(0);
    this.player.body.setAllowGravity(false);
    this.player.setAlpha(0.5);
    this.player.setFlipX(this.facing < 0);
    this.player.anims.play(`${this.character.id}_dash`, true);

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
    this.player.anims.play(`${this.character.id}_miss`, true);
    playSe(this, "miss");
    showResultBanner(this, "miss", { subText: reason });
    this.time.delayedCall(1100, () => this.scene.restart({ characterId: this.characterId, stageIndex: this.stageIndex }));
  }

  handleClear() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.player.body.setVelocity(0, 0);
    this.player.anims.play(`${this.character.id}_idle`, true);
    stopBgm(this);
    playSe(this, "clear");
    this.onStageCleared();
    const isLast = this.stageIndex >= this.stageCount - 1;
    const extra = this.getClearSubText();
    const message = isLast ? "全ステージクリア！" : `次は STAGE ${this.stageIndex + 2}`;
    showResultBanner(this, "clear", {
      subText: extra ? `${message}　${extra}` : message,
      portraitKey: this.character.portraitKey
    });
    if (isLast) {
      this.proceedAfterFinalClear();
    } else {
      proceedAfter(this, 2600, () =>
        this.scene.restart({ characterId: this.characterId, stageIndex: this.stageIndex + 1 })
      );
    }
  }

  // ステージをクリアした直後に呼ばれる（記録などを残したいサブクラス用）。
  onStageCleared() {}

  // 最終ステージのクリア演出のあとの遷移。既定はタイトルへ戻る。
  proceedAfterFinalClear() {
    returnToTitleAfter(this, 3200);
  }

  // クリア演出のバナー下に出す補足文。コイン数など、ジャンル固有の結果を返す。
  getClearSubText() {
    return "";
  }
}
