// ニコのスコア計算とランキングのテスト。
import { SCORE, runScore, stageScore } from "../src/score.js";
import { RANKING, addRanking, loadRanking, normalizeName, previewRank, sortRanking } from "../src/ranking.js";
import { STAGES } from "../src/stages/index.js";

const failures = [];
const check = (name, cond) => {
  if (!cond) failures.push(name);
};

// ---- スコア ----
const par1 = SCORE.parSecByStage[0];
check("コイン1枚は100点", stageScore({ coins: 1, timeMs: 999999, stageIndex: 0 }).total === 100);
check("目標時間ちょうどなら時間ボーナスなし", stageScore({ coins: 0, timeMs: par1 * 1000, stageIndex: 0 }).timeBonus === 0);
check("目標より10秒早いと50点", stageScore({ coins: 0, timeMs: (par1 - 10) * 1000, stageIndex: 0 }).timeBonus === 50);
check("遅くても時間ボーナスはマイナスにならない", stageScore({ coins: 3, timeMs: 10 * 60 * 1000, stageIndex: 1 }).timeBonus === 0);
check("同じコイン数なら、早いほどスコアが高い", stageScore({ coins: 5, timeMs: 20000, stageIndex: 0 }).total > stageScore({ coins: 5, timeMs: 30000, stageIndex: 0 }).total);

// 「時間 < コイン」: 時間ボーナスの最大値は、そのステージの全コインの点数よりずっと小さい
STAGES.niko.forEach((stage, i) => {
  const maxBonus = stageScore({ coins: 0, timeMs: 0, stageIndex: i }).timeBonus;
  const allCoins = stage.coins.length * SCORE.coinPoints;
  check(`ステージ${i + 1}: 時間ボーナスの最大(${maxBonus})が全コイン(${allCoins})の3割未満`, maxBonus < allCoins * 0.3);
  check(`ステージ${i + 1}: コインを1枚多く取る価値が、時間ボーナス10秒分より大きい`, SCORE.coinPoints > 10 * SCORE.timePointsPerSec);
});
check("目標時間がステージ数ぶんある", SCORE.parSecByStage.length === STAGES.niko.length);

const run = runScore([
  { stageIndex: 0, coins: 10, totalCoins: 12, timeMs: 30000 },
  { stageIndex: 1, coins: 20, totalCoins: 43, timeMs: 50000 }
]);
check("合計: コイン数", run.coins === 30 && run.totalCoins === 55);
check("合計: 時間", run.timeMs === 80000);
check("合計: スコアは各ステージの合計", run.total === run.parts.reduce((s, p) => s + p.total, 0) && run.total === 10 * 100 + 50 + 20 * 100 + 25);

// ---- ランキング ----
const memory = () => {
  const data = new Map();
  return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), data };
};
const entry = (name, score, timeMs = 60000) => ({ name, score, coins: 1, timeMs });

check("名前: 前後の空白を除く", normalizeName("  太郎  ") === "太郎");
check("名前: 8文字まで", normalizeName("あいうえおかきくけこ") === "あいうえおかきく");
check("名前: 絵文字も1文字として数える", normalizeName("😀😀😀😀😀😀😀😀😀😀") === "😀😀😀😀😀😀😀😀");
check("名前: 空なら『ななし』", normalizeName("   ") === RANKING.defaultName && normalizeName(undefined) === RANKING.defaultName);
check("名前: 制御文字を除く", normalizeName("a\u0000b\nc") === "abc");

const s1 = memory();
check("登録前は空", loadRanking(s1).length === 0);
const r1 = addRanking(entry("A", 1000), s1, 1);
check("1件目は1位", r1.rank === 1);
const r2 = addRanking(entry("B", 3000), s1, 2);
check("高いスコアは1位に入る", r2.rank === 1 && r2.ranking[0].name === "B" && r2.ranking[1].name === "A");
const r3 = addRanking(entry("C", 2000), s1, 3);
check("中間は2位", r3.rank === 2);
check("保存して読み直せる", loadRanking(s1).map(e => e.name).join() === "B,C,A");

// 同点はクリア時間が短い順、それも同じなら先に登録した順
const tie = sortRanking([
  { name: "遅い", score: 100, timeMs: 90000, at: 1 },
  { name: "速い", score: 100, timeMs: 50000, at: 2 },
  { name: "先", score: 100, timeMs: 50000, at: 1 }
]);
check("同点は時間の短い順、同じなら先着", tie.map(e => e.name).join() === "先,速い,遅い");

// 上位10件まで
const s2 = memory();
for (let i = 1; i <= 12; i++) addRanking(entry(`P${i}`, i * 100), s2, i);
check("10件までしか残らない", loadRanking(s2).length === RANKING.maxEntries);
check("最下位（100点・200点）は押し出される", !loadRanking(s2).some(e => e.name === "P1" || e.name === "P2"));
check("圏外のスコアは順位なし", addRanking(entry("低", 50), s2, 99).rank === null);
check("圏外は一覧に入らない", !loadRanking(s2).some(e => e.name === "低"));
check("予告: 上位に入るスコアは順位が出る", previewRank({ score: 5000, timeMs: 1000 }, s2) === 1);
check("予告: 圏外は null", previewRank({ score: 10, timeMs: 1000 }, s2) === null);
check("予告しても保存はされない", loadRanking(s2).length === RANKING.maxEntries && !loadRanking(s2).some(e => e.score === 5000));

// 壊れた保存データ・保存できない環境
const broken = memory();
broken.setItem(RANKING.storageKey, "{not json");
check("壊れたデータは空として扱う", loadRanking(broken).length === 0);
broken.setItem(RANKING.storageKey, JSON.stringify([{ name: "x" }, { name: "ok", score: 1, timeMs: 1, at: 1 }]));
check("形の合わない項目は無視する", loadRanking(broken).length === 1);
check("storage が無くても動く（保存はしない）", addRanking(entry("Z", 1), null, 1).rank === 1);
const full = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
check("保存に失敗しても例外にならない", addRanking(entry("Q", 1), full, 1).rank === 1);

if (failures.length) {
  console.error(`スコア・ランキングのテスト: ${failures.length} 件失敗`);
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log("スコア・ランキングのテスト: すべて成功");
