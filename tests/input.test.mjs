// ジャンプ入力の判定（先行入力・猶予時間）のテスト。
import { JUMP_INPUT } from "../src/config.js";
import { isGroundedRecently, shouldJump } from "../src/input.js";

const failures = [];
const check = (name, cond) => {
  if (!cond) failures.push(name);
};
const { bufferMs, coyoteMs } = JUMP_INPUT;

// 接地中に押した（いつもの場合）
check("接地中に押すと跳べる", shouldJump({ now: 1000, jumpPressedAt: 1000, lastGroundedAt: 1000 }));
// 接地判定が1フレーム外れた瞬間に押した（約16ms前までは接地していた）
check("接地判定が1フレーム外れても跳べる", shouldJump({ now: 1000, jumpPressedAt: 1000, lastGroundedAt: 984 }));
// 足場から離れた直後に押した（コヨーテタイム内）
check("離れた直後（猶予内）なら跳べる", shouldJump({ now: 1000, jumpPressedAt: 1000, lastGroundedAt: 1000 - coyoteMs }));
check("離れてから猶予を過ぎたら跳べない", !shouldJump({ now: 1000, jumpPressedAt: 1000, lastGroundedAt: 1000 - coyoteMs - 1 }));
// 着地の少し前に押した（先行入力）
check("着地前に押した入力が、着地で出る", shouldJump({ now: 1000, jumpPressedAt: 1000 - bufferMs, lastGroundedAt: 1000 }));
check("先行入力の時間を過ぎたら出ない", !shouldJump({ now: 1000, jumpPressedAt: 1000 - bufferMs - 1, lastGroundedAt: 1000 }));
// 押していない / 消費済み
check("押していなければ跳ばない", !shouldJump({ now: 1000, jumpPressedAt: -Infinity, lastGroundedAt: 1000 }));
check("ジャンプ後は二重に跳ばない", !shouldJump({ now: 1000, jumpPressedAt: -Infinity, lastGroundedAt: -Infinity }));
check("ずっと空中なら跳べない", !shouldJump({ now: 5000, jumpPressedAt: 5000, lastGroundedAt: 1000 }));

// 描画が遅くてフレーム間隔が猶予より長い場合（押してから次のフレームまで170ms）
check("遅いフレームでも、押した次のフレームで跳べる", shouldJump({ now: 1170, jumpPressedAt: 1000, lastGroundedAt: 1170, frameMs: 170 }));
check("遅いフレームでも、2フレームを超えたら出ない", !shouldJump({ now: 1400, jumpPressedAt: 1000, lastGroundedAt: 1400, frameMs: 170 }));
check("遅いフレームでも、接地の猶予が足りなくならない", shouldJump({ now: 1170, jumpPressedAt: 1170, lastGroundedAt: 1000, frameMs: 170 }));

// 接地して見えるか
check("接地直後は地上扱い", isGroundedRecently({ now: 1000, lastGroundedAt: 1000, velocityY: 0 }));
check("1フレーム外れても地上扱い", isGroundedRecently({ now: 1000, lastGroundedAt: 984, velocityY: 0 }));
check("上昇中は地上扱いにしない", !isGroundedRecently({ now: 1000, lastGroundedAt: 1000, velocityY: -200 }));
check("猶予を過ぎたら空中扱い", !isGroundedRecently({ now: 1000, lastGroundedAt: 1000 - coyoteMs - 1, velocityY: 100 }));

if (failures.length) {
  console.error(`ジャンプ入力テスト: ${failures.length} 件失敗`);
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log("ジャンプ入力テスト: すべて成功");
