// ステージデータの検証。ブラウザを使わず、物理定数（重力・移動速度・ジャンプ力・ダッシュ）
// から「ゴールに到達できるか」「コインが取れるか」「マリコのパズルが解けるか」を計算する。
// ジャンプの到達距離は安全側（0.85倍）に見積もる。
import { CHARACTERS, DASH, GRAVITY } from "../src/config.js";
import { STAGES } from "../src/stages/index.js";

const PLAYER_W = 36;
const MARGIN = 0.85; // 操作の余裕。理論上の到達距離のうち、現実的に使える割合
const BODY_OVERHANG = PLAYER_W - 2; // 足場の端に体の半分まで乗って踏み切り・着地できる分（両端で約34px）
const WALL_MIN_HEIGHT = 100; // これ以上の高さのブロックは「壁」（跳び越せない）として扱う

const failures = [];
const fail = (msg) => failures.push(msg);

// 同じ高さに着地するまでの水平移動距離を、ゲームと同じ積分でシミュレートする。
// dashTimes はジャンプ開始からのダッシュ開始時刻（秒）。
function simulateFlat(chara, dashTimes) {
  const dt = 1 / 60;
  const dashSec = DASH.durationMs / 1000;
  let x = 0, y = 0, vy = -chara.jumpPower, t = 0, dashLeft = 0, i = 0;
  for (;;) {
    if (i < dashTimes.length && dashLeft <= 0 && t >= dashTimes[i]) {
      dashLeft = dashSec;
      vy = 0;
      i++;
    }
    let vx = chara.moveSpeed;
    if (dashLeft > 0) {
      vx = DASH.speed;
      dashLeft -= dt;
    } else {
      vy += GRAVITY * dt;
    }
    x += vx * dt;
    y += vy * dt;
    t += dt;
    if (y >= 0 && t > 0.1) return x;
  }
}

// ダッシュ1回で稼げる最大の追加距離（もっとも有利なタイミング）。空中ダッシュは着地までに1回だけという
// ゲームのルール（ActionSceneBase.tryDash）が前提で、2回目以降は考えない。
const dashBonusCache = new Map();
function maxDashBonus(chara) {
  if (!dashBonusCache.has(chara.id)) {
    const base = simulateFlat(chara, []);
    let best = base;
    for (let t = 0.03; t < 1.2; t += 0.02) best = Math.max(best, simulateFlat(chara, [t]));
    dashBonusCache.set(chara.id, best - base);
  }
  return dashBonusCache.get(chara.id);
}

function apexOf(chara) {
  return (chara.jumpPower * chara.jumpPower) / (2 * GRAVITY);
}

// 足場の上面を基準に、rise（正=上り）だけ高い足場へ跳んだときの最大水平距離（理論値）
function rawReach(chara, rise) {
  const apex = apexOf(chara);
  if (rise > apex - 8) return -1;
  const t = chara.jumpPower / GRAVITY + Math.sqrt((2 * (apex - rise)) / GRAVITY);
  return chara.moveSpeed * t;
}

// 見積もりモード:
//   safe    … 想定ルートが「普通に操作して」成立するかの確認（余裕として0.85倍し、体の乗り代も見ない）
//   max     … 熟練者が最大限に狙った場合（バイパス可否の確認。余裕なし・体の乗り代あり）
// dash が true のとき、最も有利なタイミングでダッシュ1回分を足す。
function allowedGap(chara, rise, mode, dash) {
  const raw = rawReach(chara, rise);
  if (raw < 0) return -1;
  if (mode === "safe") return (raw + (dash ? maxDashBonus(chara) : 0)) * MARGIN;
  return raw + BODY_OVERHANG + (dash ? maxDashBonus(chara) : 0);
}

function canJump(chara, from, to, mode, dash) {
  const gap = Math.max(0, to.x0 - from.x1, from.x0 - to.x1);
  return gap <= allowedGap(chara, from.top - to.top, mode, dash);
}

// スイッチ状態(mask)ごとの、立てる区間（足場の上面）の一覧を作る
function buildNodes(stage, chara, mask, switchIds) {
  const isOn = (id) => Boolean(mask & (1 << switchIds.indexOf(id)));
  const rects = [...stage.platforms.map((p) => ({ ...p, kind: "floor" }))];
  const walls = [];
  for (const b of stage.blocks ?? []) {
    const active = b.activeWhen === "on" ? isOn(b.switchId) : !isOn(b.switchId);
    if (!active) continue;
    if (b.height >= WALL_MIN_HEIGHT) walls.push(b);
    else rects.push({ ...b, kind: "bridge" });
  }
  const apex = apexOf(chara);

  // 同じ高さで接する足場をつなぐ
  const byTop = new Map();
  for (const r of rects) {
    const top = r.y - r.height / 2;
    if (!byTop.has(top)) byTop.set(top, []);
    byTop.get(top).push([r.x - r.width / 2, r.x + r.width / 2]);
  }
  const nodes = [];
  for (const [top, spans] of byTop) {
    spans.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const [x0, x1] of spans) {
      const last = merged[merged.length - 1];
      if (last && x0 <= last[1] + 1) last[1] = Math.max(last[1], x1);
      else merged.push([x0, x1]);
    }
    for (let [x0, x1] of merged) {
      // 壁で区間を分割する（壁の上端が足場より apex 近く高い＝跳び越せない）
      let pieces = [[x0, x1]];
      for (const w of walls) {
        const wTop = w.y - w.height / 2;
        const wBottom = w.y + w.height / 2;
        const blocks = wBottom >= top - 1 && top - wTop > apex - 5;
        if (!blocks) continue;
        const wx0 = w.x - w.width / 2;
        const wx1 = w.x + w.width / 2;
        pieces = pieces.flatMap(([a, b]) => {
          if (wx1 <= a || wx0 >= b) return [[a, b]];
          const out = [];
          if (wx0 > a) out.push([a, wx0]);
          if (wx1 < b) out.push([wx1, b]);
          return out;
        });
      }
      for (const [a, b] of pieces) if (b - a > 1) nodes.push({ top, x0: a, x1: b });
    }
  }
  return nodes;
}

function nodeAt(nodes, x, top) {
  return nodes.find((n) => n.top === top && x >= n.x0 - 1 && x <= n.x1 + 1) ?? null;
}

// 到達可能性の探索。switchIdsは存在するスイッチIDの一覧、マリコ以外は空。
function solve(stage, chara, mode, dash, allowSwitch = true) {
  const switches = stage.switches ?? [];
  const switchIds = [...new Set(switches.map((s) => s.id))];
  const goal = {
    top: stage.goal.y + stage.goal.height / 2,
    x0: stage.goal.x - stage.goal.width / 2 - PLAYER_W / 2,
    x1: stage.goal.x + stage.goal.width / 2 + PLAYER_W / 2
  };
  const startNodes = buildNodes(stage, chara, 0, switchIds);
  const below = startNodes
    .filter((n) => stage.playerStart.x >= n.x0 && stage.playerStart.x <= n.x1 && n.top >= stage.playerStart.y)
    .sort((a, b) => a.top - b.top)[0];
  if (!below) return { ok: false, reason: "開始位置の下に足場がない" };

  const key = (m, n) => `${m}|${n.top}|${Math.round(n.x0)}|${Math.round(n.x1)}`;
  const seen = new Set([key(0, below)]);
  const queue = [{ mask: 0, node: below }];
  const cache = new Map();
  const nodesFor = (m) => {
    if (!cache.has(m)) cache.set(m, buildNodes(stage, chara, m, switchIds));
    return cache.get(m);
  };

  while (queue.length) {
    const { mask, node } = queue.shift();
    // ゴールの扉（高さ80）に触れられるか。扉は足場より少し高くても下部に触れられる
    {
      const gap = Math.max(0, goal.x0 - node.x1, node.x0 - goal.x1);
      const rise = Math.max(0, node.top - goal.top - 30);
      const reach = allowedGap(chara, rise, mode, dash);
      if (reach >= 0 && gap <= reach) return { ok: true };
    }
    // ジャンプで別の足場へ
    for (const to of nodesFor(mask)) {
      if (to === node) continue;
      if (canJump(chara, node, to, mode, dash)) {
        const k = key(mask, to);
        if (!seen.has(k)) {
          seen.add(k);
          queue.push({ mask, node: to });
        }
      }
    }
    // スイッチを踏んで状態を切り替える（同じ高さの足場の上にあるスイッチだけ）
    for (const sw of allowSwitch ? switches : []) {
      const swBottom = sw.y + sw.height / 2;
      if (Math.abs(swBottom - node.top) > 8) continue;
      if (sw.x < node.x0 - 18 || sw.x > node.x1 + 18) continue;
      const nextMask = mask ^ (1 << switchIds.indexOf(sw.id));
      const next = nodeAt(nodesFor(nextMask), sw.x, node.top);
      if (!next) continue; // 足場ごと消えて落下する切り替えは使えない
      const k = key(nextMask, next);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push({ mask: nextMask, node: next });
      }
    }
  }
  return { ok: false, reason: "ゴールに到達できない" };
}

// コインが「どこかの足場から取れる高さ・距離」にあるか
function checkCoins(stage, chara, label) {
  if (!stage.coins) return;
  const apex = apexOf(chara);
  const nodes = buildNodes(stage, chara, 0, []);
  const reachX = chara.moveSpeed * 0.6;
  for (const c of stage.coins) {
    const ok = nodes.some((n) => {
      const dx = Math.max(0, n.x0 - c.x, c.x - n.x1);
      const h = n.top - c.y;
      return dx <= reachX && h >= 8 && h <= apex + 28;
    });
    if (!ok) fail(`${label}: コイン(${c.x},${c.y}) がどの足場からも取れない`);
    for (const p of stage.platforms) {
      const inside = Math.abs(c.x - p.x) < p.width / 2 + 10 && Math.abs(c.y - p.y) < p.height / 2 + 10;
      if (inside) fail(`${label}: コイン(${c.x},${c.y}) が床にめり込んでいる`);
    }
  }
}

function checkStructure(stage, label) {
  if (!stage.name) fail(`${label}: name がない`);
  if (!stage.bgKey) fail(`${label}: bgKey がない`);
  if (stage.goal.x > stage.worldWidth) fail(`${label}: ゴールがステージ幅の外`);
  for (const p of stage.platforms) {
    if (p.x + p.width / 2 > stage.worldWidth + 1) fail(`${label}: 足場がステージ幅の外 (x=${p.x})`);
  }
  for (const o of stage.obstacles ?? []) {
    const onPlatform = stage.platforms.some((p) => o.x >= p.x - p.width / 2 - 16 && o.x <= p.x + p.width / 2 + 16 && Math.abs(o.y + o.height / 2 - (p.y - p.height / 2)) <= 8);
    if (!onPlatform) fail(`${label}: 棘(${o.x},${o.y}) が足場の上にない`);
  }
  const ids = new Set((stage.switches ?? []).map((s) => s.id));
  for (const b of stage.blocks ?? []) {
    if (!ids.has(b.switchId)) fail(`${label}: ブロックのswitchId(${b.switchId})に対応するスイッチがない`);
  }
}

for (const chara of CHARACTERS) {
  const stages = STAGES[chara.id];
  if (!stages) continue; // ニナは部屋型でステージを持たない
  if (stages.length !== 3) fail(`${chara.id}: ステージ数が3でない (${stages.length})`);
  stages.forEach((stage, i) => {
    const label = `${chara.id} stage${i + 1}`;
    checkStructure(stage, label);
    checkCoins(stage, chara, label);
    // 想定ルート: ダッシュを使って普通に操作すれば到達できること
    const intended = solve(stage, chara, "safe", true);
    if (!intended.ok) fail(`${label}: ダッシュを使ってもゴールに到達できない（${intended.reason}）`);
    const safeNoDash = solve(stage, chara, "safe", false).ok;
    const maxNoDash = solve(stage, chara, "max", false).ok;
    if (stage.needsDash && maxNoDash) fail(`${label}: needsDash なのに、ダッシュ無しでも（熟練者なら）越えられる穴がある。穴を広げるか needsDash を外す`);
    if (!stage.needsDash && !safeNoDash) fail(`${label}: ダッシュが必要だが needsDash が宣言されていない`);
    // パズルの整合性: スイッチを使わずに、ダッシュ1回を最大限に使ってもクリアできてはいけない
    if ((stage.switches ?? []).length > 0 && solve(stage, chara, "max", true, false).ok) {
      fail(`${label}: スイッチを使わなくても（ダッシュ1回で）クリアできてしまう（穴を広げるか、壁を足す）`);
    }
    console.log(`${label} ${stage.name}: ${intended.ok ? (stage.needsDash ? "OK（ダッシュ必須）" : "OK") : "NG"}`);
  });
}

if (failures.length) {
  console.error(`\n${failures.length} 件失敗`);
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log("\nステージ検証: すべて成功");
