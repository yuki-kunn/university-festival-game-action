// ニコステージ2「部室の昼」。ステージ1より穴が増え、棘も増える。コインは
// 棘の上や穴の上に弧を描いて並び、ジャンプしながら拾うとテンポよく進める。
// 放物線状にコインを並べる。xFrom〜xTo を n 個に分け、中央が lift だけ高くなる。
function arc(xFrom, xTo, yBase, lift, n) {
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return { x: Math.round(xFrom + (xTo - xFrom) * t), y: Math.round(yBase - lift * Math.sin(Math.PI * t)) };
  });
}

export const NIKO_STAGE2 = {
  name: "部室の昼",
  bgKey: "bg_clubroom_day",
  worldWidth: 3600,
  worldHeight: 540,
  playerStart: { x: 80, y: 400 },

  platforms: [
    { x: 500, y: 500, width: 1000, height: 40 }, // 0-1000
    { x: 1410, y: 500, width: 580, height: 40 }, // 1120-1700
    { x: 2100, y: 440, width: 400, height: 40 }, // 1900-2300（少し高い）
    { x: 2680, y: 500, width: 440, height: 40 }, // 2460-2900
    { x: 3370, y: 500, width: 460, height: 40 } // 3140-3600（ゴール）
  ],

  obstacles: [
    { x: 600, y: 470, width: 32, height: 32 },
    { x: 800, y: 470, width: 32, height: 32 },
    { x: 1300, y: 470, width: 32, height: 32 },
    { x: 1500, y: 470, width: 32, height: 32 },
    { x: 2100, y: 410, width: 32, height: 32 },
    { x: 2600, y: 470, width: 32, height: 32 },
    { x: 2780, y: 470, width: 32, height: 32 }
  ],

  goal: { x: 3520, y: 440, width: 48, height: 80 },

  coins: [
    ...arc(540, 660, 440, 50, 4), // 棘(600)の上
    ...arc(740, 860, 440, 50, 4), // 棘(800)の上
    ...arc(1010, 1110, 430, 60, 3), // 穴1
    ...arc(1240, 1380, 440, 55, 4), // 棘(1300)の上
    ...arc(1440, 1560, 440, 50, 3), // 棘(1500)の上
    ...arc(1720, 1890, 400, 60, 4), // 穴2
    ...arc(2020, 2180, 370, 50, 4), // 棘(2100)の上
    ...arc(2310, 2450, 400, 60, 3), // 穴3
    ...arc(2530, 2690, 440, 50, 4), // 棘(2600)の上
    ...arc(2900, 3130, 420, 70, 5), // 穴4（最大）
    ...arc(3220, 3440, 440, 40, 5) // ゴール前
  ]
};
