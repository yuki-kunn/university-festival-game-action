import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION } from "./config.js";

// 音声まわりの設定とヘルパー。
// BGM は tools/prep_bgm.py、効果音は tools/make_se.py の出力。BGM はシーンを
// またいで鳴り続け、同じ曲が続くときは途切れない。タイトル曲以外は必要に
// なった時点で遅延ロードする。
export const AUDIO = {
  bgmPath: "assets/audio/bgm",
  sePath: "assets/audio/se",
  bgmVolume: 0.5,
  seVolume: 0.7,
  bgmFade: 0.8, // 秒
  bgm: {
    daily: "daily.mp3", // タイトル・キャラ選択
    mystery: "mystery.mp3", // 主人公・ニナ
    tension: "tension.mp3", // マリコ
    climax: "climax.mp3" // ニコ
  },
  se: [
    "click", "hover", "jump", "dash", "coin", "switch", "block", "miss",
    "clear", "unlock", "wrong", "key", "turn", "examine"
  ],
  muteStorageKey: "alibi-action-muted"
};

const BGM_KEY = "bgmKey";
const BGM_SOUND = "bgmSound";

// ---- 読み込み ----

// BootScene から呼ぶ。効果音とタイトル曲だけを先に読み込む。
export function preloadAudio(scene) {
  AUDIO.se.forEach(name => scene.load.audio(`se_${name}`, `${AUDIO.sePath}/${name}.mp3`));
  scene.load.audio("bgm_daily", `${AUDIO.bgmPath}/${AUDIO.bgm.daily}`);
}

// ---- 効果音 ----

export function playSe(scene, name, config = {}) {
  if (scene.sound.locked) return; // ユーザー操作の前は鳴らさない
  scene.sound.play(`se_${name}`, { volume: AUDIO.seVolume, ...config });
}

// ---- BGM ----

function fade(sound, to, sec) {
  const node = sound.volumeNode;
  const ctx = sound.manager.context;
  if (node && ctx) {
    const now = ctx.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(node.gain.value, now);
    node.gain.linearRampToValueAtTime(to, now + sec);
  } else {
    sound.setVolume(to);
  }
}

export function stopBgm(scene, sec = AUDIO.bgmFade) {
  const registry = scene.game.registry;
  const sound = registry.get(BGM_SOUND);
  registry.set(BGM_KEY, null);
  registry.set(BGM_SOUND, null);
  if (!sound) return;
  fade(sound, 0, sec);
  // フェードはAudioContext側で進むので、シーンが切り替わっても止まらない
  setTimeout(() => {
    sound.stop();
    sound.destroy();
  }, sec * 1000 + 60);
}

export function playBgm(scene, key) {
  const registry = scene.game.registry;
  if (registry.get(BGM_KEY) === key && registry.get(BGM_SOUND)?.isPlaying) return;

  stopBgm(scene);
  registry.set(BGM_KEY, key);

  const start = () => {
    if (registry.get(BGM_KEY) !== key) return; // 待っている間に別の曲へ切り替わった
    const sound = scene.sound.add(`bgm_${key}`, { loop: true, volume: 0 });
    registry.set(BGM_SOUND, sound);
    sound.play();
    fade(sound, AUDIO.bgmVolume, AUDIO.bgmFade);
  };
  const startWhenUnlocked = () => {
    // ブラウザは最初のユーザー操作まで音を出せない。操作されたら始める。
    if (scene.sound.locked) scene.sound.once(Phaser.Sound.Events.UNLOCKED, start);
    else start();
  };

  const cacheKey = `bgm_${key}`;
  if (scene.cache.audio.exists(cacheKey)) {
    startWhenUnlocked();
  } else {
    scene.load.audio(cacheKey, `${AUDIO.bgmPath}/${AUDIO.bgm[key]}`);
    scene.load.once(`filecomplete-audio-${cacheKey}`, startWhenUnlocked);
    scene.load.start();
  }
}

// ---- ミュート ----

function readMutePreference() {
  try {
    return window.localStorage.getItem(AUDIO.muteStorageKey) === "1";
  } catch {
    return false;
  }
}

function writeMutePreference(muted) {
  try {
    window.localStorage.setItem(AUDIO.muteStorageKey, muted ? "1" : "0");
  } catch {
    // 保存できない環境（プライベートモード等）では、今回の起動中だけ有効にする
  }
}

// ミュート状態は registry で持つ。Web Audio は音声コンテキストが停止中（最初の
// ユーザー操作前）だと、設定した mute を読み戻しても古い値が返るため。
const MUTED = "muted";

export function applyMutePreference(game) {
  const muted = readMutePreference();
  game.registry.set(MUTED, muted);
  game.sound.mute = muted;
}

// 画面右下のミュートボタン（Mキーでも切り替え）。各シーンの create() で呼ぶ。
// 文字入力のある画面では key: false にして、Mキーを無効にする。
export function addMuteButton(scene, { key = true } = {}) {
  const label = muted => (muted ? "♪ OFF" : "♪ ON");
  const button = scene.add
    .text(GAME_WIDTH - 12, GAME_HEIGHT - 12, label(scene.game.registry.get(MUTED)), {
      fontFamily: "sans-serif",
      fontSize: "13px",
      color: "#d4cfe0",
      backgroundColor: "rgba(20,18,26,0.7)",
      padding: { x: 8, y: 4 },
      resolution: TEXT_RESOLUTION
    })
    .setOrigin(1, 1)
    .setScrollFactor(0)
    .setDepth(200)
    .setInteractive({ useHandCursor: true });

  const toggle = () => {
    const next = !scene.game.registry.get(MUTED);
    scene.game.registry.set(MUTED, next);
    scene.sound.mute = next;
    writeMutePreference(next);
    button.setText(label(next));
  };
  button.on("pointerdown", toggle);
  if (key) scene.input.keyboard.on("keydown-M", toggle);
  return button;
}
