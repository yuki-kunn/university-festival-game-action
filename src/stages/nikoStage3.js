// ニコステージ3「鏡の世界」。穴が大きく、足場の高さも行き来する最終ステージ。
// 放物線状にコインを並べる。xFrom〜xTo を n 個に分け、中央が lift だけ高くなる。
function arc(xFrom, xTo, yBase, lift, n) {
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return { x: Math.round(xFrom + (xTo - xFrom) * t), y: Math.round(yBase - lift * Math.sin(Math.PI * t)) };
  });
}

export const NIKO_STAGE3 = {
  name: "鏡の世界",
  bgKey: "bg_mirror",
  worldWidth: 4200,
  worldHeight: 540,
  playerStart: { x: 80, y: 400 },

  platforms: [
    { x: 400, y: 500, width: 800, height: 40 }, // 0-800
    { x: 1130, y: 440, width: 260, height: 40 }, // 1000-1260
    { x: 1560, y: 380, width: 200, height: 40 }, // 1460-1660（高い）
    { x: 2000, y: 500, width: 420, height: 40 }, // 1790-2210
    { x: 2640, y: 500, width: 300, height: 40 }, // 2490-2790（大きな穴の先）
    { x: 3110, y: 440, width: 180, height: 40 }, // 3020-3200
    { x: 3450, y: 380, width: 160, height: 40 }, // 3370-3530
    { x: 3850, y: 500, width: 500, height: 40 } // 3600-4100（ゴール）
  ],

  obstacles: [
    { x: 500, y: 470, width: 32, height: 32 },
    { x: 650, y: 470, width: 32, height: 32 },
    { x: 1130, y: 410, width: 32, height: 32 },
    { x: 1900, y: 470, width: 32, height: 32 },
    { x: 2050, y: 470, width: 32, height: 32 },
    { x: 2640, y: 470, width: 32, height: 32 },
    { x: 3750, y: 470, width: 32, height: 32 },
    { x: 3900, y: 470, width: 32, height: 32 }
  ],

  goal: { x: 4040, y: 440, width: 48, height: 80 },

  coins: [
    ...arc(420, 580, 440, 55, 4), // 棘(500)の上
    ...arc(600, 740, 440, 55, 4), // 棘(650)の上
    ...arc(810, 1000, 400, 60, 4), // 穴1
    ...arc(1050, 1210, 370, 50, 4), // 棘(1130)の上
    ...arc(1270, 1450, 340, 60, 4), // 穴2
    ...arc(1500, 1620, 320, 40, 3), // 高い足場
    ...arc(1670, 1780, 400, 60, 3), // 穴3
    ...arc(1830, 2110, 430, 60, 6), // 棘(1900,2050)の上
    ...arc(2220, 2480, 420, 60, 6), // 大きな穴
    ...arc(2540, 2760, 440, 55, 4),
    ...arc(2800, 3010, 380, 70, 4), // 穴5
    ...arc(3380, 3520, 310, 40, 3), // 高い足場
    ...arc(3540, 3590, 380, 30, 2),
    ...arc(3650, 3840, 440, 55, 4), // 棘(3750)の上
    ...arc(3860, 3980, 440, 50, 3) // 棘(3900)の上
  ]
};
