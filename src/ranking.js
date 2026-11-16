import { RANKING, isEntry, normalizeName, previewRankIn, rankOf, sortRanking } from "./rankingCore.js";

// ニコのランキング（クライアント側）。
// 共有ランキング（サーバー: functions/api/ranking.js）を第一に使い、通信できない・サーバー側が
// 未設定のときは、この端末（ブラウザの localStorage）に保存する。
export { RANKING, normalizeName, sortRanking };

const API_URL = "/api/ranking";

// ---- 共有ランキング（サーバー） ----

// 上位10件を取得する。取得できなければ null（呼び出し側がローカルに切り替える）。
export async function fetchSharedRanking({ fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  try {
    const res = await fetchImpl(API_URL, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.ranking)) return null;
    return sortRanking(data.ranking.filter(isEntry)).slice(0, RANKING.maxEntries);
  } catch {
    return null; // 通信エラー・タイムアウト・JSONでない応答（サーバー側が未設定など）
  }
}

// 記録を登録する。成功したら { ranking, rank, record }、失敗したら null。
export async function submitSharedRanking(entry, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  try {
    const res = await fetchImpl(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: normalizeName(entry.name), score: entry.score, coins: entry.coins, timeMs: entry.timeMs }),
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.ranking) || !isEntry(data.record)) return null;
    return {
      ranking: sortRanking(data.ranking.filter(isEntry)).slice(0, RANKING.maxEntries),
      rank: Number.isInteger(data.rank) ? data.rank : null,
      record: data.record
    };
  } catch {
    return null;
  }
}

// ---- この端末のローカル保存（共有が使えないときの代替） ----

function defaultStorage() {
  try {
    return window.localStorage;
  } catch {
    return null; // プライベートモード等で使えない場合は、保存しない
  }
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

// いまの記録を登録した場合の順位（1始まり。圏外なら null）。ローカルの一覧が対象。
export function previewRank(entry, storage = defaultStorage()) {
  return previewRankIn(loadRanking(storage), entry);
}

// ローカルに登録する。entry は { name, score, coins, timeMs }。登録後の一覧と順位（圏外なら null）を返す。
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

export { previewRankIn, rankOf };
