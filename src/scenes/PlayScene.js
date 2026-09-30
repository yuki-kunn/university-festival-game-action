import ActionSceneBase from "./ActionSceneBase.js";
import { STAGE1 } from "../stages/stage1.js";

// 主人公担当：横スクロールアクション。移動・ジャンプ・ダッシュ回避のみ
// を持つプラットフォーマー。攻撃要素はなし。共通ロジックは
// ActionSceneBaseを参照。
export default class PlayScene extends ActionSceneBase {
  constructor() {
    super("PlayScene");
  }

  getStageData() {
    return STAGE1;
  }
}
