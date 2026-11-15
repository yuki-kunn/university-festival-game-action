// ニナ「脱出パズル」の2部屋目「鏡の部屋」。1部屋目の部室を鏡に映したような部屋で、
// すべての手がかりを「鏡に映した姿」で読む。
//
// 鏡（m_mirror）を調べると、時計・ランプ・黒板を調べ直したときに「鏡に映した姿」が見え、
// 手がかりが得られる（requiresForBack）。調べ直す前の表の姿はミスリードを含む。
//
//   時計(north)   実物は8時50分。鏡に映すと「12時から実際の時刻を引いた」3時10分に見える → A=3
//   黒板(west)    本棚の数字を調べた後、鏡に映すと読める。「鏡に映したとおり左から3番目」
//                 本棚(左から 4,1,7,2,5,3,6) を鏡に映すと 6,3,5,2,7,1,4 → 3番目は5 → B=5
//                 （本棚で飛び出している「7」は、答えと関係のないミスリード）
//   ランプ(east)  左から 緑・青・黄・赤・紫。鏡に映すと赤は左から2番目 → C=2
//   金庫(west)    日めくり(13日) と日記(鏡の中は一日進んでいる) の両方が前提。
//                 鏡の中の日付は14日 → 下一桁 → D=4
//
// 最終コード: A3 + B5 + C2 + D4 = 3524
export const NINA_ROOM2 = {
  name: "鏡の部屋",
  wallPrefix: "room_wall_m_",
  bgm: "tension",
  escapeText: "鏡が静かに割れ、元の世界へ続く道が開いた。",
  code: "3524",
  maxAttempts: 3,

  wallOrder: ["north", "east", "south", "west"],

  wallLabels: {
    north: "正面の壁",
    east: "東側の壁",
    south: "南側の壁",
    west: "西側の壁"
  },

  objects: [
    {
      id: "m_door",
      label: "ドア",
      wall: "north",
      x: 400,
      y: 240,
      width: 160,
      height: 300,
      requires: null,
      isExit: true,
      examineText: "鏡張りの扉。数字4桁のダイヤル錠がついている。"
    },
    {
      id: "m_clock",
      label: "壁掛け時計",
      wall: "north",
      x: 700,
      y: 180,
      width: 160,
      height: 160,
      requires: null,
      hintKey: "A",
      hintValue: "3",
      requiresForBack: "m_mirror",
      examineText:
        "壁掛け時計は「8時50分」を指して止まっている。\nだが、この部屋では何を見ても、どこか左右がちぐはぐだ。……鏡を通して見たら、違う時刻に見えるのだろうか。",
      examineBackText:
        "鏡に映った時計は、左右が反転して「3時10分」に見えた。\n鏡の中の時刻は「12時ちょうどから実際の時刻を引いた値」。8時50分を引くと――3時10分。\nこの部屋の暗号は鏡の中の姿で読む。時を表す数字は「3」だ。"
    },
    {
      id: "m_books",
      label: "本棚",
      wall: "east",
      x: 150,
      y: 260,
      width: 200,
      height: 300,
      requires: null,
      examineText:
        "背表紙に大きな数字が書かれた本が7冊。左から「4」「1」「7」「2」「5」「3」「6」。\n「7」の本だけ、少し手前に飛び出している。……何か意味がありそうだが、これだけでは分からない。"
    },
    {
      id: "m_lamp",
      label: "ランプ",
      wall: "east",
      x: 480,
      y: 270,
      width: 100,
      height: 160,
      requires: null,
      hintKey: "C",
      hintValue: "2",
      requiresForBack: "m_mirror",
      examineText:
        "ステンドグラスのランプ。左から緑・青・黄・赤・紫のガラスが並んでいる。\n実物では、赤は左から4番目。……鏡越しなら、どう見えるだろう。",
      examineBackText:
        "鏡に映したランプのガラスは、左から紫・赤・黄・青・緑の順に並んでいた。\n赤は左から2番目。この部屋の答えは鏡の中の姿だ。――「2」。"
    },
    {
      id: "m_calendar",
      label: "日めくり",
      wall: "east",
      x: 760,
      y: 190,
      width: 120,
      height: 160,
      requires: null,
      examineText:
        "日めくりカレンダーは「11月13日」。大安の文字がある。\n今日の日付だろうか。……日付そのものには、まだ意味が見えない。"
    },
    {
      id: "m_mirror",
      label: "姿見",
      wall: "south",
      x: 330,
      y: 250,
      width: 220,
      height: 300,
      requires: null,
      examineText:
        "壁一面の大きな姿見。覗き込むと、部屋が左右反転して映っている。\nこの部屋の文字や数字は、鏡に映して初めて正しく読めるのかもしれない。……時計・ランプ・黒板を、もう一度調べ直してみよう。"
    },
    {
      id: "m_desk",
      label: "机と日記",
      wall: "south",
      x: 700,
      y: 400,
      width: 240,
      height: 120,
      requires: null,
      examineText:
        "古い机の上に、開いたままの日記がある。\n最後のページに「鏡の中の日付は、実際より一日だけ進んでいる」と書かれている。\n日めくりカレンダーの日付と、関係がありそうだ。"
    },
    {
      id: "m_board",
      label: "黒板",
      wall: "west",
      x: 300,
      y: 200,
      width: 360,
      height: 180,
      requires: "m_books",
      requiresMessage: "黒板に何か書かれているが、今は読めそうにない。本棚を先に調べておいた方がいいかもしれない。",
      hintKey: "B",
      hintValue: "5",
      requiresForBack: "m_mirror",
      examineText:
        "黒板に白いチョークで何か書かれているが、文字が左右反転していて読めない。\n鏡があれば読めるかもしれない。",
      examineBackText:
        "鏡に映した黒板には、こう書かれていた。\n「本の数字を、鏡に映したとおり左から3番目に数えよ」\n鏡の中の本棚は、左から6・3・5・2・7・1・4の順。左から3番目は「5」だ。"
    },
    {
      id: "m_safe",
      label: "金庫",
      wall: "west",
      x: 700,
      y: 390,
      width: 150,
      height: 150,
      requires: ["m_desk", "m_calendar"],
      requiresMessage: "頑丈な金庫。ダイヤルの暗証番号が分からない。部屋のどこかにヒントがありそうだ。",
      hintKey: "D",
      hintValue: "4",
      openWhenExamined: true,
      examineText:
        "金庫の暗証は「鏡の中の今日の日にち」の下一桁。\n日めくりは13日、日記によれば鏡の中は一日進んでいる。14日の下一桁を回すと――カチリ。\n中の紙に「4」とだけ書かれていた。"
    }
  ]
};
