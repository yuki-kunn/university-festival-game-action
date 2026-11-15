#!/usr/bin/env python3
"""ステージ部品（床・棘・ゴール・コイン・スイッチ・ブロック・背景）を生成する。

  pip install pillow
  python3 tools/make_stage_assets.py SRC_DIR OUT_DIR

SRC_DIR に corridor.png / broadcast_room.png / library.png（ノベルパートの背景。
Google Drive 保管でリポジトリには含めない）を置く。OUT_DIR に出力する。
部品は 2 倍解像度で描き、ゲーム側で 0.5 倍表示する。
"""
import math
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

SS = 4  # スーパーサンプリング倍率

OUTLINE = (23, 20, 33, 255)
PURPLE = (166, 140, 240, 255)
PURPLE_DARK = (74, 63, 102, 255)


def canvas(w, h):
    return Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))


def finish(img, w, h):
    return img.resize((w, h), Image.LANCZOS)


def vgrad(w, h, top, bottom):
    g = Image.new("RGBA", (w, h))
    px = g.load()
    for y in range(h):
        t = y / max(1, h - 1)
        c = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(4))
        for x in range(w):
            px[x, y] = c
    return g


def tile_ground():
    w = h = 80
    img = canvas(w, h)
    body = vgrad(w * SS, h * SS, (52, 46, 74, 255), (33, 29, 46, 255))
    img.alpha_composite(body)
    d = ImageDraw.Draw(img)
    # 上面の光る縁
    d.rectangle([0, 0, w * SS, 12 * SS], fill=(111, 95, 176, 255))
    d.rectangle([0, 0, w * SS, 4 * SS], fill=PURPLE)
    d.rectangle([0, 12 * SS, w * SS, 14 * SS], fill=(23, 20, 33, 160))
    # 目地（右端と下端。横にも縦にも継ぎ目なく並ぶ）
    d.rectangle([(w - 2) * SS, 0, w * SS, h * SS], fill=(23, 20, 33, 255))
    d.rectangle([0, (h - 2) * SS, w * SS, h * SS], fill=(23, 20, 33, 255))
    # 下地のうっすらした模様
    for (x, y, ww) in [(10, 30, 22), (46, 44, 18), (20, 60, 28), (54, 24, 14)]:
        d.rectangle([x * SS, y * SS, (x + ww) * SS, (y + 2) * SS], fill=(74, 63, 102, 120))
    return finish(img, w, h)


def tile_block():
    w = h = 80
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w * SS, h * SS], fill=(124, 92, 196, 255))
    d.rectangle([4 * SS, 4 * SS, (w - 4) * SS, (h - 4) * SS], fill=(156, 122, 214, 255))
    # 斜めのハッチ
    hatch = Image.new("RGBA", img.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(hatch)
    for k in range(-h, w + h, 16):
        hd.line([(k * SS, h * SS), ((k + h) * SS, 0)], fill=(255, 255, 255, 46), width=3 * SS)
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rectangle([4 * SS, 4 * SS, (w - 4) * SS, (h - 4) * SS], fill=255)
    hatch.putalpha(ImageChops.multiply(hatch.getchannel("A"), mask))
    img.alpha_composite(hatch)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w * SS - 1, h * SS - 1], outline=(217, 200, 255, 255), width=3 * SS)
    d.rectangle([3 * SS, 3 * SS, (w - 3) * SS, 4 * SS], fill=(255, 255, 255, 90))
    return finish(img, w, h)


def spike():
    w = h = 64
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    base_y, tip_y = 60, 6
    teeth = [(2, 22, 42), (22, 42, 22), (42, 62, 42)]
    centers = [(2, 21, 11.5), (21, 43, 32), (43, 62, 52.5)]
    for (x0, x1, cx) in centers:
        tri = [(x0 * SS, base_y * SS), (cx * SS, tip_y * SS), (x1 * SS, base_y * SS)]
        d.polygon(tri, fill=(217, 79, 79, 255), outline=OUTLINE)
        d.line(tri + [tri[0]], fill=OUTLINE, width=3 * SS, joint="curve")
        # 左面のハイライト
        hl = [(x0 * SS + 4 * SS, (base_y - 3) * SS), (cx * SS, (tip_y + 6) * SS), (cx * SS, (base_y - 3) * SS)]
        d.polygon(hl, fill=(255, 138, 138, 255))
    d.rectangle([0, (base_y - 2) * SS, w * SS, (base_y + 4) * SS], fill=OUTLINE)
    return finish(img, w, h)


def glow(size, box, color, blur):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(box, radius=40 * SS, fill=color)
    return layer.filter(ImageFilter.GaussianBlur(blur * SS))


def goal():
    w, h = 96, 160
    img = canvas(w, h)
    img.alpha_composite(glow(img.size, [8 * SS, 6 * SS, 88 * SS, 156 * SS], (166, 140, 240, 150), 6))
    d = ImageDraw.Draw(img)
    # アーチ型の扉枠
    def arch(x0, y0, x1, y1):
        r = (x1 - x0) / 2
        d.pieslice([x0 * SS, y0 * SS, x1 * SS, (y0 + 2 * r) * SS], 180, 360, fill=None)
        return r
    frame = Image.new("RGBA", img.size, (0, 0, 0, 0))
    fd = ImageDraw.Draw(frame)
    fd.ellipse([10 * SS, 8 * SS, 86 * SS, 84 * SS], fill=(212, 207, 224, 255))
    fd.rectangle([10 * SS, 46 * SS, 86 * SS, 156 * SS], fill=(212, 207, 224, 255))
    img.alpha_composite(frame)
    inner = Image.new("RGBA", img.size, (0, 0, 0, 0))
    idr = ImageDraw.Draw(inner)
    idr.ellipse([18 * SS, 16 * SS, 78 * SS, 76 * SS], fill=(255, 255, 255, 255))
    idr.rectangle([18 * SS, 46 * SS, 78 * SS, 156 * SS], fill=(255, 255, 255, 255))
    # 内側は中心が白く縁が紫の放射グラデーション
    grad = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gpx = grad.load()
    cx, cy = 48 * SS, 96 * SS
    rmax = 70 * SS
    for y in range(16 * SS, 156 * SS):
        for x in range(18 * SS, 78 * SS):
            t = min(1.0, math.hypot((x - cx) * 1.15, (y - cy) * 0.55) / rmax)
            c0, c1 = (250, 244, 255), (150, 118, 232)
            gpx[x, y] = tuple(round(c0[i] + (c1[i] - c0[i]) * t) for i in range(3)) + (255,)
    grad.putalpha(ImageChops.multiply(grad.getchannel("A"), inner.getchannel("A")))
    img.alpha_composite(grad)
    d = ImageDraw.Draw(img)
    # 枠の輪郭と中央の継ぎ目
    d.arc([10 * SS, 8 * SS, 86 * SS, 84 * SS], 180, 360, fill=OUTLINE, width=3 * SS)
    d.line([(10 * SS, 46 * SS), (10 * SS, 156 * SS)], fill=OUTLINE, width=3 * SS)
    d.line([(86 * SS, 46 * SS), (86 * SS, 156 * SS)], fill=OUTLINE, width=3 * SS)
    d.line([(8 * SS, 155 * SS), (88 * SS, 155 * SS)], fill=OUTLINE, width=4 * SS)
    d.arc([18 * SS, 16 * SS, 78 * SS, 76 * SS], 180, 360, fill=(255, 255, 255, 200), width=2 * SS)
    # きらめき
    for (sx, sy, r) in [(36, 60, 5), (60, 100, 4), (44, 128, 3)]:
        d.polygon([(sx * SS, (sy - r) * SS), ((sx + r * 0.3) * SS, (sy - r * 0.3) * SS), ((sx + r) * SS, sy * SS),
                   ((sx + r * 0.3) * SS, (sy + r * 0.3) * SS), (sx * SS, (sy + r) * SS),
                   ((sx - r * 0.3) * SS, (sy + r * 0.3) * SS), ((sx - r) * SS, sy * SS),
                   ((sx - r * 0.3) * SS, (sy - r * 0.3) * SS)], fill=(255, 255, 255, 255))
    return finish(img, w, h)


def coin_sheet():
    fw = fh = 40
    widths = [34, 28, 16, 5, 16, 28]
    sheet = Image.new("RGBA", (fw * len(widths), fh), (0, 0, 0, 0))
    for i, cw in enumerate(widths):
        img = canvas(fw, fh)
        d = ImageDraw.Draw(img)
        cx, cy, ry = fw / 2, fh / 2, 17
        rx = cw / 2
        d.ellipse([(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS],
                  fill=(255, 210, 76, 255), outline=(150, 96, 12, 255), width=3 * SS)
        if cw > 10:
            rx2, ry2 = rx * 0.68, ry * 0.68
            d.ellipse([(cx - rx2) * SS, (cy - ry2) * SS, (cx + rx2) * SS, (cy + ry2) * SS],
                      outline=(217, 154, 26, 255), width=2 * SS)
        if cw > 22:
            # 星マーク
            pts = []
            for k in range(10):
                ang = -math.pi / 2 + k * math.pi / 5
                rr = (7 if k % 2 == 0 else 3)
                pts.append(((cx + rr * (cw / 34) * math.cos(ang)) * SS, (cy + rr * math.sin(ang)) * SS))
            d.polygon(pts, fill=(255, 245, 190, 255))
        # ハイライト（縁を向けた細いコマでは描かない）
        if cw > 12:
            d.arc([(cx - rx + 3) * SS, (cy - ry + 3) * SS, (cx + rx - 3) * SS, (cy + ry - 3) * SS], 200, 250,
                  fill=(255, 255, 255, 200), width=2 * SS)
        sheet.alpha_composite(finish(img, fw, fh), (i * fw, 0))
    return sheet


def switch(on):
    w = h = 72
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([4 * SS, 30 * SS, 68 * SS, 68 * SS], radius=8 * SS, fill=(58, 52, 80, 255), outline=OUTLINE, width=3 * SS)
    d.rectangle([8 * SS, 34 * SS, 64 * SS, 38 * SS], fill=(111, 95, 176, 255))
    if on:
        img.alpha_composite(glow(img.size, [14 * SS, 18 * SS, 58 * SS, 52 * SS], (140, 240, 192, 170), 5))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([14 * SS, 36 * SS, 58 * SS, 52 * SS], radius=7 * SS, fill=(140, 240, 192, 255), outline=OUTLINE, width=3 * SS)
        d.rounded_rectangle([20 * SS, 38 * SS, 52 * SS, 42 * SS], radius=2 * SS, fill=(220, 255, 240, 255))
    else:
        d.rounded_rectangle([14 * SS, 14 * SS, 58 * SS, 36 * SS], radius=9 * SS, fill=(138, 124, 96, 255), outline=OUTLINE, width=3 * SS)
        d.rounded_rectangle([20 * SS, 18 * SS, 52 * SS, 23 * SS], radius=2 * SS, fill=(176, 162, 132, 255))
    return finish(img, w, h)


def background(src_path, out_path, blend):
    """ノベルの背景を、横スクロール用に 1920x540 の左右対称タイルへ加工する。"""
    im = Image.open(src_path).convert("RGB")
    h = 540
    w = round(im.width * h / im.height)
    im = im.resize((w, h), Image.LANCZOS)
    im = im.crop(((w - 960) // 2, 0, (w - 960) // 2 + 960, h))
    # 彩度を落として暗い紫に寄せ、キャラ・足場・コインが読めるようにする
    im = ImageEnhance.Color(im).enhance(0.55)
    im = Image.blend(im, Image.new("RGB", im.size, (28, 22, 46)), blend)
    tile = Image.new("RGB", (1920, h))
    tile.paste(im, (0, 0))
    tile.paste(im.transpose(Image.FLIP_LEFT_RIGHT), (960, 0))
    tile.save(out_path, quality=84, optimize=True)


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    src, out = sys.argv[1:]
    os.makedirs(out, exist_ok=True)
    tile_ground().save(os.path.join(out, "tile_ground.png"), optimize=True)
    tile_block().save(os.path.join(out, "tile_block.png"), optimize=True)
    spike().save(os.path.join(out, "spike.png"), optimize=True)
    goal().save(os.path.join(out, "goal.png"), optimize=True)
    coin_sheet().save(os.path.join(out, "coin.png"), optimize=True)
    switch(False).save(os.path.join(out, "switch_off.png"), optimize=True)
    switch(True).save(os.path.join(out, "switch_on.png"), optimize=True)
    # 元画像の明るさに合わせて暗さを変える（図書室は特に明るい）
    for name, key, blend in [("corridor", "bg_corridor", 0.66), ("broadcast_room", "bg_broadcast", 0.6), ("library", "bg_library", 0.76)]:
        background(os.path.join(src, name + ".png"), os.path.join(out, key + ".jpg"), blend)
    for f in sorted(os.listdir(out)):
        print(f, os.path.getsize(os.path.join(out, f)) // 1024, "KB")


if __name__ == "__main__":
    main()
