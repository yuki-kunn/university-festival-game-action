#!/usr/bin/env python3
"""ノベルパートの立ち絵(透過PNG)から、ゲーム内用のミニスプライトシートを生成する。

立ち絵を「頭 / 胴 / 左脚 / 右脚」に分割し、頭を大きく・胴脚を小さく縮めて
約2.5頭身にデフォルメしたうえで、パーツを動かして各コマを作る。

  pip install pillow
  python3 tools/make_mini_sprites.py SRC_DIR OUT_DIR

SRC_DIR に mc_normal_m.png / marico_normal.png / niko_normal.png を置く
(Google Drive 保管の元画像。リポジトリには含めない)。
OUT_DIR に mini_{mc,marico,niko}.png を出力する。

シートは 112x144 のコマを横に13枚並べた形（表示は 0.5 倍で 56x72）。
コマ順: idle x2 / run x6 / jump_up / jump_down / dash / miss x2
"""
import math
import os
import sys

from PIL import Image

CELL_W, CELL_H = 112, 144
BASELINE = 140  # 足元のy
CENTER_X = CELL_W / 2
A_HEAD = 0.17  # 頭の縮尺（元画像→コマ）
B_BODY = 0.0625  # 胴・脚の縮尺

# キャラ別の切断位置（トリミング後の高さに対する割合）
SPECS = {
    "mc": dict(src="mc_normal_m.png", head_end=0.19, torso_start=0.19, torso_end=0.53, legs_start=0.50, a=0.19, b=0.054),
    "marico": dict(src="marico_normal.png", head_end=0.185, torso_start=0.185, torso_end=0.60, legs_start=0.575),
    "niko": dict(src="niko_normal.png", head_end=0.185, torso_start=0.185, torso_end=0.60, legs_start=0.575),
}

FRAMES = 13


def load_trimmed(path):
    im = Image.open(path).convert("RGBA")
    return im.crop(im.getchannel("A").getbbox())


def neck_x(im, head_end):
    """首元付近の不透明ピクセルの重心x（全パーツ共通のx基準にする）。"""
    h, w = im.height, im.width
    a = im.getchannel("A")
    y0, y1 = int(h * (head_end - 0.015)), int(h * (head_end + 0.01))
    xs = []
    for y in range(y0, y1):
        for x in range(int(w * 0.25), int(w * 0.75)):
            if a.getpixel((x, y)) > 128:
                xs.append(x)
    return sum(xs) / len(xs) if xs else w / 2


def leg_split_x(im, legs_start):
    """脚の隙間（太もも〜足首の列ごとの不透明量が最小の列）を探す。"""
    h, w = im.height, im.width
    a = im.getchannel("A")
    y0, y1 = int(h * 0.74), int(h * 0.90)
    best_x, best_v = w // 2, None
    for x in range(int(w * 0.35), int(w * 0.65)):
        v = sum(1 for y in range(y0, y1, 2) if a.getpixel((x, y)) > 128)
        if best_v is None or v < best_v:
            best_v, best_x = v, x
    return best_x


def crop_scaled(im, box, scale):
    piece = im.crop(box)
    size = (max(1, round(piece.width * scale)), max(1, round(piece.height * scale)))
    return piece.resize(size, Image.LANCZOS)


def taper_top(piece, cx, base=7, slope=2.4):
    """胴の上端を台形に整える。肩の端が頭の横にはみ出して見えるのを防ぐ。"""
    px = piece.load()
    for r in range(min(piece.height, 14)):
        half = base + slope * r
        for x in range(piece.width):
            if abs(x - cx) > half:
                px[x, r] = (0, 0, 0, 0)


def build_pieces(im, spec):
    h, w = im.height, im.width
    nx = neck_x(im, spec["head_end"])
    sx = leg_split_x(im, spec["legs_start"])

    def row(r):
        return int(h * r)

    pieces = {}
    # 各パーツは (画像, 元画像の左端x, スケール, コマ上の左上y) で保持する
    a, b = spec.get("a", A_HEAD), spec.get("b", B_BODY)
    head = crop_scaled(im, (0, 0, w, row(spec["head_end"])), a)
    torso = crop_scaled(im, (0, row(spec["torso_start"]), w, row(spec["torso_end"])), b)
    taper_top(torso, nx * b)
    leg_top = row(spec["legs_start"])
    legl = crop_scaled(im, (0, leg_top, sx, h), b)
    legr = crop_scaled(im, (sx, leg_top, w, h), b)

    head_bottom_y = BASELINE - (1.0 - spec["head_end"]) * h * b + 2
    pieces["head"] = (head, CENTER_X - nx * a, head_bottom_y - head.height)
    torso_y = BASELINE - (1.0 - spec["torso_end"]) * h * b - torso.height
    pieces["torso"] = (torso, CENTER_X - nx * b, torso_y)
    leg_y = BASELINE - legl.height
    pieces["legl"] = (legl, CENTER_X - nx * b, leg_y)
    pieces["legr"] = (legr, CENTER_X - nx * b + sx * b, leg_y)
    return pieces


def draw(pieces, pose):
    """pose: パーツ名 -> (dx, dy, 回転角deg)。回転は各パーツの付け根を中心にする。"""
    out = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    for name in ("legl", "legr", "torso", "head"):
        img, x, y = pieces[name]
        dx, dy, rot = pose.get(name, (0, 0, 0))
        layer = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        layer.alpha_composite(img, (round(x), round(y)))
        if rot:
            if name == "head":
                pivot = (CENTER_X, y + img.height - 4)
            elif name == "torso":
                pivot = (CENTER_X, y + img.height)
            else:
                pivot = (x + img.width / 2, y + 2)
            layer = layer.rotate(rot, center=pivot, resample=Image.BICUBIC)
        out.alpha_composite(layer, (round(dx), round(dy)))
    return out


def poses():
    P = []
    # idle x2（呼吸で上下1px）
    P.append({})
    P.append({"head": (0, 1, 0), "torso": (0, 1, 0)})
    # run x6
    for k in range(6):
        ph = 2 * math.pi * k / 6
        s, c = math.sin(ph), math.cos(ph)
        bob = -2 * abs(s)
        P.append(
            {
                "head": (0, bob, -3),
                "torso": (0, bob, -4),
                "legl": (3 * s, -5 * max(0, s), 18 * s),
                "legr": (-3 * s, -5 * max(0, -s), -18 * s),
            }
        )
    # jump_up / jump_down
    P.append({"head": (0, -3, -3), "torso": (0, -2, -4), "legl": (-2, -6, 20), "legr": (3, -9, -25)})
    P.append({"head": (0, 1, 2), "torso": (0, 1, 0), "legl": (-5, 0, 14), "legr": (5, 0, -14)})
    # dash（前傾＋脚が後ろへ流れる）
    P.append({"head": (2, 2, -6), "torso": (2, 3, -10), "legl": (-6, -2, 38), "legr": (7, -3, -22)})
    # miss x2
    P.append({"head": (-2, -3, 12), "torso": (-2, -3, 8), "legl": (-4, -2, 18), "legr": (4, -2, -10)})
    P.append({"head": (-3, -1, 16), "torso": (-2, -1, 10), "legl": (-7, 0, 26), "legr": (6, 0, -18)})
    assert len(P) == FRAMES
    return P


def make_sheet(src_dir, cid, spec):
    im = load_trimmed(os.path.join(src_dir, spec["src"]))
    pieces = build_pieces(im, spec)
    sheet = Image.new("RGBA", (CELL_W * FRAMES, CELL_H), (0, 0, 0, 0))
    for i, pose in enumerate(poses()):
        sheet.alpha_composite(draw(pieces, pose), (i * CELL_W, 0))
    return sheet


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    src_dir, out_dir = sys.argv[1:]
    os.makedirs(out_dir, exist_ok=True)
    for cid, spec in SPECS.items():
        sheet = make_sheet(src_dir, cid, spec)
        out = os.path.join(out_dir, f"mini_{cid}.png")
        sheet.save(out, optimize=True)
        print(f"saved {out} {sheet.size[0]}x{sheet.size[1]} {os.path.getsize(out) // 1024}KB")


if __name__ == "__main__":
    main()
