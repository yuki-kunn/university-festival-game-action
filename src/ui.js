import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION } from "./config.js";
import { playSe } from "./audio.js";
import { resetNikoRun } from "./score.js";

// 画面左下の「ホームへ戻る」ボタン（全シーン共通）。誤操作で進行中のプレイを失わないよう、
// 1回押すと「もう一度押すとホームへ」に変わり、2秒以内にもう一度押すと戻る。
// ホームへ戻るときは、進行中のプレイの記録（ニコのスコア）をリセットする。
export const HOME_CONFIRM_MS = 2000;

export function goHome(scene) {
  resetNikoRun(scene.game);
  scene.scene.start("TitleScene");
}

export function addHomeButton(scene) {
  const normal = {
    fontFamily: "sans-serif",
    fontSize: "13px",
    color: "#d4cfe0",
    backgroundColor: "rgba(20,18,26,0.7)",
    padding: { x: 8, y: 4 },
    resolution: TEXT_RESOLUTION
  };
  const button = scene.add
    .text(12, GAME_HEIGHT - 12, "ホームへ", normal)
    .setOrigin(0, 1)
    .setScrollFactor(0)
    .setDepth(200)
    .setInteractive({ useHandCursor: true });

  let armed = false;
  let timer = null;
  const disarm = () => {
    armed = false;
    timer?.remove(false);
    timer = null;
    button.setText("ホームへ").setColor("#d4cfe0").setBackgroundColor("rgba(20,18,26,0.7)");
  };

  button.on("pointerdown", () => {
    playSe(scene, "click");
    if (!armed) {
      armed = true;
      button.setText("もう一度押すとホームへ").setColor("#14121a").setBackgroundColor("#ffd24c");
      timer = scene.time.delayedCall(HOME_CONFIRM_MS, disarm);
      return;
    }
    goHome(scene);
  });
  scene.homeButton = button;
  return button;
}
