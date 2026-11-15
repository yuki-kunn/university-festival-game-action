// 主人公ステージ3「鏡の世界」。足場が細くなり、ダッシュが必要な穴（どちらも330px）が2回出てくる最終ステージ。
export const MC_STAGE3 = {
  name: "鏡の世界",
  bgKey: "bg_mirror",
  needsDash: true,
  worldWidth: 4300,
  worldHeight: 540,
  playerStart: { x: 80, y: 400 },

  platforms: [
    { x: 250, y: 500, width: 500, height: 40 }, // 0-500 スタート
    { x: 700, y: 440, width: 120, height: 40 }, // 640-760 細い足場で上る
    { x: 900, y: 380, width: 100, height: 40 }, // 850-950
    { x: 1060, y: 320, width: 100, height: 40 }, // 1010-1110
    { x: 1220, y: 380, width: 100, height: 40 }, // 1170-1270
    { x: 1500, y: 500, width: 320, height: 40 }, // 1340-1660 棘が2つ
    { x: 2140, y: 500, width: 300, height: 40 }, // 1990-2290 1回目のダッシュ（330px）。棘が2つ
    { x: 2500, y: 440, width: 160, height: 40 }, // 2420-2580
    { x: 2730, y: 380, width: 140, height: 40 }, // 2660-2800
    { x: 2950, y: 440, width: 140, height: 40 }, // 2880-3020 棘
    { x: 3240, y: 500, width: 240, height: 40 }, // 3120-3360 棘
    { x: 3950, y: 500, width: 520, height: 40 } // 3690-4210 2回目のダッシュ（330px）の先（ゴール）
  ],

  obstacles: [
    { x: 1440, y: 470, width: 32, height: 32 },
    { x: 1560, y: 470, width: 32, height: 32 },
    { x: 2090, y: 470, width: 32, height: 32 },
    { x: 2190, y: 470, width: 32, height: 32 },
    { x: 2950, y: 410, width: 32, height: 32 },
    { x: 3240, y: 470, width: 32, height: 32 },
    { x: 3860, y: 470, width: 32, height: 32 }
  ],

  goal: { x: 4140, y: 440, width: 48, height: 80 }
};
