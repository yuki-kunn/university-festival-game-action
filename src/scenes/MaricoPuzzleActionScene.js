import ActionSceneBase from "./ActionSceneBase.js";
import { COLORS } from "../config.js";
import { MARICO_STAGE1 } from "../stages/maricoStage1.js";

// マリコ担当：パズル×アクション。既存の横スクロールアクション（移動・
// ジャンプ・ダッシュ回避）に、スイッチ・ブロックによるパズル要素を
// 追加する。スイッチは接触式・トグル型で、1つのスイッチが複数の
// ブロックを一括で切り替える。ブロックはスイッチON時に実体化する
// タイプ（穴をふさぐ「橋」）と、OFF時に実体化するタイプ（道を塞ぐ
// 「壁」）の両方を持てる。
const SWITCH_COLOR_OFF = 0x6a5f48;
const SWITCH_COLOR_ON = 0x8cf0c0;
const BLOCK_COLOR = 0x9c7ad6;

export default class MaricoPuzzleActionScene extends ActionSceneBase {
  constructor() {
    super("MaricoPuzzleActionScene");
  }

  getStageData() {
    return MARICO_STAGE1;
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
      const rect = this.add.rectangle(s.x, s.y, s.width, s.height, SWITCH_COLOR_OFF);
      rect.setStrokeStyle(2, COLORS.accentSoft);
      this.physics.add.existing(rect, true);
      rect.switchId = s.id;
      this.switchSprites[s.id] = rect;
      this.switchGroup.add(rect);
    });

    // プレイヤーがスイッチに接触したらトグルする。overlapは接触している
    // 間ずっと呼ばれ続けるため、同一フレームでの多重トグルを防ぐには
    // 「接触が始まった瞬間」だけ反応させる必要がある。ここでは直前に
    // 触れていたスイッチIDを記録し、離れるまで再トリガーしないことで
    // 対応する。
    this.overlappingSwitchId = null;
    this.physics.add.overlap(this.player, this.switchGroup, (player, switchRect) => {
      if (this.overlappingSwitchId === switchRect.switchId) return;
      this.overlappingSwitchId = switchRect.switchId;
      this.toggleSwitch(switchRect.switchId);
    });
  }

  toggleSwitch(id) {
    this.switchStates[id] = !this.switchStates[id];
    this.switchSprites[id].setFillStyle(this.switchStates[id] ? SWITCH_COLOR_ON : SWITCH_COLOR_OFF);
    this.updateBlockStates();
  }

  createBlocks() {
    this.blockGroup = this.physics.add.staticGroup();
    this.blockObjects = this.stage.blocks.map(b => {
      const rect = this.add.rectangle(b.x, b.y, b.width, b.height, BLOCK_COLOR);
      rect.setStrokeStyle(2, COLORS.accent);
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

    // プレイヤーがどのスイッチとも重なっていなければ、次に接触した
    // 瞬間に再トグルできるようリセットする。
    if (this.overlappingSwitchId !== null) {
      const stillOverlapping = this.physics.overlap(this.player, this.switchGroup);
      if (!stillOverlapping) {
        this.overlappingSwitchId = null;
      }
    }
  }
}
