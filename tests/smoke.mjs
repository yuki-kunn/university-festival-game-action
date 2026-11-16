// スモークテスト: ビルド済みの dist を vite preview で配信し、ヘッドレス
// Chromium で全キャラのシーンがエラーなく起動することを確認する。
// 使い方: npm run build && npm test
import { chromium } from "playwright";
import { preview } from "vite";
import { runScore } from "../src/score.js";

const GAME_W = 960;
const GAME_H = 540;
const PORT = 4173;

const CHARACTERS = [
  { id: "mc", sceneKey: "PlayScene", cardX: 174, bgm: "mystery" },
  { id: "marico", sceneKey: "MaricoPuzzleActionScene", cardX: 378, bgm: "tension" },
  { id: "niko", sceneKey: "NikoRushActionScene", cardX: 582, bgm: "climax" },
  { id: "nina", sceneKey: "NinaEscapeRoomScene", cardX: 786, bgm: "mystery" }
];

const server = await preview({ preview: { port: PORT, strictPort: true, open: false } });
const browser = await chromium.launch();
const failures = [];

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function runCase(chara) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e}`));
  page.on("console", m => m.type() === "error" && errors.push(`console: ${m.text()}`));
  page.on("requestfailed", r => errors.push(`requestfailed: ${r.url()}`));

  try {
    await page.goto(`http://localhost:${PORT}/?debug`);
    await page.waitForFunction(() => window.game?.scene.isActive("TitleScene"), null, { timeout: 15000 });

    const box = await (await page.$("canvas")).boundingBox();
    const click = (gx, gy) => page.mouse.click(box.x + (gx / GAME_W) * box.width, box.y + (gy / GAME_H) * box.height);

    // シーン表示直後はクリックを取りこぼすことがあるため、切り替わるまで再クリックする
    const clickUntil = async (gx, gy, key) => {
      for (let i = 0; i < 12; i++) {
        await click(gx, gy);
        await page.waitForTimeout(700);
        if (await page.evaluate(k => window.game.scene.isActive(k), key)) return;
      }
      throw new Error(`シーンが起動しない: ${key}`);
    };
    await clickUntil(GAME_W / 2, GAME_H / 2 + 60, "CharacterSelectScene"); // はじめる
    await clickUntil(chara.cardX, GAME_H / 2 + 20, chara.sceneKey); // キャラカード
    await page.waitForTimeout(500);

    const bgm = await page.evaluate(() => window.game.registry.get("bgmKey"));
    assert(bgm === chara.bgm, `BGMの割り当てが想定と違う: ${bgm} (想定 ${chara.bgm})`);

    if (chara.id === "nina") {
      // 手がかりを集める: 前提を満たしたものから、全オブジェクトを何度か調べ直す
      // （鏡のように「調べ直すと変わる」ものも含めて、ゲームと同じ操作で解く）
      const solveRoom = () =>
        page.evaluate(() => {
          const sc = window.game.scene.getScenes(true)[0];
          // 説明文を出すたびに、文字が枠に収まっているかを確認する
          let allFit = true;
          for (let pass = 0; pass < 4; pass++) {
            for (const o of sc.room.objects) {
              if (o.isExit) continue;
              sc.handleObjectClick(o);
              const t = sc.examineText.getBounds();
              const p = sc.examinePanel.getBounds();
              if (t.left < p.left || t.right > p.right || t.top < p.top || t.bottom > p.bottom) allFit = false;
            }
          }
          sc.examineBox.setVisible(false);
          const code = Object.keys(sc.hints).sort().map(k => sc.hints[k]).join("");
          sc.openCodeInput();
          for (const ch of "0000") sc.inputDigit(ch);
          sc.submitCode();
          const attemptsAfterWrong = sc.attemptsLeft;
          sc.openCodeInput();
          for (const ch of code) sc.inputDigit(ch);
          sc.submitCode();
          return { code, expected: sc.room.code, attemptsAfterWrong, finished: sc.isFinished, allFit };
        });
      const skipBanner = async () => {
        await page.waitForTimeout(1100); // 900ms以降はクリックで早送りできる
        await click(GAME_W / 2, GAME_H / 2);
      };
      const roomCount = await page.evaluate(() => window.game.scene.getScenes(true)[0].roomCount);
      assert(roomCount === 2, `ニナの部屋数が2でない: ${roomCount}`);

      for (let r = 0; r < roomCount; r++) {
        const info = await page.evaluate(() => {
          const sc = window.game.scene.getScenes(true)[0];
          return { roomIndex: sc.roomIndex, bgm: window.game.registry.get("bgmKey"), expectedBgm: sc.room.bgm };
        });
        assert(info.roomIndex === r, `部屋の番号が想定と違う: ${info.roomIndex} (想定 ${r})`);
        assert(info.bgm === info.expectedBgm, `部屋${r + 1}のBGMが違う: ${info.bgm}`);

        // 視点（壁）を切り替えると、開いている説明文が閉じる。ホームへ戻るボタンもある
        const ui = await page.evaluate(() => {
          const sc = window.game.scene.getScenes(true)[0];
          sc.handleObjectClick(sc.room.objects.find(o => !o.isExit && !o.requires));
          const shown = sc.examineBox.visible;
          sc.turnWall(1);
          const closed = !sc.examineBox.visible;
          sc.turnWall(-1);
          return { shown, closed, hasHome: Boolean(sc.homeButton) };
        });
        assert(ui.shown && ui.closed, `視点を動かしても説明文が閉じない: ${JSON.stringify(ui)}`);
        assert(ui.hasHome, "ホームへ戻るボタンがない");

        if (r === 1) {
          // 鏡の部屋: 鏡を調べる前は時計の手がかりが得られず、調べた後は得られる
          const gating = await page.evaluate(() => {
            const sc = window.game.scene.getScenes(true)[0];
            const get = id => sc.room.objects.find(o => o.id === id);
            sc.handleObjectClick(get("m_clock"));
            const before = sc.hints.A;
            sc.handleObjectClick(get("m_mirror"));
            sc.handleObjectClick(get("m_clock"));
            return { before, after: sc.hints.A, texture: sc.getObjectTextureKey(get("m_clock")) };
          });
          assert(gating.before === undefined, "鏡を調べる前に時計の手がかりが得られてしまう");
          assert(gating.after === "3" && gating.texture === "obj_m_clock_back", `鏡を調べた後の時計が想定と違う: ${JSON.stringify(gating)}`);
        }

        const result = await solveRoom();
        assert(result.code === result.expected, `部屋${r + 1}: ヒントから作ったコード(${result.code})が正解(${result.expected})と一致しない`);
        assert(result.attemptsAfterWrong === 2, `部屋${r + 1}: 誤ったコードで残り試行回数が減らない`);
        assert(result.finished, `部屋${r + 1}: 正解コードで脱出できない`);
        assert(result.allFit, `部屋${r + 1}: 説明文が枠をはみ出している`);
        await skipBanner();
        if (r < roomCount - 1) {
          await page.waitForFunction(i => { const sc = window.game.scene.getScenes(true)[0]; return sc && sc.roomIndex === i && !sc.isFinished; }, r + 1, { timeout: 15000 });
          await page.waitForTimeout(500);
        } else {
          await page.waitForFunction(() => window.game.scene.isActive("TitleScene"), null, { timeout: 15000 });
        }
      }

      // 鏡の部屋のカレンダーは「実際の今日 + 1日」。月末・年末・うるう日の前日でも繰り上がる
      for (const [today, month, day, code] of [[[2026, 10, 30], 12, 1, "3521"], [[2026, 11, 31], 1, 1, "3521"], [[2028, 1, 28], 2, 29, "3529"], [[2026, 10, 16], 11, 17, "3527"]]) {
        await page.evaluate(([y, m, d]) => window.game.scene.getScenes(true)[0].scene.start("NinaEscapeRoomScene", { characterId: "nina", roomIndex: 1, today: new Date(y, m, d, 12) }), today);
        await page.waitForFunction(() => { const sc = window.game.scene.getScenes(true)[0]; return sc.scene.key === "NinaEscapeRoomScene" && sc.roomIndex === 1 && sc.objectContainer; }, null, { timeout: 15000 });
        const cal = await page.evaluate(() => {
          const sc = window.game.scene.getScenes(true)[0];
          sc.currentWallIndex = sc.room.wallOrder.indexOf("east");
          sc.renderCurrentWall();
          const texts = sc.objectContainer.list.filter(o => o.type === "Text").map(o => o.text);
          const safe = sc.room.objects.find(o => o.id === "m_safe");
          return { texts, code: sc.room.code, safeHint: safe.hintValue };
        });
        assert(cal.texts.includes(`${month}月`) && cal.texts.includes(String(day)), `カレンダーが ${month}月${day}日 を表示していない: ${JSON.stringify(cal.texts)}`);
        assert(cal.code === code && cal.safeHint === code.slice(3), `日付 ${month}/${day} の暗証・コードが想定と違う: ${JSON.stringify(cal)}`);
      }
    } else {
      // 開始位置は床より高いので、着地するまで待つ（ヘッドレスは描画が遅い）
      await page
        .waitForFunction(() => window.game.scene.getScenes(true)[0].player?.body.blocked.down, null, { timeout: 10000 })
        .catch(() => {});
      const info = await page.evaluate(() => {
        const s = window.game.scene.getScenes(true)[0];
        return {
          body: [s.player.body.width, s.player.body.height],
          onGround: s.player.body.blocked.down,
          platforms: s.platformGroup.getChildren().length,
          gameOver: s.isGameOver
        };
      });
      assert(info.body[0] === 36 && info.body[1] === 56, `当たり判定が36x56でない: ${info.body}`);
      assert(info.onGround, "開始後に床へ接地していない");
      assert(info.platforms > 0, "床が生成されていない");
      assert(!info.gameOver, "開始直後にゲームオーバーになっている");

      // 向き: 右へ進むときは反転なし（顔が右向き）、左へ進むときは反転する
      const facing = await page.evaluate(() => {
        const sc = window.game.scene.getScenes(true)[0];
        sc.facing = -1;
        sc.updateAnimation(true, true);
        const left = sc.player.flipX;
        sc.facing = 1;
        sc.updateAnimation(true, true);
        return { left, right: sc.player.flipX };
      });
      assert(facing.left === true && facing.right === false, `向きの反転が想定と違う: ${JSON.stringify(facing)}`);

      // ジャンプ: 接地判定が外れた直後（猶予内）・着地の少し前（先行入力）に押しても跳べる。時間切れなら跳べない
      const jump = await page.evaluate(() => {
        const sc = window.game.scene.getScenes(true)[0];
        const now = sc.time.now;
        const attempt = (pressedAgo, groundedAgo) => {
          sc.player.body.setVelocityY(0);
          sc.jumpPressedAt = now - pressedAgo;
          sc.lastGroundedAt = now - groundedAgo;
          const jumped = sc.tryJump(now);
          return { jumped, vy: sc.player.body.velocity.y };
        };
        return { coyote: attempt(0, 60), buffered: attempt(100, 0), late: attempt(0, 1000), notPressed: attempt(5000, 0) };
      });
      assert(jump.coyote.jumped && jump.coyote.vy < 0, "接地判定が外れた直後のジャンプが出ない");
      assert(jump.buffered.jumped, "先行入力のジャンプが出ない");
      assert(!jump.late.jumped && !jump.notPressed.jumped, "時間切れ・未入力でジャンプしてしまう");

      // HUD: 操作説明が、画面中央上部のSTAGE表示に重ならない
      const hud = await page.evaluate(() => {
        const sc = window.game.scene.getScenes(true)[0];
        return { hudRight: sc.hudText.getBounds().right, stageLeft: sc.stageLabel.getBounds().left };
      });
      assert(hud.hudRight < hud.stageLeft, `操作説明がSTAGE表示と重なっている: ${JSON.stringify(hud)}`);

      // 空中ダッシュは着地するまでに1回だけ。着地すると再び使える
      const dashRule = await page.evaluate(async () => {
        const sc = window.game.scene.getScenes(true)[0];
        sc.canDash = true;
        sc.airDashUsed = false;
        const first = sc.tryDash(false); // 空中1回目
        sc.canDash = true; // クールダウンが明けた想定
        const second = sc.tryDash(false); // 空中2回目 → 出ない
        sc.canDash = true;
        const ground = sc.tryDash(true); // 地上 → 出る
        sc.airDashUsed = true;
        await new Promise(r => setTimeout(r, 1200));
        return { first, second, ground, resetOnLanding: sc.airDashUsed === false };
      });
      assert(dashRule.first && !dashRule.second, `空中ダッシュが1回に制限されていない: ${JSON.stringify(dashRule)}`);
      assert(dashRule.ground, "地上ダッシュが出ない");
      assert(dashRule.resetOnLanding, "着地しても空中ダッシュが回復しない");

      // 全ステージが起動でき、クリアで次のステージへ進み、最終ステージのクリアでタイトルへ戻る
      const startStage = idx =>
        page.evaluate(([key, id, i]) => window.game.scene.getScenes(true)[0].scene.start(key, { characterId: id, stageIndex: i }), [chara.sceneKey, chara.id, idx]);
      const waitStage = idx =>
        page.waitForFunction(
          i => {
            const sc = window.game.scene.getScenes(true)[0];
            return sc && sc.stageIndex === i && sc.player?.body.blocked.down && !sc.isGameOver;
          },
          idx,
          { timeout: 15000 }
        );
      const skipBanner = async () => {
        await page.waitForTimeout(1100); // 900ms以降はクリックで早送りできる
        await click(GAME_W / 2, GAME_H / 2);
      };
      await startStage(1);
      await waitStage(1);
      await startStage(2);
      await waitStage(2);
      assert((await page.evaluate(() => window.game.scene.getScenes(true)[0].stageCount)) === 3, "ステージ数が3でない");

      await startStage(0);
      await waitStage(0);
      await page.evaluate(() => window.game.scene.getScenes(true)[0].handleClear());
      await skipBanner();
      await waitStage(1); // ステージ1クリア → ステージ2

      await startStage(2);
      await waitStage(2);
      await page.evaluate(() => window.game.scene.getScenes(true)[0].handleClear());
      await skipBanner();
      // 最終クリア → タイトル（ニコはスコア画面へ）
      await page.waitForFunction(k => window.game.scene.isActive(k), chara.id === "niko" ? "NikoScoreScene" : "TitleScene", { timeout: 15000 });
    }
    assert(errors.length === 0, `ブラウザエラー: ${errors.join(" | ")}`);
    console.log(`PASS ${chara.id}`);
  } catch (e) {
    failures.push(`${chara.id}: ${e.message}`);
    console.error(`FAIL ${chara.id}: ${e.message}`);
  } finally {
    await page.close();
  }
}

for (const chara of CHARACTERS) await runCase(chara);

// ---- ここから追加の確認（ホームへ戻るボタン・ニコのスコアとランキング） ----
async function enterGame(errors) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  page.on("pageerror", e => errors.push(`pageerror: ${e}`));
  page.on("console", m => m.type() === "error" && errors.push(`console: ${m.text()}`));
  await page.goto(`http://localhost:${PORT}/?debug`);
  await page.waitForFunction(() => window.game?.scene.isActive("TitleScene"), null, { timeout: 15000 });
  const box = await (await page.$("canvas")).boundingBox();
  const click = (gx, gy) => page.mouse.click(box.x + (gx / GAME_W) * box.width, box.y + (gy / GAME_H) * box.height);
  const clickUntil = async (gx, gy, key) => {
    for (let i = 0; i < 12; i++) {
      await click(gx, gy);
      await page.waitForTimeout(700);
      if (await page.evaluate(k => window.game.scene.isActive(k), key)) return;
    }
    throw new Error(`シーンが起動しない: ${key}`);
  };
  return { page, click, clickUntil };
}

// ホームへ戻るボタン: 1回押しでは戻らず（誤操作防止）、2回目で戻る。猶予を過ぎると元の表示に戻る
async function homeCase(label, chara) {
  const errors = [];
  const { page, clickUntil } = await enterGame(errors);
  try {
    await clickUntil(GAME_W / 2, GAME_H / 2 + 60, "CharacterSelectScene");
    if (chara) await clickUntil(chara.cardX, GAME_H / 2 + 20, chara.sceneKey);
    const key = chara ? chara.sceneKey : "CharacterSelectScene";
    await page.waitForTimeout(500);
    const first = await page.evaluate(() => {
      const sc = window.game.scene.getScenes(true)[0];
      sc.homeButton.emit("pointerdown");
      return sc.homeButton.text;
    });
    assert(first.includes("もう一度"), `1回押しで確認表示にならない: ${first}`);
    assert(await page.evaluate(k => window.game.scene.isActive(k), key), "1回押しでホームへ戻ってしまった");
    if (chara?.id === "mc") {
      // 猶予（2秒）はゲーム内の時間で数えるため、描画が遅い環境では実時間より長くかかる
      await page
        .waitForFunction(() => window.game.scene.getScenes(true)[0].homeButton.text === "ホームへ", null, { timeout: 10000 })
        .catch(() => {
          throw new Error("猶予を過ぎても表示が戻らない");
        });
      await page.evaluate(() => window.game.scene.getScenes(true)[0].homeButton.emit("pointerdown"));
    }
    await page.evaluate(() => window.game.scene.getScenes(true)[0].homeButton.emit("pointerdown"));
    await page.waitForFunction(() => window.game.scene.isActive("TitleScene"), null, { timeout: 10000 });
    assert(errors.length === 0, `ブラウザエラー: ${errors.join(" | ")}`);
    console.log(`PASS ホームへ戻る: ${label}`);
  } catch (e) {
    failures.push(`ホームへ戻る(${label}): ${e.message}`);
    console.error(`FAIL ホームへ戻る(${label}): ${e.message}`);
  } finally {
    await page.close();
  }
}
await homeCase("キャラ選択", null);
for (const chara of CHARACTERS) await homeCase(chara.id, chara);

// ニコ: 3ステージをクリア → スコア画面 → 名前を入力してランキングに登録
async function nikoScoreCase() {
  const errors = [];
  const { page, click, clickUntil } = await enterGame(errors);
  try {
    await clickUntil(GAME_W / 2, GAME_H / 2 + 60, "CharacterSelectScene");
    await clickUntil(582, GAME_H / 2 + 20, "NikoRushActionScene");
    const coins = [3, 5, 7];
    for (let i = 0; i < 3; i++) {
      await page.waitForFunction(
        k => { const sc = window.game.scene.getScenes(true)[0]; return sc.scene.key === "NikoRushActionScene" && sc.stageIndex === k && sc.player?.body.blocked.down && !sc.isGameOver; },
        i,
        { timeout: 20000 }
      );
      await page.evaluate(c => { const sc = window.game.scene.getScenes(true)[0]; sc.coinCount = c; sc.handleClear(); }, coins[i]);
      await page.waitForTimeout(1100);
      await click(GAME_W / 2, GAME_H / 2);
    }
    await page.waitForFunction(() => window.game.scene.isActive("NikoScoreScene"), null, { timeout: 20000 });
    await page.waitForTimeout(500);

    // 合計は、ステージごとの記録から計算した値と一致する
    const result = await page.evaluate(() => {
      const sc = window.game.scene.getScenes(true)[0];
      return { stages: sc.result.parts.map(p => ({ stageIndex: p.stageIndex, coins: p.coins, totalCoins: p.totalCoins, timeMs: p.timeMs })), total: sc.result.total, coins: sc.result.coins };
    });
    assert(result.stages.length === 3 && result.coins === 15, `スコア画面の記録が想定と違う: ${JSON.stringify(result)}`);
    assert(result.total === runScore(result.stages).total, "合計スコアが、ステージごとの記録からの計算と一致しない");
    assert(result.stages.every(st => st.timeMs > 0), "クリア時間が記録されていない");

    // 登録: ボタン → 名前入力 → ランキングに反映（M を含む名前を打っても、ミュートは切り替わらない）
    await click(300, 470);
    await page.waitForSelector('input[type="text"]');
    await page.fill('input[type="text"]', "ニコ太郎m");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.game.scene.getScenes(true)[0].registered === true, null, { timeout: 5000 });
    const saved = await page.evaluate(() => ({
      ranking: JSON.parse(localStorage.getItem("alibi-action-niko-ranking")),
      message: window.game.scene.getScenes(true)[0].messageText.text,
      muted: window.game.registry.get("muted")
    }));
    assert(saved.ranking.length === 1 && saved.ranking[0].name === "ニコ太郎m" && saved.ranking[0].score === result.total, `ランキングの保存内容が想定と違う: ${JSON.stringify(saved.ranking)}`);
    assert(saved.message.includes("1位"), `登録の表示が想定と違う: ${saved.message}`);
    assert(saved.muted === false, "名前入力でMキーを打つとミュートが切り替わってしまう");
    await click(300, 470); // 登録済みなので、入力欄は出ない
    await page.waitForTimeout(400);
    assert((await page.$('input[type="text"]')) === null, "登録済みなのに、もう一度入力欄が出る");

    // もう一度あそぶ → ステージ1から、記録はリセットされる
    await click(660, 470);
    await page.waitForFunction(() => { const sc = window.game.scene.getScenes(true)[0]; return sc.scene.key === "NikoRushActionScene" && sc.stageIndex === 0; }, null, { timeout: 15000 });
    assert((await page.evaluate(() => window.game.registry.get("nikoRun").stages.length)) === 0, "もう一度あそぶで記録がリセットされない");

    // スコア画面からホームへ戻ると、記録がリセットされる
    await page.evaluate(() => {
      const g = window.game;
      g.registry.set("nikoRun", { stages: [{ stageIndex: 0, coins: 1, totalCoins: 12, timeMs: 10000 }] });
      g.scene.getScenes(true)[0].scene.start("NikoScoreScene");
    });
    await page.waitForFunction(() => window.game.scene.isActive("NikoScoreScene"), null, { timeout: 15000 });
    await page.evaluate(() => { const sc = window.game.scene.getScenes(true)[0]; sc.homeButton.emit("pointerdown"); sc.homeButton.emit("pointerdown"); });
    await page.waitForFunction(() => window.game.scene.isActive("TitleScene"), null, { timeout: 10000 });
    assert((await page.evaluate(() => window.game.registry.get("nikoRun").stages.length)) === 0, "ホームへ戻っても記録がリセットされない");
    assert(errors.length === 0, `ブラウザエラー: ${errors.join(" | ")}`);
    console.log("PASS ニコのスコアとランキング");
  } catch (e) {
    failures.push(`ニコのスコア: ${e.message}`);
    console.error(`FAIL ニコのスコア: ${e.message}`);
  } finally {
    await page.close();
  }
}
await nikoScoreCase();

await browser.close();
await server.close();

if (failures.length > 0) {
  console.error(`\n${failures.length} 件失敗`);
  process.exit(1);
}
console.log("\nすべて成功");
