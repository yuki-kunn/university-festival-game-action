// ニナ「脱出パズル（激ムズ）」のデータ定義。舞台はオカルト研究部の
// 部室（施錠状態）。一人称視点で、左右の矢印ボタンで東西南北4方向の
// 壁を巡回しながらオブジェクトを調べ、ヒントを集めて最終的にドアへ
// 4桁のコードを入力して脱出する。
//
// 面（wall）は "north"（正面、入室時に最初に見える面）→"east"→
// "south"→"west"→"north"...の順に右矢印で巡回する（左矢印で逆順）。
//
// 各オブジェクトは requires（調べるために先に調べておく必要がある
// オブジェクトID、nullなら制約なし）を持つ。requiresを満たしていない
// 間はrequiresMessageだけを表示し、hintKey/hintValueは得られない。
//
// 推理連鎖:
//   本棚（east、制約なし）        → ヒントA「3」
//   集合写真（south、制約なし）   → ヒントB「2」
//   水晶玉（east、制約なし）      → ヒントC「7」（台座の刻印）
//   引き出し（west、水晶玉が前提） → 刻印の数字を知って初めて開けられる
//                                  → ヒントD「5」（中のメモ）
//   古時計（south、集合写真が前提） → ダミーのヒント（コードには使わない）
//   ドア（north、制約なし）        → コード入力UIが開く。正解は
//                                  ヒントA+B+C+D を並べた「3275」
export const NINA_ESCAPE_ROOM = {
  code: "3275",
  maxAttempts: 3,

  // 面の巡回順（右矢印で次へ、左矢印で前へ）
  wallOrder: ["north", "east", "south", "west"],

  wallLabels: {
    north: "正面の壁",
    east: "東側の壁",
    south: "南側の壁",
    west: "西側の壁"
  },

  objects: [
    {
      id: "door",
      label: "ドア",
      wall: "north",
      x: 400,
      y: 240,
      width: 160,
      height: 300,
      requires: null,
      isExit: true,
      examineText: "鍵のかかった扉。数字4桁のダイヤル錠がついている。"
    },
    {
      id: "bookshelf",
      label: "本棚",
      wall: "east",
      x: 150,
      y: 260,
      width: 240,
      height: 300,
      requires: null,
      hintKey: "A",
      hintValue: "3",
      examineText:
        "古い郷土資料集が並んでいる。……一冊だけ、左から3冊目が天地逆さまに挿さっている。\n「3」という数字が、やけに目につく。"
    },
    {
      id: "crystal",
      label: "水晶玉",
      wall: "east",
      x: 650,
      y: 300,
      width: 140,
      height: 140,
      requires: null,
      hintKey: "C",
      hintValue: "7",
      examineText:
        "台座の裏に、小さくローマ数字が刻まれている。「Ⅶ」――7、ということだろうか。\nこの数字、引き出しの鍵に使えそうな気がする。"
    },
    {
      id: "photo",
      label: "集合写真",
      wall: "south",
      x: 200,
      y: 180,
      width: 220,
      height: 160,
      requires: null,
      hintKey: "B",
      hintValue: "2",
      examineText:
        "壁に飾られた歴代の集合写真。見覚えのない生徒が一人写っている。\n制服のブレザーのボタンを数えると――2つ。心なしか、他の部員より少ない気がする。"
    },
    {
      id: "clock",
      label: "古時計",
      wall: "south",
      x: 650,
      y: 200,
      width: 160,
      height: 200,
      requires: "photo",
      requiresMessage: "針が止まっているだけの、ただの古時計に見える。今はまだ、何か意味があるようには思えない。",
      // ダミーのヒント。hintKeyをnullにし、コード生成には使わせない
      // （examineTextで「意味深だが実は使えない」ことを示す演出）。
      hintKey: null,
      hintValue: null,
      examineText:
        "さっきの写真――制服のボタンが2つの生徒が写っていた時刻だろうか。\n針は3時5分を指したまま止まっている。意味深だが……これは写真が撮られた時刻を示しているだけで、鍵の数字とは関係なさそうだ。"
    },
    {
      id: "drawer",
      label: "引き出し",
      wall: "west",
      x: 400,
      y: 350,
      width: 260,
      height: 120,
      requires: "crystal",
      requiresMessage: "鍵がかかっている。数字を合わせる小さなダイヤル錠がついているようだ。",
      hintKey: "D",
      hintValue: "5",
      examineText:
        "水晶玉で見た「7」にダイヤルを合わせると、カチリと音がして引き出しが開いた。\n中には走り書きのメモが一枚。「――5」とだけ書かれている。"
    }
  ]
};
