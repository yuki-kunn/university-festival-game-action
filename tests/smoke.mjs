// スモークテスト: ビルド済みの dist を vite preview で配信し、ヘッドレス
// Chromium で全キャラのシーンがエラーなく起動することを確認する。
// 使い方: npm run build && npm test
import { chromium } from "playwright";
import { preview } from "vite";

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
          for (let pass = 0; pass < 4; pass++) for (const o of sc.room.objects) if (!o.isExit) sc.handleObjectClick(o);
          sc.examineBox.setVisible(false);
          const code = Object.keys(sc.hints).sort().map(k => sc.hints[k]).join("");
          sc.openCodeInput();
          for (const ch of "0000") sc.inputDigit(ch);
          sc.submitCode();
          const attemptsAfterWrong = sc.attemptsLeft;
          sc.openCodeInput();
          for (const ch of code) sc.inputDigit(ch);
          sc.submitCode();
          return { code, expected: sc.room.code, attemptsAfterWrong, finished: sc.isFinished };
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
        await skipBanner();
        if (r < roomCount - 1) {
          await page.waitForFunction(i => { const sc = window.game.scene.getScenes(true)[0]; return sc && sc.roomIndex === i && !sc.isFinished; }, r + 1, { timeout: 15000 });
          await page.waitForTimeout(500);
        } else {
          await page.waitForFunction(() => window.game.scene.isActive("TitleScene"), null, { timeout: 15000 });
        }
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
      await page.waitForFunction(() => window.game.scene.isActive("TitleScene"), null, { timeout: 15000 }); // 最終クリア → タイトル
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

await browser.close();
await server.close();

if (failures.length > 0) {
  console.error(`\n${failures.length} 件失敗`);
  process.exit(1);
}
console.log("\nすべて成功");
