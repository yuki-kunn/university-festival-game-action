import ActionSceneBase from "./ActionSceneBase.js";
import { playSe } from "../audio.js";
import { STAGE_ART } from "../config.js";

// マリコ担当：パズル×アクション。既存の横スクロールアクション（移動・
// ジャンプ・ダッシュ回避）に、スイッチ・ブロックによるパズル要素を
// 追加する。スイッチは接触式・トグル型で、1つのスイッチが複数の
// ブロックを一括で切り替える。ブロックはスイッチON時に実体化する
// タイプ（穴をふさぐ「橋」）と、OFF時に実体化するタイプ（道を塞ぐ
// 「壁」）の両方を持てる。

export default class MaricoPuzzleActionScene extends ActionSceneBase {
  constructor() {
    super("MaricoPuzzleActionScene");
  }

  getHudHintText() {
    return `${this.character.name}｜←→移動 / スペース ジャンプ / Shift ダッシュ回避 / スイッチに触れて道を開こう`;
  }

  createStageObjects() {
    // スイッチのON/OFF状態を管理するマップ（id -> boolean）。トグル式
    // なので初期値はすべてOFF。
    this.switchStates = {};
    this.stage.switches.forEach(s => {
      this.switchStates[s.id] = false;
    });

    this.createSwitches();
    this.createBlocks();
    this.updateBlockStates(); // 初期状態を反映
  }

  createSwitches() {
    this.switchGroup = this.physics.add.staticGroup();
    this.switchSprites = {};

    this.stage.switches.forEach(s => {
      const rect = this.add.image(s.x, s.y, "switch_off").setDisplaySize(s.width, s.height);
      this.physics.add.existing(rect, true);
      rect.switchId = s.id;
      // 同じIDのスイッチは複数置ける（離れた場所から同じ仕掛けを切り替える）
      this.switchSprites[s.id] = [...(this.switchSprites[s.id] ?? []), rect];
      this.switchGroup.add(rect);
    });

    // プレイヤーがスイッチに接触したらトグルする。overlapは接触している
    // 間ずっと呼ばれ続けるため、同一フレームでの多重トグルを防ぐには
    // 「接触が始まった瞬間」だけ反応させる必要がある。ここでは直前に
    // 触れていたスイッチを記録し、離れるまで再トリガーしないことで
    // 対応する。
    this.overlappingSwitch = null;
    this.physics.add.overlap(this.player, this.switchGroup, (player, switchRect) => {
      if (this.overlappingSwitch === switchRect) return;
      this.overlappingSwitch = switchRect;
      this.toggleSwitch(switchRect.switchId);
    });
  }

  toggleSwitch(id) {
    this.switchStates[id] = !this.switchStates[id];
    playSe(this, "switch");
    this.time.delayedCall(120, () => playSe(this, "block"));
    this.switchSprites[id].forEach(sprite => sprite.setTexture(this.switchStates[id] ? "switch_on" : "switch_off"));
    this.updateBlockStates();
  }

  createBlocks() {
    this.blockGroup = this.physics.add.staticGroup();
    this.blockObjects = this.stage.blocks.map(b => {
      const rect = this.add.tileSprite(b.x, b.y, b.width, b.height, "tile_block");
      rect.setTileScale(STAGE_ART.scale, STAGE_ART.scale);
      this.physics.add.existing(rect, true);
      this.blockGroup.add(rect);
      return { def: b, sprite: rect };
    });

    this.physics.add.collider(this.player, this.blockGroup);
  }

  // 各ブロックのactiveWhen（"on" / "off"）と対応スイッチの現在状態を
  // 比較し、実体化すべきかどうかを判定して見た目・当たり判定を切り替える。
  updateBlockStates() {
    this.blockObjects.forEach(({ def, sprite }) => {
      const switchIsOn = this.switchStates[def.switchId];
      const shouldBeActive = def.activeWhen === "on" ? switchIsOn : !switchIsOn;
      sprite.setVisible(shouldBeActive);
      sprite.body.enable = shouldBeActive;
    });
  }

  update() {
    super.update();
    if (this.isGameOver) return;

    // 最後に触れたスイッチから離れたら、次に接触した瞬間に再トグルできるよう
    // リセットする。
    if (this.overlappingSwitch !== null && !this.physics.overlap(this.player, this.overlappingSwitch)) {
      this.overlappingSwitch = null;
    }
  }
}
