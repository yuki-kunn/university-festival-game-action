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
export const CHARACTERS = [
  { id: "mc", name: "主人公", color: COLORS.mc, moveSpeed: 220, jumpPower: 480 },
  { id: "marico", name: "マリコ", color: COLORS.marico, moveSpeed: 200, jumpPower: 440 },
  { id: "niko", name: "ニコ", color: COLORS.niko, moveSpeed: 260, jumpPower: 440 },
  { id: "nina", name: "ニナ", color: COLORS.nina, moveSpeed: 190, jumpPower: 540 }
];

// ダッシュ回避の共通パラメータ（全キャラ共通。将来キャラ差をつける場合は
// CHARACTERS側に移す）。
export const DASH = {
  speed: 640, // ダッシュ中の水平移動速度（moveSpeedとは独立した固定値）
  durationMs: 180, // ダッシュが持続する時間
  cooldownMs: 500, // 再度ダッシュできるようになるまでの時間
  invincibleMs: 220 // ダッシュ開始からの無敵時間（durationMsより少し長め）
};
