import { SCORE } from "./score.js";
import { STAGES } from "./stages/index.js";

// ランキングの共通ロジック（クライアントとサーバー（functions/api/ranking.js）で同じものを使う）。
// ブラウザ・Cloudflare Workers のどちらでも動くよう、DOM や localStorage には依存しない。
export const RANKING = {
  storageKey: "alibi-action-niko-ranking", // 端末のローカル保存（共有が使えないときの代替）
  maxEntries: 10, // 表示する件数
  serverMaxEntries: 100, // サーバーに残す件数
  nameMaxLength: 8,
  defaultName: "ななし",
  duplicateWindowMs: 10000 // 同じ記録がこの時間内に再送されたら、二重登録とみなす
};

// 名前を整える（前後の空白・制御文字を除き、8文字まで。空なら「ななし」）。
export function normalizeName(name) {
  const cleaned = String(name ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  const chars = Array.from(cleaned).slice(0, RANKING.nameMaxLength).join("");
  return chars === "" ? RANKING.defaultName : chars;
}

// スコアの高い順。同点はクリア時間が短い順、それも同じなら先に登録した順。
export function sortRanking(entries) {
  return [...entries].sort((a, b) => b.score - a.score || a.timeMs - b.timeMs || a.at - b.at);
}

export function isEntry(e) {
  return e && typeof e.name === "string" && Number.isFinite(e.score) && Number.isFinite(e.timeMs) && Number.isFinite(e.at);
}

// ステージのデータから決まる、記録として有り得る範囲。範囲外の送信（改ざん）を断るために使う。
export function scoreLimits() {
  const totalCoins = STAGES.niko.reduce((sum, stage) => sum + stage.coins.length, 0);
  const maxTimeBonus = SCORE.parSecByStage.reduce((sum, par) => sum + par * SCORE.timePointsPerSec, 0);
  return {
    totalCoins,
    maxTimeBonus,
    minTimeMs: 10000, // 全ステージの合計。これより速い記録は有り得ない
    maxTimeMs: 6 * 60 * 60 * 1000
  };
}

// 登録の要求を検証して、保存する形に整える。{ ok: true, entry } か { ok: false, error }。
export function validateSubmission(raw) {
  if (!raw || typeof raw !== "object") return { ok: false, error: "invalid-body" };
  const { totalCoins, maxTimeBonus, minTimeMs, maxTimeMs } = scoreLimits();
  const { score, coins, timeMs } = raw;
  if (![score, coins, timeMs].every(Number.isInteger)) return { ok: false, error: "invalid-number" };
  if (coins < 0 || coins > totalCoins) return { ok: false, error: "invalid-coins" };
  if (timeMs < minTimeMs || timeMs > maxTimeMs) return { ok: false, error: "invalid-time" };
  // スコア = コイン×点数 + 時間ボーナス（0〜最大）。この範囲に収まらないスコアは有り得ない
  const base = coins * SCORE.coinPoints;
  if (score < base || score > base + maxTimeBonus) return { ok: false, error: "invalid-score" };
  return { ok: true, entry: { name: normalizeName(raw.name), score, coins, timeMs } };
}

// 一覧に記録を加える。同じ記録が短時間に再送された場合は加えない（duplicate）。
export function mergeRanking(list, entry, now, max = RANKING.serverMaxEntries) {
  const duplicate = list.find(
    e => e.name === entry.name && e.score === entry.score && e.coins === entry.coins && e.timeMs === entry.timeMs && now - e.at <= RANKING.duplicateWindowMs
  );
  if (duplicate) return { ranking: sortRanking(list).slice(0, max), record: duplicate, duplicate: true };
  const record = { ...entry, at: now };
  return { ranking: sortRanking([...list, record]).slice(0, max), record, duplicate: false };
}

// record の順位（1始まり）。表示件数（maxEntries）の外なら null。
export function rankOf(ranking, record) {
  const index = ranking.findIndex(e => e.at === record.at && e.name === record.name && e.score === record.score);
  return index >= 0 && index < RANKING.maxEntries ? index + 1 : null;
}

// いま登録した場合の順位の予告（保存はしない）。
export function previewRankIn(list, entry) {
  const mark = Number.MAX_SAFE_INTEGER;
  const sorted = sortRanking([...list, { ...entry, at: mark }]);
  const index = sorted.findIndex(e => e.at === mark);
  return index < RANKING.maxEntries ? index + 1 : null;
}
