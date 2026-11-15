#!/usr/bin/env python3
"""タイトル・キャラ選択・クリア/ミス演出用のUI素材を生成する。

  pip install pillow
  python3 tools/make_ui_assets.py SRC_DIR OUT_DIR

SRC_DIR に clubroom_night.png / clubroom_day.png（ノベルパートの背景。
Google Drive 保管でリポジトリには含めない）を置く。
ロゴは tools/render_title_logo.mjs で別途生成する。
座標は表示px、出力は2倍解像度（make_nina_assets.py の Art を流用）。
"""
import math
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

from make_nina_assets import FONT_JP, FONT_LATIN, INK, OUT_SCALE, Art, px


def gradient_fill(art, mask_fn, top, bottom, y0=0, y1=None):
    """mask_fn で描いた形を、縦グラデーションで塗る。"""
    w, h = art.img.size
    y1 = y1 if y1 is not None else art.h
    mask = Image.new("L", (w, h), 0)
    mask_fn(ImageDraw.Draw(mask))
    grad = Image.new("RGBA", (w, h))
    gp = grad.load()
    gy0, gy1 = px(y0), px(y1)
    for y in range(h):
        t = min(1.0, max(0.0, (y - gy0) / max(1, gy1 - gy0)))
        c = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)) + (255,)
        for x in range(w):
            gp[x, y] = c
    grad.putalpha(ImageChops.multiply(grad.getchannel("A"), mask))
    art.img.alpha_composite(grad)
    art.d = ImageDraw.Draw(art.img)


def background(src, out, blend, blur=0.0, vignette=0.55):
    im = Image.open(src).convert("RGB")
    h = 540
    w = round(im.width * h / im.height)
    im = im.resize((w, h), Image.LANCZOS)
    im = im.crop(((w - 960) // 2, 0, (w - 960) // 2 + 960, h))
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    im = ImageEnhance.Color(im).enhance(0.7)
    im = Image.blend(im, Image.new("RGB", im.size, (24, 18, 42)), blend)
    # 周辺を暗くして中央（ロゴ・ボタン）に視線を集める
    vg = Image.new("L", im.size, 0)
    ImageDraw.Draw(vg).ellipse([-200, -120, 1160, 660], fill=255)
    vg = vg.filter(ImageFilter.GaussianBlur(120))
    dark = Image.new("RGB", im.size, (10, 8, 18))
    im = Image.composite(im, Image.blend(im, dark, vignette), vg)
    im.save(out, quality=84, optimize=True)


def button(hover):
    a = Art(240, 64)
    top, bot = ((196, 172, 255), (146, 116, 228)) if hover else ((176, 150, 250), (130, 100, 214))
    if hover:
        a.glow(10, 8, 230, 60, (166, 140, 240, 150), 8)
    a.rect(4, 6, 236, 62, fill=(20, 16, 32, 120), radius=28)  # 影
    gradient_fill(a, lambda d: d.rounded_rectangle([px(4), px(2), px(236), px(58)], radius=px(28), fill=255), top, bot, 2, 58)
    a.rect(4, 2, 236, 58, outline=(236, 228, 255, 220) if hover else (214, 200, 255, 190), width=1.5, radius=28)
    a.rect(20, 6, 220, 14, fill=(255, 255, 255, 56), radius=6)  # 上面のツヤ
    return a


def card(hover):
    a = Art(180, 330)
    if hover:
        gradient_fill(a, lambda d: d.rounded_rectangle([0, 0, px(180) - 1, px(330) - 1], radius=px(10), fill=255), (58, 50, 86), (34, 30, 52))
        a.glow(10, 10, 170, 320, (166, 140, 240, 55), 24)
        a.rect(1.5, 1.5, 178.5, 328.5, outline=(176, 150, 250, 255), width=3, radius=10)
    else:
        gradient_fill(a, lambda d: d.rounded_rectangle([0, 0, px(180) - 1, px(330) - 1], radius=px(10), fill=255), (40, 35, 58), (27, 24, 40))
        a.rect(1, 1, 179, 329, outline=(74, 63, 102, 255), width=2, radius=10)
    a.rect(5, 5, 175, 325, outline=(255, 255, 255, 14), width=1, radius=7)
    # 角の飾り
    for (x, y, sx, sy) in [(8, 8, 1, 1), (172, 8, -1, 1), (8, 322, 1, -1), (172, 322, -1, -1)]:
        a.line([(x, y + sy * 14), (x, y), (x + sx * 14, y)], (166, 140, 240, 220 if hover else 130), 2)
    return a


def star(a, cx, cy, r, fill):
    k = 0.28
    a.poly([(cx, cy - r), (cx + r * k, cy - r * k), (cx + r, cy), (cx + r * k, cy + r * k), (cx, cy + r),
            (cx - r * k, cy + r * k), (cx - r, cy), (cx - r * k, cy - r * k)], fill=fill)


def banner(top, bottom, tail, main, sub, text_fill, shadow, sub_fill):
    a = Art(520, 140)
    # 左右の帯（燕尾）
    for side in (0, 1):
        x0, x1 = (6, 96) if side == 0 else (424, 514)
        notch = 30 if side == 0 else 490
        pts = [(x0, 44), (x1, 44), (x1, 112), (x0, 112), (notch, 78)] if side == 0 else [(x0, 44), (x1, 44), (x1, 112), (x0, 112)]
        if side == 1:
            pts = [(x0, 44), (x1, 44), (490, 78), (x1, 112), (x0, 112)]
        a.poly(pts, fill=tail, outline=INK, width=2)
    a.glow(40, 20, 480, 124, (top[0], top[1], top[2], 90), 14)
    gradient_fill(a, lambda d: d.rounded_rectangle([px(40), px(16), px(480), px(120)], radius=px(14), fill=255), top, bottom, 16, 120)
    a.rect(40, 16, 480, 120, outline=INK, width=2.5, radius=14)
    a.rect(48, 22, 472, 114, outline=(255, 255, 255, 120), width=1.5, radius=10)
    a.rect(60, 24, 460, 34, fill=(255, 255, 255, 60), radius=6)
    star(a, 66, 70, 11, (255, 255, 255, 230))
    star(a, 454, 70, 11, (255, 255, 255, 230))
    # 星の飾りに重ならない幅（約330px）に収まる大きさへ自動で縮める
    size = 50
    while size > 24 and ImageFont.truetype(FONT_LATIN, px(size)).getlength(main) > px(330):
        size -= 1
    a.text(260 + 2, 62 + 3, main, size, shadow, font=FONT_LATIN)
    a.text(260, 62, main, size, text_fill, font=FONT_LATIN)
    a.text(260, 100, sub, 16, sub_fill, font=FONT_JP)
    return a


def spark():
    a = Art(32, 32)
    a.glow(2, 2, 30, 30, (255, 255, 255, 120), 5)
    star(a, 16, 16, 15, (255, 255, 255, 255))
    a.ellipse(12, 12, 20, 20, fill=(255, 255, 255, 255))
    return a


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    src, out = sys.argv[1:]
    os.makedirs(out, exist_ok=True)
    background(os.path.join(src, "clubroom_night.png"), os.path.join(out, "bg_title.jpg"), blend=0.46)
    background(os.path.join(src, "clubroom_day.png"), os.path.join(out, "bg_select.jpg"), blend=0.66, blur=1.2)
    button(False).save(os.path.join(out, "ui_button.png"))
    button(True).save(os.path.join(out, "ui_button_hover.png"))
    card(False).save(os.path.join(out, "card_frame.png"))
    card(True).save(os.path.join(out, "card_frame_hover.png"))
    banner((255, 226, 130), (222, 158, 46), (150, 98, 40, 255), "STAGE CLEAR!", "ステージクリア",
           (74, 44, 112, 255), (255, 244, 200, 255), (110, 70, 30, 255)).save(os.path.join(out, "banner_clear.png"))
    banner((208, 78, 92), (124, 34, 54), (88, 24, 40, 255), "MISS", "ミス",
           (255, 255, 255, 255), (60, 10, 24, 255), (255, 214, 220, 255)).save(os.path.join(out, "banner_miss.png"))
    banner((150, 244, 200), (60, 172, 132), (36, 110, 90, 255), "ESCAPE!", "脱出成功",
           (24, 72, 70, 255), (214, 255, 236, 255), (20, 84, 70, 255)).save(os.path.join(out, "banner_escape.png"))
    spark().save(os.path.join(out, "spark.png"))
    for f in sorted(os.listdir(out)):
        print(f, os.path.getsize(os.path.join(out, f)) // 1024, "KB")


if __name__ == "__main__":
    main()
