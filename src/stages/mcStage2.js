// 主人公ステージ2「部室の夜」。階段状に上って下りる足場、棘の連続、
// そして最後に「ジャンプ中にダッシュしないと届かない長い穴」が登場する。
export const MC_STAGE2 = {
  name: "部室の夜",
  bgKey: "bg_clubroom_night",
  needsDash: true,
  worldWidth: 3100,
  worldHeight: 540,
  playerStart: { x: 80, y: 400 },

  platforms: [
    { x: 210, y: 500, width: 420, height: 40 }, // 0-420 スタート
    { x: 660, y: 500, width: 240, height: 40 }, // 540-780 棘
    { x: 930, y: 420, width: 140, height: 40 }, // 860-1000 上り階段
    { x: 1150, y: 360, width: 140, height: 40 }, // 1080-1220
    { x: 1340, y: 300, width: 120, height: 40 }, // 1280-1400 頂上
    { x: 1560, y: 380, width: 160, height: 40 }, // 1480-1640 下り階段（棘）
    { x: 1760, y: 440, width: 140, height: 40 }, // 1690-1830
    { x: 2040, y: 500, width: 360, height: 40 }, // 1860-2220 棘が2つ
    { x: 2790, y: 500, width: 500, height: 40 } // 2540-3040 ダッシュで届く穴（320px）の先（ゴール）
  ],

  obstacles: [
    { x: 660, y: 470, width: 32, height: 32 },
    { x: 1560, y: 350, width: 32, height: 32 },
    { x: 1990, y: 470, width: 32, height: 32 },
    { x: 2050, y: 470, width: 32, height: 32 },
    { x: 2690, y: 470, width: 32, height: 32 }
  ],

  goal: { x: 2980, y: 440, width: 48, height: 80 }
};
