// ニコのランキング。この端末（ブラウザの localStorage）に保存する。展示PCで遊んでもらう想定。
// 保存先（storage）を引数で差し替えられるので、サーバー側の共有ランキングにする場合も、
// このモジュールの load / add の中身を差し替えるだけで済む。
export const RANKING = {
  storageKey: "alibi-action-niko-ranking",
  maxEntries: 10, // 表示・保存する件数
  nameMaxLength: 8,
  defaultName: "ななし"
};

function defaultStorage() {
  try {
    return window.localStorage;
  } catch {
    return null; // プライベートモード等で使えない場合は、保存しない
  }
}

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

function isEntry(e) {
  return e && typeof e.name === "string" && Number.isFinite(e.score) && Number.isFinite(e.timeMs) && Number.isFinite(e.at);
}

export function loadRanking(storage = defaultStorage()) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(RANKING.storageKey) ?? "[]");
    return Array.isArray(parsed) ? sortRanking(parsed.filter(isEntry)).slice(0, RANKING.maxEntries) : [];
  } catch {
    return []; // 壊れたデータは無視する
  }
}

// いまのスコアを登録した場合の順位（1始まり。圏外なら null）。登録前の予告表示に使う。
export function previewRank(entry, storage = defaultStorage()) {
  const sorted = sortRanking([...loadRanking(storage), { ...entry, at: Number.MAX_SAFE_INTEGER }]);
  const index = sorted.findIndex(e => e.at === Number.MAX_SAFE_INTEGER);
  return index < RANKING.maxEntries ? index + 1 : null;
}

// ランキングに登録する。entry は { name, score, coins, timeMs }。登録後の一覧と、順位（圏外なら null）を返す。
export function addRanking(entry, storage = defaultStorage(), now = Date.now()) {
  const record = {
    name: normalizeName(entry.name),
    score: Math.round(entry.score),
    coins: entry.coins,
    timeMs: Math.round(entry.timeMs),
    at: now
  };
  const ranking = sortRanking([...loadRanking(storage), record]).slice(0, RANKING.maxEntries);
  if (storage) {
    try {
      storage.setItem(RANKING.storageKey, JSON.stringify(ranking));
    } catch {
      // 保存できない環境では、今回の表示だけにする
    }
  }
  const index = ranking.indexOf(record);
  return { ranking, rank: index >= 0 ? index + 1 : null, record };
}
