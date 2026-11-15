// ゲーム全体の共通設定。ノベルパート（RPGパート）のダーク・シリアスな
// トーンを踏襲しつつ、アクションゲームとして視認性を優先した配色にする。
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const COLORS = {
  background: 0x14121a,
  panel: 0x1f1c28,
  accent: 0xa68cf0,
  accentSoft: 0x4a3f66,
  text: 0xf5f3fa,
  marico: 0xf08cc0,
  niko: 0x8cbdf0,
  nina: 0x8cf0c0,
  mc: 0xcfa96e
};

// 操作キャラクターの定義。スプライトは後日ドット絵に差し替える前提のため、
// 現時点では色だけを持たせ、CharacterSelectScene / PlayScene で
// 仮の四角形プレースホルダーとして描画する。
//
// 各キャラクターは全く異なるゲームジャンルを担当する（キャラクター
// 選択＝ジャンル選択に等しい）。sceneKeyがCharacterSelectSceneの
// 遷移先シーンキー、genreLabelがキャラ選択画面に表示する説明文。
// moveSpeed/jumpPowerは横スクロールアクション系（主人公・マリコ）専用
// のパラメータで、ニコ・ニナのシーンでは参照しない。
// ミニスプライトのシート仕様（tools/make_mini_sprites.py の出力に対応）。
// 1コマ 112x144 を横に13枚。表示は SPRITE.scale 倍。
export const SPRITE = {
  frameWidth: 112,
  frameHeight: 144,
  scale: 0.5,
  anims: {
    idle: { start: 0, end: 1, frameRate: 2, repeat: -1 },
    run: { start: 2, end: 7, frameRate: 12, repeat: -1 },
    jump_up: { start: 8, end: 8, frameRate: 1, repeat: -1 },
    jump_down: { start: 9, end: 9, frameRate: 1, repeat: -1 },
    dash: { start: 10, end: 10, frameRate: 1, repeat: -1 },
    miss: { start: 11, end: 12, frameRate: 8, repeat: 0 }
  }
};

// ステージ部品の画像（tools/make_stage_assets.py の出力）。2倍解像度で
// 描いてあり、表示は STAGE_ART.scale 倍。
export const STAGE_ART = {
  scale: 0.5,
  images: {
    tile_ground: "assets/stage/tile_ground.png",
    tile_block: "assets/stage/tile_block.png",
    spike: "assets/stage/spike.png",
    goal: "assets/stage/goal.png",
    switch_off: "assets/stage/switch_off.png",
    switch_on: "assets/stage/switch_on.png"
  },
  coin: { path: "assets/stage/coin.png", frameSize: 40, frameRate: 10 },
  bgParallax: 0.25
};

// ニナの脱出パズルの部屋の画像（tools/make_nina_assets.py の出力）。
// 壁は 920x420、オブジェクトは各 width/height に合わせた2倍解像度。
export const NINA_ART = {
  walls: ["north", "east", "south", "west"],
  objects: [
    "door", "bookshelf", "note", "crystal", "photo", "photo_back", "clock", "scroll",
    "box", "box_open", "drawer", "drawer_open"
  ],
  path: "assets/nina"
};

// タイトル・キャラ選択・結果演出のUI画像（tools/make_ui_assets.py 等の出力）。
export const UI_ART = {
  path: "assets/ui",
  images: {
    bg_title: "bg_title.jpg",
    bg_select: "bg_select.jpg",
    title_logo: "title_logo.png",
    ui_button: "ui_button.png",
    ui_button_hover: "ui_button_hover.png",
    card_frame: "card_frame.png",
    card_frame_hover: "card_frame_hover.png",
    banner_clear: "banner_clear.png",
    banner_miss: "banner_miss.png",
    banner_escape: "banner_escape.png",
    spark: "spark.png"
  }
};

export const CHARACTERS = [
  {
    id: "mc",
    portraitKey: "select_mc",
    portraitPath: "assets/characters/select_mc.png",
    spriteKey: "mini_mc",
    spritePath: "assets/sprites/mini_mc.png",
    bgKey: "bg_corridor",
    bgPath: "assets/stage/bg_corridor.jpg",
    name: "主人公",
    color: COLORS.mc,
    moveSpeed: 220,
    jumpPower: 480,
    sceneKey: "PlayScene",
    genreLabel: "横スクロールアクション"
  },
  {
    id: "marico",
    portraitKey: "select_marico",
    portraitPath: "assets/characters/select_marico.png",
    spriteKey: "mini_marico",
    spritePath: "assets/sprites/mini_marico.png",
    bgKey: "bg_broadcast",
    bgPath: "assets/stage/bg_broadcast.jpg",
    name: "マリコ",
    color: COLORS.marico,
    moveSpeed: 200,
    jumpPower: 440,
    sceneKey: "MaricoPuzzleActionScene",
    genreLabel: "パズル×アクション"
  },
  {
    id: "niko",
    portraitKey: "select_niko",
    portraitPath: "assets/characters/select_niko.png",
    spriteKey: "mini_niko",
    spritePath: "assets/sprites/mini_niko.png",
    bgKey: "bg_library",
    bgPath: "assets/stage/bg_library.jpg",
    name: "ニコ",
    color: COLORS.niko,
    // 爽快アクション担当として、常時スピード感のある操作感を出すため
    // 他キャラ（190-220）より大幅に速くする。DASH.speed(640)に近づき
    // すぎるとダッシュとの差が感じられなくなるため、その6割強に留める。
    moveSpeed: 420,
    jumpPower: 440,
    sceneKey: "NikoRushActionScene",
    genreLabel: "爽快アクション"
  },
  {
    id: "nina",
    portraitKey: "select_nina",
    portraitPath: "assets/characters/select_nina.png",
    name: "ニナ",
    color: COLORS.nina,
    moveSpeed: 190,
    jumpPower: 540,
    sceneKey: "NinaEscapeRoomScene",
    genreLabel: "脱出パズル（激ムズ）"
  }
];

// ダッシュ回避の共通パラメータ（全キャラ共通。将来キャラ差をつける場合は
// CHARACTERS側に移す）。
export const DASH = {
  speed: 640, // ダッシュ中の水平移動速度（moveSpeedとは独立した固定値）
  durationMs: 180, // ダッシュが持続する時間
  cooldownMs: 500, // 再度ダッシュできるようになるまでの時間
  invincibleMs: 220 // ダッシュ開始からの無敵時間（durationMsより少し長め）
};

// テキストの描画解像度。Scale.FITでCSS表示サイズを拡大しても、canvasの
// 内部描画バッファは論理解像度(GAME_WIDTH x GAME_HEIGHT)のままのため、
// 特に高DPIディスプレイでテキストの輪郭が大きくぼやける。Phaserの
// TextStyle.resolutionはTextオブジェクト単位でこれを補正できるため、
// devicePixelRatioに応じた値を全テキストで共通利用する（3倍を上限とし、
// 過度なメモリ/描画負荷を避ける）。
export const TEXT_RESOLUTION = Math.min(window.devicePixelRatio || 1, 3);
