// ニコのスコアと、1回のプレイ（全ステージ通し）の記録。
//
// スコア = コイン数 × 100 + 時間ボーナス。時間ボーナスは「ステージごとの目標時間より早いぶん × 5点」で、
// 時間よりコインの比重を大きくしてある（時間ボーナスの最大は、そのステージの全コインの点数より十分小さい）。
export const SCORE = {
  coinPoints: 100,
  timePointsPerSec: 5,
  // ステージごとの目標時間（秒）。これより早くクリアするとボーナスが付く（ステージ1・2・3の順）
  parSecByStage: [40, 55, 65]
};

// 1ステージぶんのスコア。timeMs はステージ開始からクリアまでの時間。
export function stageScore({ coins, timeMs, stageIndex }) {
  const parSec = SCORE.parSecByStage[stageIndex] ?? SCORE.parSecByStage[SCORE.parSecByStage.length - 1];
  const coinPoints = coins * SCORE.coinPoints;
  const timeBonus = Math.max(0, Math.round((parSec - timeMs / 1000) * SCORE.timePointsPerSec));
  return { coinPoints, timeBonus, total: coinPoints + timeBonus };
}

// 全ステージの合計。stages は { stageIndex, coins, totalCoins, timeMs } の配列。
export function runScore(stages) {
  const parts = stages.map(s => ({ ...s, ...stageScore(s) }));
  return {
    parts,
    coins: stages.reduce((sum, s) => sum + s.coins, 0),
    totalCoins: stages.reduce((sum, s) => sum + s.totalCoins, 0),
    timeMs: stages.reduce((sum, s) => sum + s.timeMs, 0),
    total: parts.reduce((sum, p) => sum + p.total, 0)
  };
}

// クリア時間の表示。1分未満は「18.3秒」、1分以上は「1分05.3秒」。
export function formatTime(ms) {
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}秒`;
  const m = Math.floor(sec / 60);
  return `${m}分${(sec - m * 60).toFixed(1).padStart(4, "0")}秒`;
}

// ---- プレイ中の記録（ゲーム全体の registry に持つ） ----
const RUN_KEY = "nikoRun";

export function resetNikoRun(game) {
  game.registry.set(RUN_KEY, { stages: [] });
}

export function addNikoStageResult(game, result) {
  const run = game.registry.get(RUN_KEY) ?? { stages: [] };
  run.stages = [...run.stages.filter(s => s.stageIndex !== result.stageIndex), result];
  game.registry.set(RUN_KEY, run);
  return run;
}

export function getNikoRun(game) {
  return game.registry.get(RUN_KEY) ?? { stages: [] };
}
