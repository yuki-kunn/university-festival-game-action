#!/usr/bin/env python3
"""ニナの脱出パズルの部屋（壁4面とオブジェクト）の画像を生成する。

  pip install pillow
  python3 tools/make_nina_assets.py OUT_DIR

座標は「ゲーム内の表示px」で指定し、2倍解像度で出力する（表示は0.5倍）。
壁は 920x420、オブジェクトは src/stages/ninaEscapeRoom.js の width/height に合わせる。
壁の座標は壁画像内のローカル座標（オブジェクトの画面座標 x-20, y-70）。
"""
import math
import os
import random
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

SS = 3  # スーパーサンプリング
OUT_SCALE = 2  # 出力解像度（表示px -> 出力px）
S = SS * OUT_SCALE
FONT_JP = "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf"
FONT_LATIN = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

INK = (23, 20, 33)
WOOD = (122, 84, 60)
WOOD_DARK = (84, 56, 42)
WOOD_LIGHT = (160, 114, 80)
PAPER = (236, 226, 200)
GOLD = (232, 190, 80)
PURPLE = (166, 140, 240)


def px(v):
    return int(round(v * S))


def _translucent(*colors):
    return any(c is not None and len(c) == 4 and c[3] < 255 for c in colors)


class Art:
    """表示px座標で描けるキャンバス。"""

    def _draw(self, colors, fn):
        """半透明色を含む場合は別レイヤーに描いて合成する（直接描くと透明で上書きされる）。"""
        if _translucent(*colors):
            layer = Image.new("RGBA", self.img.size, (0, 0, 0, 0))
            fn(ImageDraw.Draw(layer))
            self.img.alpha_composite(layer)
            self.d = ImageDraw.Draw(self.img)
        else:
            fn(self.d)

    def __init__(self, w, h, bg=(0, 0, 0, 0)):
        self.w, self.h = w, h
        self.img = Image.new("RGBA", (px(w), px(h)), bg)
        self.d = ImageDraw.Draw(self.img)

    def rect(self, x0, y0, x1, y1, fill=None, outline=None, width=1.5, radius=0):
        box = [px(x0), px(y0), px(x1), px(y1)]
        kw = dict(fill=fill, outline=outline, width=max(1, px(width)) if outline else 0)
        if radius:
            self._draw((fill, outline), lambda d: d.rounded_rectangle(box, radius=px(radius), **kw))
        else:
            self._draw((fill, outline), lambda d: d.rectangle(box, **kw))

    def ellipse(self, x0, y0, x1, y1, fill=None, outline=None, width=1.5):
        self._draw((fill, outline), lambda d: d.ellipse([px(x0), px(y0), px(x1), px(y1)], fill=fill, outline=outline,
                                                         width=max(1, px(width)) if outline else 0))

    def poly(self, pts, fill=None, outline=None, width=1.5):
        p = [(px(x), px(y)) for x, y in pts]
        self._draw((fill,), lambda d: d.polygon(p, fill=fill))
        if outline:
            self._draw((outline,), lambda d: d.line(p + [p[0]], fill=outline, width=max(1, px(width)), joint="curve"))

    def line(self, pts, fill, width=1.5):
        pts_px = [(px(x), px(y)) for x, y in pts]
        self._draw((fill,), lambda d: d.line(pts_px, fill=fill, width=max(1, px(width)), joint="curve"))

    def arc(self, x0, y0, x1, y1, a0, a1, fill, width=1.5):
        self.d.arc([px(x0), px(y0), px(x1), px(y1)], a0, a1, fill=fill, width=max(1, px(width)))

    def text(self, x, y, s, size, fill, anchor="mm", font=FONT_JP):
        f = ImageFont.truetype(font, px(size))
        self.d.text((px(x), px(y)), s, font=f, fill=fill, anchor=anchor)

    def mixed_text(self, cx, cy, parts, size, fill):
        """文字ごとにフォントを切り替えて中央揃えで描く（日本語フォントに数字の字形が無いため）。"""
        fonts = [ImageFont.truetype(f, px(size)) for _, f in parts]
        widths = [fnt.getlength(t) for (t, _), fnt in zip(parts, fonts)]
        x = px(cx) - sum(widths) / 2
        for (t, _), fnt, w in zip(parts, fonts, widths):
            self.d.text((x, px(cy)), t, font=fnt, fill=fill, anchor="lm")
            x += w

    def glow(self, x0, y0, x1, y1, color, blur):
        layer = Image.new("RGBA", self.img.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).ellipse([px(x0), px(y0), px(x1), px(y1)], fill=color)
        self.img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(px(blur))))
        self.d = ImageDraw.Draw(self.img)

    def paste(self, other, x, y):
        self.img.alpha_composite(other.img, (px(x), px(y)))
        self.d = ImageDraw.Draw(self.img)

    def rotated(self, deg, cx, cy):
        r = self.img.rotate(deg, center=(px(cx), px(cy)), resample=Image.BICUBIC)
        out = Art(self.w, self.h)
        out.img = r
        out.d = ImageDraw.Draw(out.img)
        return out

    def save(self, path):
        out = self.img.resize((self.w * OUT_SCALE, self.h * OUT_SCALE), Image.LANCZOS)
        out.save(path, optimize=True)


def vgrad_rect(art, x0, y0, x1, y1, top, bottom):
    w, h = px(x1) - px(x0), px(y1) - px(y0)
    g = Image.new("RGBA", (w, h))
    gp = g.load()
    for y in range(h):
        t = y / max(1, h - 1)
        c = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)) + (255,)
        for x in range(w):
            gp[x, y] = c
    art.img.alpha_composite(g, (px(x0), px(y0)))
    art.d = ImageDraw.Draw(art.img)


# ---------------------------------------------------------------- 壁

WALL_W, WALL_H = 920, 420
FLOOR_Y = 330  # 床の境目（壁ローカル座標。画面y=400）


def base_wall():
    a = Art(WALL_W, WALL_H)
    vgrad_rect(a, 0, 0, WALL_W, FLOOR_Y, (46, 40, 74), (36, 30, 58))
    # 縦縞の壁紙
    for x in range(0, WALL_W, 40):
        a.rect(x, 0, x + 20, 240, fill=(255, 255, 255, 9))
    # 腰壁（下側のパネル）
    a.rect(0, 240, WALL_W, FLOOR_Y - 8, fill=(62, 50, 90))
    a.rect(0, 240, WALL_W, 244, fill=(96, 80, 134))
    for x in range(10, WALL_W, 120):
        a.rect(x, 252, x + 100, FLOOR_Y - 18, outline=(88, 72, 124), width=1.5, radius=2)
    # 幅木
    a.rect(0, FLOOR_Y - 8, WALL_W, FLOOR_Y, fill=(30, 25, 46))
    a.rect(0, FLOOR_Y - 8, WALL_W, FLOOR_Y - 6, fill=(70, 58, 100))
    # 床
    vgrad_rect(a, 0, FLOOR_Y, WALL_W, WALL_H, (74, 54, 52), (46, 33, 36))
    for i in range(1, 7):
        y = FLOOR_Y + i * 15
        a.line([(0, y), (WALL_W, y)], (30, 22, 26, 150), 1.5)
    rnd = random.Random(7)
    for _ in range(26):
        x = rnd.randrange(0, WALL_W)
        row = rnd.randrange(0, 6)
        y = FLOOR_Y + row * 15
        a.line([(x, y), (x, y + 15)], (30, 22, 26, 150), 1.5)
    return a


def sconce(a, x, y):
    a.glow(x - 60, y - 70, x + 60, y + 60, (255, 214, 140, 70), 18)
    a.rect(x - 7, y + 4, x + 7, y + 22, fill=(150, 120, 70), outline=INK, width=1.5, radius=2)
    a.poly([(x - 13, y + 4), (x + 13, y + 4), (x + 8, y - 16), (x - 8, y - 16)], fill=(255, 226, 160), outline=INK)


def frame(a, x0, y0, x1, y1, art_fn=None, w=5):
    a.rect(x0, y0, x1, y1, fill=WOOD_DARK, outline=INK, width=1.5)
    a.rect(x0 + w, y0 + w, x1 - w, y1 - w, fill=(200, 190, 170), outline=INK, width=1)
    if art_fn:
        art_fn(x0 + w, y0 + w, x1 - w, y1 - w)


def landscape(a):
    def fn(x0, y0, x1, y1):
        vgrad_rect(a, x0, y0, x1, y1, (150, 130, 180), (230, 170, 140))
        a.poly([(x0, y1), (x0 + (x1 - x0) * 0.35, y0 + (y1 - y0) * 0.45), (x0 + (x1 - x0) * 0.6, y1)], fill=(70, 60, 100))
        a.poly([(x0 + (x1 - x0) * 0.4, y1), (x0 + (x1 - x0) * 0.75, y0 + (y1 - y0) * 0.55), (x1, y1)], fill=(52, 44, 80))
    return fn


def window(a, x0, y0, x1, y1):
    a.rect(x0 - 6, y0 - 6, x1 + 6, y1 + 6, fill=(90, 70, 56), outline=INK, width=1.5)
    vgrad_rect(a, x0, y0, x1, y1, (18, 16, 48), (46, 40, 88))
    a.glow(x0 + (x1 - x0) * 0.6 - 30, y0 + 20 - 30, x0 + (x1 - x0) * 0.6 + 30, y0 + 20 + 30, (255, 250, 220, 90), 10)
    a.ellipse(x0 + (x1 - x0) * 0.6 - 13, y0 + 20 - 13, x0 + (x1 - x0) * 0.6 + 13, y0 + 20 + 13, fill=(255, 250, 225), outline=None)
    a.ellipse(x0 + (x1 - x0) * 0.6 - 5, y0 + 20 - 16, x0 + (x1 - x0) * 0.6 + 21, y0 + 20 + 10, fill=(24, 20, 52))
    for (sx, sy) in [(0.2, 0.12), (0.35, 0.3), (0.8, 0.5), (0.15, 0.55)]:
        a.ellipse(x0 + (x1 - x0) * sx - 1.5, y0 + (y1 - y0) * sy - 1.5, x0 + (x1 - x0) * sx + 1.5, y0 + (y1 - y0) * sy + 1.5, fill=(255, 255, 255))
    a.rect(x0 + (x1 - x0) / 2 - 2.5, y0, x0 + (x1 - x0) / 2 + 2.5, y1, fill=(90, 70, 56))
    a.rect(x0, y0 + (y1 - y0) / 2 - 2.5, x1, y0 + (y1 - y0) / 2 + 2.5, fill=(90, 70, 56))


def wall_north():
    a = base_wall()
    sconce(a, 150, 120)
    sconce(a, 650, 120)
    # オカルト研究部の看板
    a.rect(700, 70, 880, 130, fill=(32, 28, 48), outline=(150, 120, 70), width=2.5, radius=3)
    a.text(790, 90, "OCCULT CLUB", 14, (232, 190, 80), font=FONT_LATIN)
    a.text(790, 112, "オカルト研究部", 13, (212, 207, 224))
    # コート掛け
    a.rect(60, 60, 130, 68, fill=WOOD_DARK, outline=INK, width=1.5)
    for hx in (75, 95, 115):
        a.ellipse(hx - 3, 68, hx + 3, 74, fill=(170, 140, 90), outline=INK, width=1)
    return a


def wall_east():
    a = base_wall()
    # 掲示板（張り紙の背景）
    a.rect(250, 40, 470, 200, fill=(150, 108, 70), outline=INK, width=2)
    a.rect(256, 46, 464, 194, fill=(196, 150, 100))
    rnd = random.Random(3)
    for _ in range(90):
        x, y = rnd.uniform(258, 462), rnd.uniform(48, 192)
        a.ellipse(x, y, x + 2, y + 2, fill=(160, 116, 78))
    # 水晶玉を載せる台
    a.rect(520, 300, 710, FLOOR_Y - 8, fill=(84, 56, 42), outline=INK, width=2)
    a.rect(520, 300, 710, 306, fill=(122, 84, 60), outline=INK, width=1.5)
    # 窓
    window(a, 770, 40, 890, 200)
    sconce(a, 520, 110)
    return a


def wall_south():
    a = base_wall()
    frame(a, 340, 40, 400, 100, landscape(a))
    frame(a, 500, 40, 570, 120, landscape(a))
    frame(a, 780, 50, 860, 110, landscape(a))
    sconce(a, 280, 170)
    sconce(a, 770, 190)
    # 巻物立て
    a.rect(60, 270, 110, FLOOR_Y - 8, fill=(100, 72, 54), outline=INK, width=1.5)
    for k in range(3):
        a.rect(66 + k * 14, 252 - k * 6, 76 + k * 14, 280, fill=(214, 200, 168), outline=INK, width=1)
    return a


def wall_west():
    a = base_wall()
    window(a, 390, 30, 530, 210)
    # カーテン
    for side in (0, 1):
        x0 = 340 if side == 0 else 535
        a.rect(x0, 24, x0 + 55, 232, fill=(104, 54, 84), outline=INK, width=1.5)
        for k in range(1, 5):
            a.line([(x0 + k * 11, 24), (x0 + k * 11, 232)], (74, 34, 60), 1.5)
    sconce(a, 160, 120)
    sconce(a, 760, 120)
    # 姿見（ニナルートの鏡の気配）
    a.rect(40, 160, 100, 322, fill=WOOD_DARK, outline=INK, width=2, radius=6)
    vgrad_rect(a, 46, 168, 94, 314, (120, 120, 170), (80, 80, 130))
    a.poly([(52, 172), (72, 172), (52, 214)], fill=(255, 255, 255, 40))
    return a


# ---------------------------------------------------------------- オブジェクト


def obj_door():
    a = Art(160, 300)
    a.rect(0, 0, 160, 300, fill=(58, 40, 40), outline=INK, width=2.5)
    a.rect(10, 10, 150, 300, fill=(126, 70, 60), outline=INK, width=2)
    for (x0, y0, x1, y1) in [(24, 24, 78, 130), (82, 24, 136, 130), (24, 142, 78, 280), (82, 142, 136, 280)]:
        a.rect(x0, y0, x1, y1, fill=(146, 86, 72), outline=(88, 46, 40), width=2, radius=2)
        a.rect(x0 + 3, y0 + 3, x1 - 3, y0 + 6, fill=(176, 114, 96))
    # ダイヤル錠
    a.rect(100, 142, 140, 214, fill=(52, 48, 66), outline=INK, width=2, radius=5)
    for i in range(4):
        y = 150 + i * 15
        a.rect(108, y, 132, y + 11, fill=(224, 218, 196), outline=INK, width=1)
        a.text(120, y + 5.5, "0", 9, INK, font=FONT_LATIN)
    a.ellipse(112, 220, 128, 236, fill=GOLD, outline=INK, width=1.5)
    return a


BOOK_COLORS = [(160, 70, 70), (70, 110, 160), (90, 140, 90), (200, 160, 70), (120, 80, 140), (70, 130, 140), (170, 110, 70)]


def obj_bookshelf():
    a = Art(200, 300)
    a.rect(0, 0, 200, 300, fill=WOOD_DARK, outline=INK, width=2.5)
    a.rect(8, 8, 192, 292, fill=(48, 32, 26), outline=INK, width=1.5)
    rnd = random.Random(11)
    shelf_h = 70
    for s in range(4):
        y1 = 12 + (s + 1) * shelf_h - 4
        y0 = y1 - (shelf_h - 12)
        x = 14
        i = 0
        while x < 180:
            bw = rnd.randint(11, 18)
            bh = rnd.randint(40, shelf_h - 14)
            col = BOOK_COLORS[rnd.randrange(len(BOOK_COLORS))]
            top = y1 - bh
            a.rect(x, top, x + bw, y1, fill=col, outline=INK, width=1.2)
            inverted = (s == 1 and i == 2)  # 2段目の左から3冊目が逆さ
            if inverted:
                a.rect(x, y1 - 10, x + bw, y1 - 6, fill=GOLD)
                a.rect(x, top + 4, x + bw, top + 6, fill=(240, 236, 220))
                a.rect(x + 1, top - 5, x + bw - 1, top, fill=(240, 236, 220), outline=INK, width=1)  # 天地逆＝ページ側が下
            else:
                a.rect(x, top + 6, x + bw, top + 10, fill=GOLD)
                a.rect(x, y1 - 6, x + bw, y1 - 4, fill=(240, 236, 220))
            x += bw + 1
            i += 1
        a.rect(8, y1, 192, y1 + 5, fill=WOOD, outline=INK, width=1.5)
    return a


def obj_note():
    a = Art(180, 130)
    paper = Art(180, 130)
    paper.rect(14, 8, 166, 122, fill=PAPER, outline=INK, width=1.5)
    paper.rect(14, 8, 166, 14, fill=(214, 202, 172))
    paper.text(90, 24, "部員名簿", 11, (60, 46, 40))
    for i in range(5):
        y = 40 + i * 16
        paper.text(28, y, str(i + 1), 9, (60, 46, 40), font=FONT_LATIN)
        paper.rect(38, y - 4, 38 + 60 + (i * 13) % 30, y + 3, fill=(120, 108, 100))
    a.paste(paper.rotated(-2.5, 90, 65), 0, 0)
    a.ellipse(84, 4, 96, 16, fill=(214, 60, 60), outline=INK, width=1.2)
    a.ellipse(87, 6, 90, 9, fill=(255, 180, 180))
    return a


def obj_crystal():
    a = Art(140, 140)
    # 台座
    a.poly([(30, 134), (110, 134), (100, 104), (40, 104)], fill=(98, 80, 124), outline=INK, width=2)
    a.rect(34, 100, 106, 108, fill=(130, 108, 160), outline=INK, width=1.5, radius=2)
    a.rect(44, 118, 96, 122, fill=(70, 56, 92))
    # 球
    a.glow(8, 2, 132, 112, (166, 140, 240, 110), 12)
    a.ellipse(24, 8, 116, 100, fill=(112, 84, 190), outline=INK, width=2)
    a.ellipse(30, 14, 110, 96, fill=(150, 120, 226))
    a.ellipse(38, 24, 86, 74, fill=(188, 164, 246))
    a.ellipse(40, 18, 66, 40, fill=(255, 255, 255, 190))
    for (sx, sy, r) in [(86, 60, 4), (60, 70, 3), (78, 34, 3)]:
        a.poly([(sx, sy - r * 2), (sx + r * .5, sy - r * .5), (sx + r * 2, sy), (sx + r * .5, sy + r * .5), (sx, sy + r * 2), (sx - r * .5, sy + r * .5), (sx - r * 2, sy), (sx - r * .5, sy - r * .5)], fill=(255, 255, 255))
    return a


def people_photo(a, x0, y0, x1, y1):
    vgrad_rect(a, x0, y0, x1, y1, (176, 152, 120), (140, 116, 90))
    rnd = random.Random(5)
    rows = [(0.34, 5, 0.9), (0.56, 6, 1.0), (0.80, 5, 1.1)]
    for (ry, n, sc) in rows:
        for i in range(n):
            cx = x0 + (x1 - x0) * (i + 0.5) / n + rnd.uniform(-4, 4)
            cy = y0 + (y1 - y0) * ry
            r = 9 * sc
            body = [(40, 50, 90), (50, 60, 100), (36, 44, 80)][rnd.randrange(3)]
            a.ellipse(cx - r * 1.5, cy + r * 0.8, cx + r * 1.5, cy + r * 3.2, fill=body)
            a.ellipse(cx - r * .8, cy - r * .8, cx + r * .8, cy + r * .8, fill=(228, 190, 160))
            a.ellipse(cx - r * .85, cy - r * .9, cx + r * .85, cy - r * .1, fill=(60, 44, 40))
    # 見覚えのない生徒（ブレザーのボタンが見える）
    cx, cy = x0 + (x1 - x0) * 0.86, y0 + (y1 - y0) * 0.66
    a.ellipse(cx - 13, cy + 8, cx + 13, cy + 40, fill=(20, 24, 60), outline=(255, 255, 255, 120), width=1)
    a.ellipse(cx - 8, cy - 8, cx + 8, cy + 8, fill=(238, 206, 180))
    a.ellipse(cx - 9, cy - 10, cx + 9, cy - 1, fill=(34, 28, 40))
    for by in (cy + 16, cy + 24):
        a.ellipse(cx - 2, by - 2, cx + 2, by + 2, fill=GOLD)


def obj_photo_front():
    a = Art(220, 160)
    a.rect(0, 0, 220, 160, fill=WOOD_DARK, outline=INK, width=2.5)
    a.rect(8, 8, 212, 152, fill=(236, 228, 208), outline=INK, width=1.5)
    people_photo(a, 14, 14, 206, 146)
    a.rect(14, 14, 206, 146, outline=(90, 70, 50), width=2)
    return a


def obj_photo_back():
    a = Art(220, 160)
    a.rect(0, 0, 220, 160, fill=WOOD_DARK, outline=INK, width=2.5)
    a.rect(8, 8, 212, 152, fill=(176, 142, 104), outline=INK, width=1.5)
    rnd = random.Random(9)
    for _ in range(120):
        x, y = rnd.uniform(12, 206), rnd.uniform(12, 146)
        a.ellipse(x, y, x + rnd.uniform(1, 3), y + rnd.uniform(1, 3), fill=(150, 118, 84))
    a.mixed_text(110, 60, [("11", FONT_LATIN), ("月", FONT_JP), ("14", FONT_LATIN), ("日", FONT_JP)], 28, (52, 38, 54))
    a.line([(40, 84), (180, 84)], (52, 38, 54, 120), 1.5)
    a.text(110, 112, "栗川学園 オカルト研究部", 12, (92, 70, 66))
    return a


def obj_clock():
    a = Art(160, 200)
    a.poly([(24, 196), (136, 196), (140, 70), (80, 4), (20, 70)], fill=WOOD, outline=INK, width=2.5)
    a.poly([(34, 188), (126, 188), (130, 74), (80, 16), (30, 74)], fill=WOOD_LIGHT)
    # 文字盤
    a.ellipse(32, 36, 128, 132, fill=(244, 238, 220), outline=INK, width=2.5)
    for k in range(12):
        ang = math.radians(k * 30 - 90)
        a.line([(80 + 38 * math.cos(ang), 84 + 38 * math.sin(ang)), (80 + 44 * math.cos(ang), 84 + 44 * math.sin(ang))], INK, 2)
    # 針（3時5分）
    h_ang = math.radians((3 + 5 / 60) * 30 - 90)
    m_ang = math.radians(5 * 6 - 90)
    a.line([(80, 84), (80 + 24 * math.cos(h_ang), 84 + 24 * math.sin(h_ang))], INK, 4)
    a.line([(80, 84), (80 + 36 * math.cos(m_ang), 84 + 36 * math.sin(m_ang))], INK, 3)
    a.ellipse(76, 80, 84, 88, fill=GOLD, outline=INK, width=1)
    # 振り子窓
    a.rect(50, 144, 110, 184, fill=(40, 28, 30), outline=INK, width=2, radius=3)
    a.line([(80, 144), (80, 170)], GOLD, 2)
    a.ellipse(70, 168, 90, 184, fill=GOLD, outline=INK, width=1.5)
    return a


def obj_scroll():
    a = Art(150, 110)
    a.rect(14, 12, 136, 98, fill=(228, 214, 180), outline=INK, width=2)
    a.rect(14, 12, 136, 20, fill=(150, 90, 70))
    a.rect(14, 90, 136, 98, fill=(150, 90, 70))
    a.rect(8, 6, 142, 12, fill=WOOD_DARK, outline=INK, width=1.5, radius=2)
    a.rect(8, 98, 142, 104, fill=WOOD_DARK, outline=INK, width=1.5, radius=2)
    a.text(75, 55, "七不思議之図", 17, (40, 30, 40))
    return a


def obj_box(open_):
    a = Art(180, 110)
    # 本体
    a.rect(8, 40, 172, 106, fill=WOOD, outline=INK, width=2.5)
    a.rect(8, 40, 172, 50, fill=WOOD_LIGHT, outline=INK, width=1.5)
    for x in (30, 90, 150):
        a.rect(x - 3, 40, x + 3, 106, fill=(140, 140, 156), outline=INK, width=1)
    a.rect(8, 96, 172, 106, fill=WOOD_DARK, outline=INK, width=1.5)
    if open_:
        a.rect(12, 44, 168, 56, fill=(30, 22, 28))
        a.rect(60, 38, 120, 52, fill=PAPER, outline=INK, width=1)
        a.line([(66, 44), (112, 44)], (90, 76, 70), 1.2)
        # 開いた蓋
        a.poly([(10, 40), (170, 40), (160, 4), (20, 4)], fill=WOOD, outline=INK, width=2.5)
        a.poly([(20, 36), (160, 36), (152, 10), (28, 10)], fill=(98, 70, 54))
        a.ellipse(82, 66, 98, 82, fill=(150, 150, 166), outline=INK, width=1.5)  # 外れた南京錠
    else:
        a.poly([(8, 40), (172, 40), (166, 14), (14, 14)], fill=WOOD_LIGHT, outline=INK, width=2.5)
        a.rect(18, 20, 162, 34, fill=WOOD, outline=INK, width=1)
        # 南京錠
        a.arc(80, 44, 100, 66, 180, 360, (190, 190, 205), 3)
        a.rect(76, 56, 104, 82, fill=GOLD, outline=INK, width=2, radius=3)
        a.ellipse(86, 63, 94, 71, fill=INK)
        a.rect(88, 68, 92, 76, fill=INK)
    return a


def obj_drawer(open_):
    a = Art(220, 120)
    a.rect(4, 8, 216, 116, fill=WOOD_DARK, outline=INK, width=2.5)
    a.rect(4, 8, 216, 16, fill=WOOD_LIGHT, outline=INK, width=1.5)
    if open_:
        a.rect(14, 22, 206, 60, fill=(30, 22, 28))
        a.rect(18, 30, 120, 60, fill=PAPER, outline=INK, width=1)
        a.line([(24, 38), (110, 38)], (90, 76, 70), 1.2)
        a.line([(24, 46), (96, 46)], (90, 76, 70), 1.2)
        a.rect(10, 52, 210, 78, fill=WOOD, outline=INK, width=2, radius=2)  # 引き出された前板
        a.rect(98, 60, 122, 66, fill=GOLD, outline=INK, width=1.2, radius=2)
        a.rect(14, 84, 206, 110, fill=WOOD, outline=INK, width=2, radius=2)
        a.rect(98, 94, 122, 100, fill=GOLD, outline=INK, width=1.2, radius=2)
    else:
        a.rect(14, 22, 206, 60, fill=WOOD, outline=INK, width=2, radius=2)
        a.rect(98, 36, 122, 44, fill=GOLD, outline=INK, width=1.2, radius=2)
        a.rect(14, 66, 206, 110, fill=WOOD, outline=INK, width=2, radius=2)
        a.rect(98, 84, 122, 92, fill=GOLD, outline=INK, width=1.2, radius=2)
        a.line([(16, 66), (204, 66)], (30, 22, 26), 1.5)
    return a


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for name, fn in [("north", wall_north), ("east", wall_east), ("south", wall_south), ("west", wall_west)]:
        fn().save(os.path.join(out, f"room_wall_{name}.png"))
    objs = {
        "door": obj_door(), "bookshelf": obj_bookshelf(), "note": obj_note(), "crystal": obj_crystal(),
        "photo": obj_photo_front(), "photo_back": obj_photo_back(), "clock": obj_clock(), "scroll": obj_scroll(),
        "box": obj_box(False), "box_open": obj_box(True), "drawer": obj_drawer(False), "drawer_open": obj_drawer(True),
    }
    for k, a in objs.items():
        a.save(os.path.join(out, f"obj_{k}.png"))
    for f in sorted(os.listdir(out)):
        print(f, os.path.getsize(os.path.join(out, f)) // 1024, "KB")


if __name__ == "__main__":
    main()
