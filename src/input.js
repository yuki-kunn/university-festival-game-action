import { JUMP_INPUT } from "./config.js";

// ジャンプ入力の判定。
//  - 先行入力: 着地する少し前に押したジャンプも、着地した瞬間に出る
//  - 猶予時間（コヨーテタイム）: 足場から離れた直後や、接地判定が1フレーム外れた瞬間に押しても出る
// 接地判定は着地中でも1フレームだけ外れることがあり、その瞬間に押したジャンプが
// 捨てられていた（「移動の直後にジャンプが効かない」ことがあった）ため。
//
// 描画が遅くてフレーム間隔が猶予より長い場合でも、押したジャンプが次のフレームで必ず判定されるよう、
// 猶予は少なくとも2フレーム分（frameMs の2倍）は確保する。
export function shouldJump({ now, jumpPressedAt, lastGroundedAt, frameMs = 0 }, input = JUMP_INPUT) {
  const buffer = Math.max(input.bufferMs, frameMs * 2);
  const coyote = Math.max(input.coyoteMs, frameMs * 2);
  return now - jumpPressedAt <= buffer && now - lastGroundedAt <= coyote;
}

// 接地して見えるか（猶予時間内で、上昇中ではない）。アニメーションや空中ダッシュの判定に使う。
export function isGroundedRecently({ now, lastGroundedAt, velocityY, frameMs = 0 }, input = JUMP_INPUT) {
  return velocityY >= 0 && now - lastGroundedAt <= Math.max(input.coyoteMs, frameMs * 2);
}
