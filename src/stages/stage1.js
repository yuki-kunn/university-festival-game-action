// ステージ1のレイアウト定義。座標はワールド座標（横スクロールするため
// GAME_WIDTHより広い）。床は複数の矩形の組み合わせで表現し、隙間は
// 「落下すると即ミス」の穴になる。障害物に触れても即ミス、ゴールに
// 触れるとクリア。
//
// 単位はピクセル。y=0が画面最上部、下に行くほど値が大きい。
export const STAGE1 = {
  worldWidth: 2400,
  worldHeight: 540,

  // プレイヤーの初期位置
  playerStart: { x: 80, y: 400 },

  // 床（複数の矩形）。x, yは矩形の中心座標。隙間を作ることで穴になる。
  platforms: [
    { x: 200, y: 500, width: 400, height: 40 },
    { x: 560, y: 500, width: 160, height: 40 },
    { x: 820, y: 420, width: 160, height: 40 },
    { x: 1080, y: 500, width: 240, height: 40 },
    { x: 1420, y: 500, width: 160, height: 40 },
    { x: 1680, y: 380, width: 160, height: 40 },
    { x: 1940, y: 500, width: 300, height: 40 },
    { x: 2280, y: 500, width: 240, height: 40 }
  ],

  // 障害物（接触で即ミス）。静止した棘オブジェクトを想定。
  obstacles: [
    { x: 640, y: 470, width: 32, height: 32 },
    { x: 1160, y: 470, width: 32, height: 32 },
    { x: 1220, y: 470, width: 32, height: 32 },
    { x: 2000, y: 470, width: 32, height: 32 },
    { x: 2060, y: 470, width: 32, height: 32 }
  ],

  // ゴール（接触でクリア）
  goal: { x: 2340, y: 440, width: 48, height: 80 }
};
