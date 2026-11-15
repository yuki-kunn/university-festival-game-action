// マリコステージ2「廊下」。同じIDのスイッチが離れた場所に2つあり、切り替えの順番を考えるパズル。
// 穴は400pxで、スイッチの橋なしでは（ダッシュを1回使っても）渡れない。
//
// 解き方:
//   1. 床1のスイッチA(150)でON → 橋1が出る（同時に壁1が出現、橋2は消える）
//   2. 橋1を渡り、床2の柱(780-920)に登ってスイッチA(850)でOFF → 壁1が消え、橋2が出る
//   3. 床3のスイッチB(1680)でON → 壁2が消える（橋3は消える）
//   4. 壁2の先のスイッチB(1960)でOFF → 壁2が再び閉じるが背後なので問題なし。橋3が出る
//   5. 床4のスイッチC(2480)でON → 壁3が消え、橋4が出る → ゴール
// スイッチは接触するたびにON/OFFが入れ替わる。素通りしたくないときは跳び越える。
export const MARICO_STAGE2 = {
  name: "廊下",
  bgKey: "bg_corridor",
  worldWidth: 3700,
  worldHeight: 540,
  playerStart: { x: 80, y: 400 },

  platforms: [
    { x: 150, y: 500, width: 300, height: 40 }, // 0-300 床1
    { x: 950, y: 500, width: 500, height: 40 }, // 700-1200 床2
    { x: 850, y: 440, width: 140, height: 80 }, // 柱（上面400）。スイッチA'
    { x: 1800, y: 500, width: 400, height: 40 }, // 1600-2000 床3
    { x: 2600, y: 500, width: 400, height: 40 }, // 2400-2800 床4
    { x: 3450, y: 500, width: 500, height: 40 } // 3200-3700 床5（ゴール）
  ],

  obstacles: [
    { x: 2630, y: 470, width: 32, height: 32 },
    { x: 3300, y: 470, width: 32, height: 32 }
  ],

  goal: { x: 3560, y: 440, width: 48, height: 80 },

  switches: [
    { id: "A", x: 150, y: 470, width: 36, height: 36 },
    { id: "A", x: 850, y: 390, width: 36, height: 36 },
    { id: "B", x: 1680, y: 470, width: 36, height: 36 },
    { id: "B", x: 1960, y: 470, width: 36, height: 36 },
    { id: "C", x: 2480, y: 470, width: 36, height: 36 }
  ],

  blocks: [
    { switchId: "A", activeWhen: "on", x: 500, y: 500, width: 400, height: 40 }, // 橋1（穴1）
    { switchId: "A", activeWhen: "on", x: 1100, y: 440, width: 40, height: 160 }, // 壁1
    { switchId: "A", activeWhen: "off", x: 1400, y: 500, width: 400, height: 40 }, // 橋2（穴2）
    { switchId: "B", activeWhen: "off", x: 1900, y: 440, width: 40, height: 160 }, // 壁2
    { switchId: "B", activeWhen: "off", x: 2200, y: 500, width: 400, height: 40 }, // 橋3（穴3）
    { switchId: "C", activeWhen: "off", x: 2730, y: 440, width: 40, height: 160 }, // 壁3
    { switchId: "C", activeWhen: "on", x: 3000, y: 500, width: 400, height: 40 } // 橋4（穴4）
  ]
};
