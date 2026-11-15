// ニナの部屋データの検証。ブラウザを使わず、全部屋について
//  - 手がかりを集めるとコードが正解と一致する（前提・「調べ直すと変わる」仕掛けを含めて解ける）
//  - 鏡などの前提を調べる前は、その手がかりが得られない（ミスリードが機能する）
//  - 必要な画像ファイルが揃っていて、読み込み一覧にも載っている
//  - オブジェクトが壁の範囲に収まり、同じ壁で重ならない
import { existsSync } from "node:fs";
import { NINA_ART } from "../src/config.js";
import { NINA_ROOMS } from "../src/stages/ninaRooms.js";

const failures = [];
const fail = (msg) => failures.push(msg);
const WALL = { x0: 20, x1: 940, y0: 70, y1: 490 };

// シーンの handleObjectClick と同じ規則で、調べられるものを順に調べていく。
// blocked に入れたIDは調べられない（その前提が欠けた状態の再現）。
function simulate(room, blocked = new Set()) {
  const examined = new Set();
  const hints = {};
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
    for (const obj of room.objects) {
      if (obj.isExit || blocked.has(obj.id)) continue;
      const requires = [].concat(obj.requires ?? []);
      if (!requires.every((id) => examined.has(id))) continue;
      if (!examined.has(obj.id)) {
        examined.add(obj.id);
        changed = true;
      }
      const gotVariant = obj.requiresForBack ? examined.has(obj.requiresForBack) : true;
      if (gotVariant && obj.hintKey && hints[obj.hintKey] !== obj.hintValue) {
        hints[obj.hintKey] = obj.hintValue;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return { examined, hints };
}

const textureKeys = new Set(NINA_ART.objects);

NINA_ROOMS.forEach((room, i) => {
  const label = `room${i + 1} ${room.name}`;
  if (!/^\d{4}$/.test(room.code)) fail(`${label}: code が4桁の数字でない`);
  if (room.wallOrder.length !== 4) fail(`${label}: 壁が4面でない`);
  const ids = room.objects.map((o) => o.id);
  if (new Set(ids).size !== ids.length) fail(`${label}: オブジェクトIDが重複している`);
  if (room.objects.filter((o) => o.isExit).length !== 1) fail(`${label}: 出口(isExit)が1つでない`);

  for (const o of room.objects) {
    for (const id of [].concat(o.requires ?? [], o.requiresForBack ?? [])) {
      if (!ids.includes(id)) fail(`${label}: ${o.id} の前提 ${id} が存在しない`);
    }
    if (o.requiresForBack && !(o.hintKey || o.examineBackText)) fail(`${label}: ${o.id} は requiresForBack があるのに変化がない`);
    if (!room.wallOrder.includes(o.wall)) fail(`${label}: ${o.id} の壁 ${o.wall} が不正`);
    if (o.x - o.width / 2 < WALL.x0 || o.x + o.width / 2 > WALL.x1 || o.y - o.height / 2 < WALL.y0 || o.y + o.height / 2 > WALL.y1) {
      fail(`${label}: ${o.id} が壁の範囲からはみ出している`);
    }
  }
  // 同じ壁でのオブジェクトの重なり
  for (const wall of room.wallOrder) {
    const on = room.objects.filter((o) => o.wall === wall);
    for (let a = 0; a < on.length; a++) {
      for (let b = a + 1; b < on.length; b++) {
        const A = on[a], B = on[b];
        const overlap = Math.abs(A.x - B.x) < (A.width + B.width) / 2 && Math.abs(A.y - B.y) < (A.height + B.height) / 2;
        if (overlap) fail(`${label}: ${wall}面で ${A.id} と ${B.id} が重なっている`);
      }
    }
  }

  // 手がかりを全部集めるとコードになる
  const { examined, hints } = simulate(room);
  for (const o of room.objects) if (!o.isExit && !examined.has(o.id)) fail(`${label}: ${o.id} をいつまでも調べられない（前提が循環）`);
  const keys = Object.keys(hints).sort();
  const built = keys.map((k) => hints[k]).join("");
  if (built !== room.code) fail(`${label}: 手がかりから作ったコード(${built})が正解(${room.code})と一致しない`);
  const hintObjs = room.objects.filter((o) => o.hintKey);
  if (new Set(hintObjs.map((o) => o.hintKey)).size !== hintObjs.length) fail(`${label}: hintKey が重複している`);

  // 前提（鏡など）を調べられないと、その手がかりは得られない
  for (const o of room.objects.filter((x) => x.requiresForBack && x.hintKey)) {
    const r = simulate(room, new Set([o.requiresForBack]));
    if (r.hints[o.hintKey] !== undefined) fail(`${label}: ${o.id} の手がかりが、${o.requiresForBack} を調べなくても得られてしまう`);
  }

  // 画像ファイル
  const need = [];
  for (const wall of room.wallOrder) need.push([`${room.wallPrefix}${wall}`, "wall"]);
  for (const o of room.objects) {
    need.push([`obj_${o.id}`, "obj"]);
    if (o.openWhenExamined) need.push([`obj_${o.id}_open`, "obj"]);
    if (o.requiresForBack) need.push([`obj_${o.id}_back`, "obj"]);
  }
  for (const [key, kind] of need) {
    if (!existsSync(`public/assets/nina/${key}.png`)) fail(`${label}: 画像 ${key}.png がない`);
    if (kind === "obj" && !textureKeys.has(key.replace(/^obj_/, ""))) fail(`${label}: ${key} が NINA_ART.objects に載っていない`);
  }
  if (!NINA_ART.wallPrefixes.includes(room.wallPrefix)) fail(`${label}: wallPrefix が NINA_ART.wallPrefixes に載っていない`);
  console.log(`${label}: コード ${room.code}、手がかり ${keys.map((k) => `${k}=${hints[k]}`).join(" ")} OK`);
});

if (failures.length) {
  console.error(`\n${failures.length} 件失敗`);
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log("\n部屋検証: すべて成功");
