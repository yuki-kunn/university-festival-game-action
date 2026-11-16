// ニコのランキング API（Cloudflare Pages Functions）。
//   GET  /api/ranking … 上位10件
//   POST /api/ranking … 記録を登録（{ name, score, coins, timeMs }）
// 保存は KV（バインディング名 RANKING）。バインディングが無い間は 503 を返し、
// クライアントは端末のローカル保存に切り替える。
import { RANKING, isEntry, mergeRanking, rankOf, sortRanking, validateSubmission } from "../../src/rankingCore.js";

const KEY = "ranking:niko";
const MAX_BODY_BYTES = 2048;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

async function load(kv) {
  try {
    const stored = JSON.parse((await kv.get(KEY)) ?? "[]");
    return Array.isArray(stored) ? sortRanking(stored.filter(isEntry)) : [];
  } catch {
    return []; // 壊れたデータは空として扱う
  }
}

export async function onRequestGet({ env }) {
  if (!env.RANKING) return json({ error: "ranking-unavailable" }, 503);
  const list = await load(env.RANKING);
  return json({ ranking: list.slice(0, RANKING.maxEntries) });
}

export async function onRequestPost({ request, env }) {
  if (!env.RANKING) return json({ error: "ranking-unavailable" }, 503);

  // 別のサイトからの送信は断る（同じサイトからの送信は Origin が一致する）
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: "forbidden-origin" }, 403);

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: "too-large" }, 413);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "invalid-json" }, 400);
  }

  const checked = validateSubmission(body);
  if (!checked.ok) return json({ error: checked.error }, 400);

  const list = await load(env.RANKING);
  const merged = mergeRanking(list, checked.entry, Date.now());
  if (!merged.duplicate) await env.RANKING.put(KEY, JSON.stringify(merged.ranking));
  return json({
    ranking: merged.ranking.slice(0, RANKING.maxEntries),
    rank: rankOf(merged.ranking, merged.record),
    record: merged.record,
    duplicate: merged.duplicate
  });
}
