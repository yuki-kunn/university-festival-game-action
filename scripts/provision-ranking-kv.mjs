// ランキング用の KV ネームスペースを用意し、Pages プロジェクトの RANKING バインディングに結びつける。
// 何度実行しても同じ結果になる（既にあれば作り直さない）。CI のデプロイ前に実行する。
// 必要な環境変数: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, PAGES_PROJECT
// トークンに KV の編集権限が無いときは、手動設定の手順を警告として出して正常終了する
// （ランキングは端末保存に切り替わるだけで、ゲーム自体は動く）。
const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account, PAGES_PROJECT: project } = process.env;
if (!token || !account || !project) {
  console.log("::notice::Cloudflare の認証情報が無いため、KV の準備をスキップしました");
  process.exit(0);
}

const API = `https://api.cloudflare.com/client/v4/accounts/${account}`;
const NAMES = { production: "alibi-action-ranking", preview: "alibi-action-ranking-preview" };

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const err = new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data.errors ?? data)}`);
    err.status = res.status;
    throw err;
  }
  return data.result;
}

async function ensureNamespace(title) {
  for (let page = 1; ; page++) {
    const list = await call("GET", `/storage/kv/namespaces?per_page=100&page=${page}`);
    const found = list.find(n => n.title === title);
    if (found) return found.id;
    if (list.length < 100) break;
  }
  return (await call("POST", "/storage/kv/namespaces", { title })).id;
}

try {
  const ids = {};
  for (const [env, title] of Object.entries(NAMES)) ids[env] = await ensureNamespace(title);
  await call("PATCH", `/pages/projects/${project}`, {
    deployment_configs: {
      production: { kv_namespaces: { RANKING: { namespace_id: ids.production } } },
      preview: { kv_namespaces: { RANKING: { namespace_id: ids.preview } } }
    }
  });
  console.log(`KV を準備しました（production: ${ids.production}, preview: ${ids.preview}）`);
} catch (e) {
  console.log(`::warning::ランキング用 KV を自動設定できませんでした: ${e.message}`);
  console.log(
    "::warning::API トークンに「Workers KV Storage: 編集」と「Cloudflare Pages: 編集」の権限を付けるか、" +
      "ダッシュボードの Pages → 設定 → バインディング で KV 名前空間を変数名 RANKING で追加してください（未設定の間、ランキングは端末ごとの保存になります）"
  );
}
