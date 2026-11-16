// ランキング API（functions/api/ranking.js）の確認。KV は Map で模擬する。
import assert from "node:assert/strict";
import { onRequestGet, onRequestPost } from "../functions/api/ranking.js";
import { scoreLimits, RANKING } from "../src/rankingCore.js";

const makeKv = () => {
  const m = new Map();
  return { get: async k => m.get(k) ?? null, put: async (k, v) => void m.set(k, v), raw: m };
};
const post = (env, body, headers = {}) =>
  onRequestPost({ env, request: new Request("https://example.test/api/ranking", { method: "POST", headers: { origin: "https://example.test", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) }) });
const get = env => onRequestGet({ env });
const valid = (o = {}) => ({ name: "テスト", score: 1000, coins: 10, timeMs: 60000, ...o });

// KV 未設定 → 503（クライアントは端末保存に切り替える）
assert.equal((await get({})).status, 503);
assert.equal((await post({}, valid())).status, 503);

const env = { RANKING: makeKv() };
assert.deepEqual((await (await get(env)).json()).ranking, []);

// 登録 → 順位と記録が返る
let r = await post(env, valid());
assert.equal(r.status, 200);
let body = await r.json();
assert.equal(body.rank, 1);
assert.equal(body.ranking.length, 1);
assert.equal(body.duplicate, false);

// 同じ内容の連続送信は重複として扱い、増えない
body = await (await post(env, valid())).json();
assert.equal(body.duplicate, true);
assert.equal((await (await get(env)).json()).ranking.length, 1);

// 高いスコアは上位に入る
body = await (await post(env, valid({ name: "上位", score: 1500, coins: 14, timeMs: 50000 }))).json();
assert.equal(body.rank, 1);

// 不正な入力は 400
for (const bad of [
  valid({ score: "999" }), valid({ coins: -1 }), valid({ coins: scoreLimits().totalCoins + 1 }),
  valid({ timeMs: 1 }), valid({ score: 99999999 }), valid({ coins: 10, score: 5 }), null, [], "x"
]) {
  const res = await post(env, bad);
  assert.equal(res.status, 400, `不正な入力が通った: ${JSON.stringify(bad)}`);
}
assert.equal((await post(env, "{not json")).status, 400);

// 別サイトからは 403、大きすぎる本文は 413
assert.equal((await post(env, valid({ name: "x" }), { origin: "https://evil.test" })).status, 403);
assert.equal((await post(env, "a".repeat(5000))).status, 413);

// 名前は長さを切り詰める
body = await (await post(env, valid({ name: "あ".repeat(30), score: 1200, coins: 12, timeMs: 61000 }))).json();
assert.ok(body.record.name.length <= RANKING.nameMaxLength);

// 取得は上位10件まで、保存は上位100件まで
for (let i = 0; i < 120; i++) await post(env, valid({ name: `p${i}`, score: 100 + i, coins: 1, timeMs: 20000 + i * 1000 }));
assert.equal((await (await get(env)).json()).ranking.length, RANKING.maxEntries);
assert.ok(JSON.parse(env.RANKING.raw.get("ranking:niko")).length <= RANKING.serverMaxEntries);

// 壊れた保存データでも落ちない
const broken = { RANKING: makeKv() };
broken.RANKING.raw.set("ranking:niko", "{oops");
assert.deepEqual((await (await get(broken)).json()).ranking, []);

console.log("ランキングAPIのテスト: すべて成功");
