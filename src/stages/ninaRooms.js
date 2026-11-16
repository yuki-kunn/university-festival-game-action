import { NINA_ESCAPE_ROOM } from "./ninaEscapeRoom.js";
import { buildNinaRoom2 } from "./ninaRoom2.js";

// ニナの部屋の一覧（先頭が1部屋目）。1部屋目を脱出すると次の部屋へ進む。
// 2部屋目のカレンダー・金庫は日付で変わるため、日付を受け取って組み立てる。
export function buildNinaRooms(today = new Date()) {
  return [NINA_ESCAPE_ROOM, buildNinaRoom2(today)];
}
