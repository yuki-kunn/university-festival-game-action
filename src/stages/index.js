import { STAGE1 } from "./stage1.js";
import { MC_STAGE2 } from "./mcStage2.js";
import { MC_STAGE3 } from "./mcStage3.js";
import { MARICO_STAGE1 } from "./maricoStage1.js";
import { MARICO_STAGE2 } from "./maricoStage2.js";
import { MARICO_STAGE3 } from "./maricoStage3.js";
import { NIKO_STAGE1 } from "./nikoStage1.js";
import { NIKO_STAGE2 } from "./nikoStage2.js";
import { NIKO_STAGE3 } from "./nikoStage3.js";

// キャラIDごとのステージ一覧（先頭がステージ1）。ニナは部屋型でステージを持たない。
export const STAGES = {
  mc: [STAGE1, MC_STAGE2, MC_STAGE3],
  marico: [MARICO_STAGE1, MARICO_STAGE2, MARICO_STAGE3],
  niko: [NIKO_STAGE1, NIKO_STAGE2, NIKO_STAGE3]
};
