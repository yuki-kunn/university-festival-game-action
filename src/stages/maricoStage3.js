// マリコステージ3「鏡の世界」。2つのスイッチを両方ONにしないと渡れない穴や、
// 柱の上のスイッチを経由しないと開かない壁など、複数の仕掛けが連なる最終ステージ。
// 穴は400pxで、スイッチの橋なしでは（ダッシュを1回使っても）渡れない。
//
// 解き方:
//   1. 床1のスイッチA(120)とB(280)を両方ON → 橋Aと橋Bがつながって穴1を渡れる
//   2. 床2の柱(840-960)に登ってスイッチA(900)でOFF → 壁1が消える
//   3. スイッチB(1140)でOFF → 橋2が出る。穴2を渡る
//   4. 床3のスイッチC(1660)でON → 橋3が出る。柱(1760-1880)に登ってスイッチD(1820)でON → 壁2が消える
//   5. 壁2を抜けて橋3を渡る。床4のスイッチC(2520)でOFF → 橋4が出る → ゴール
export const MARICO_STAGE3 = {
  name: "鏡の世界",
  bgKey: "bg_mirror",
  worldWidth: 4100,
  worldHeight: 540,
  playerStart: { x: 80, y: 400 },

  platforms: [
    { x: 200, y: 500, width: 400, height: 40 }, // 0-400 床1
    { x: 1000, y: 500, width: 400, height: 40 }, // 800-1200 床2
    { x: 900, y: 440, width: 120, height: 80 }, // 柱（上面400）。スイッチA'
    { x: 1820, y: 500, width: 440, height: 40 }, // 1600-2040 床3
    { x: 1820, y: 440, width: 120, height: 80 }, // 柱（上面400）。スイッチD
    { x: 2640, y: 500, width: 400, height: 40 }, // 2440-2840 床4
    { x: 3640, y: 500, width: 800, height: 40 } // 3240-4040 床5（ゴール）
  ],

  obstacles: [
    { x: 1700, y: 470, width: 32, height: 32 },
    { x: 3440, y: 470, width: 32, height: 32 }
  ],

  goal: { x: 3940, y: 440, width: 48, height: 80 },

  switches: [
    { id: "A", x: 120, y: 470, width: 36, height: 36 },
    { id: "B", x: 280, y: 470, width: 36, height: 36 },
    { id: "A", x: 900, y: 390, width: 36, height: 36 },
    { id: "B", x: 1140, y: 470, width: 36, height: 36 },
    { id: "C", x: 1660, y: 470, width: 36, height: 36 },
    { id: "D", x: 1820, y: 390, width: 36, height: 36 },
    { id: "C", x: 2520, y: 470, width: 36, height: 36 }
  ],

  blocks: [
    { switchId: "A", activeWhen: "on", x: 500, y: 500, width: 200, height: 40 }, // 橋A（穴1の前半）
    { switchId: "B", activeWhen: "on", x: 700, y: 500, width: 200, height: 40 }, // 橋B（穴1の後半）
    { switchId: "A", activeWhen: "on", x: 1050, y: 440, width: 40, height: 160 }, // 壁1
    { switchId: "B", activeWhen: "off", x: 1400, y: 500, width: 400, height: 40 }, // 橋2（穴2）
    { switchId: "D", activeWhen: "off", x: 1920, y: 440, width: 40, height: 160 }, // 壁2
    { switchId: "C", activeWhen: "on", x: 2240, y: 500, width: 400, height: 40 }, // 橋3（穴3）
    { switchId: "C", activeWhen: "off", x: 3040, y: 500, width: 400, height: 40 } // 橋4（穴4）
  ]
};
