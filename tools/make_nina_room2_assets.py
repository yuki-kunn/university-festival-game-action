#!/usr/bin/env python3
"""ニナの2部屋目「鏡の部屋」の画像（壁4面とオブジェクト）を生成する。

  pip install pillow
  python3 tools/make_nina_room2_assets.py OUT_DIR

1部屋目（make_nina_assets.py）と同じ描画ヘルパー・座標系（表示px、2倍解像度で出力）。
壁は 920x420、オブジェクトは src/stages/ninaRoom2.js の width/height に合わせる。
時計・ランプ・黒板は、鏡に映したとき（左右反転）の絵を `_back` として別に出す。
"""
import os
import random
import sys

from PIL import Image, ImageDraw

from make_nina_assets import (
    FONT_JP, FONT_LATIN, INK, WALL_H, WALL_W, FLOOR_Y, Art, vgrad_rect,
)

SILVER = (176, 188, 210)
SILVER_DARK = (104, 116, 142)
STEEL = (88, 98, 118)
GLASS_TOP = (150, 178, 220)
GLASS_BOTTOM = (82, 108, 160)
CHALK = (236, 240, 232)


def flipped(a):
    """左右反転した絵（鏡に映した姿）を返す。"""
    out = Art(a.w, a.h)
    out.img = a.img.transpose(Image.FLIP_LEFT_RIGHT)
    out.d = ImageDraw.Draw(out.img)
    return out


# ---------------------------------------------------------------- 壁

def base_wall():
    a = Art(WALL_W, WALL_H)
    vgrad_rect(a, 0, 0, WALL_W, FLOOR_Y, (30, 42, 70), (22, 30, 54))
    # ひし形の壁紙模様
    for x in range(-60, WALL_W + 60, 60):
        a.line([(x, 0), (x + 120, 240)], (255, 255, 255, 12), 1.5)
        a.line([(x + 120, 0), (x, 240)], (255, 255, 255, 12), 1.5)
    # 腰壁
    a.rect(0, 240, WALL_W, FLOOR_Y - 8, fill=(46, 62, 98))
    a.rect(0, 240, WALL_W, 244, fill=(120, 140, 186))
    for x in range(10, WALL_W, 120):
        a.rect(x, 252, x + 100, FLOOR_Y - 18, outline=(98, 120, 172), width=1.5, radius=2)
    # 幅木
    a.rect(0, FLOOR_Y - 8, WALL_W, FLOOR_Y, fill=(18, 24, 42))
    a.rect(0, FLOOR_Y - 8, WALL_W, FLOOR_Y - 6, fill=(96, 116, 164))
    # チェッカー床
    for row in range(3):
        for col in range(-1, 21):
            c = (52, 62, 88) if (row + col) % 2 == 0 else (32, 38, 58)
            a.rect(col * 46 + (row % 2) * 0, FLOOR_Y + row * 30, col * 46 + 46, FLOOR_Y + row * 30 + 30, fill=c)
    a.rect(0, FLOOR_Y, WALL_W, FLOOR_Y + 2, fill=(12, 16, 30))
    return a


def sconce(a, x, y):
    a.glow(x - 60, y - 70, x + 60, y + 60, (170, 205, 255, 70), 18)
    a.rect(x - 7, y + 4, x + 7, y + 22, fill=(150, 160, 190), outline=INK, width=1.5, radius=2)
    a.poly([(x - 13, y + 4), (x + 13, y + 4), (x + 8, y - 16), (x - 8, y - 16)], fill=(200, 226, 255), outline=INK)


def mirror_frame(a, x0, y0, x1, y1):
    """壁に掛かった飾りの鏡（クリックできない背景）。"""
    a.rect(x0, y0, x1, y1, fill=SILVER_DARK, outline=INK, width=2, radius=4)
    vgrad_rect(a, x0 + 5, y0 + 5, x1 - 5, y1 - 5, GLASS_TOP, GLASS_BOTTOM)
    a.poly([(x0 + 8, y0 + 8), (x0 + 8 + (x1 - x0) * 0.35, y0 + 8), (x0 + 8, y0 + 8 + (y1 - y0) * 0.35)], fill=(255, 255, 255, 50))


def reversed_sign(a, x, y):
    """左右反転した看板（鏡文字）。"""
    sign = Art(180, 60)
    sign.rect(0, 0, 180, 60, fill=(24, 30, 52), outline=(170, 180, 210), width=2.5, radius=3)
    sign.text(90, 20, "OCCULT CLUB", 14, (200, 214, 240), font=FONT_LATIN)
    sign.text(90, 42, "オカルト研究部", 13, (170, 184, 214))
    a.paste(flipped(sign), x, y)


def wall_north():
    a = base_wall()
    sconce(a, 270, 110)
    sconce(a, 530, 110)
    reversed_sign(a, 40, 60)
    mirror_frame(a, 810, 50, 880, 150)
    return a


def wall_east():
    a = base_wall()
    # ランプを置く台（ランプの下端 = 画面y350 = 壁ローカル280）
    a.rect(380, 280, 540, FLOOR_Y - 8, fill=(70, 82, 112), outline=INK, width=2)
    a.rect(380, 280, 540, 286, fill=(110, 126, 164), outline=INK, width=1.5)
    sconce(a, 300, 130)
    sconce(a, 580, 130)
    # 窓（月は1部屋目と逆側）
    a.rect(812, 34, 906, 206, fill=(80, 92, 124), outline=INK, width=1.5)
    vgrad_rect(a, 818, 40, 900, 200, (14, 20, 50), (40, 52, 96))
    a.ellipse(826, 52, 848, 74, fill=(240, 246, 255))
    a.ellipse(834, 48, 856, 70, fill=(18, 24, 54))
    for (sx, sy) in [(872, 70), (852, 110), (880, 150), (832, 170)]:
        a.ellipse(sx - 1.5, sy - 1.5, sx + 1.5, sy + 1.5, fill=(255, 255, 255))
    a.rect(856, 40, 862, 200, fill=(80, 92, 124))
    a.rect(818, 117, 900, 123, fill=(80, 92, 124))
    return a


def wall_south():
    a = base_wall()
    sconce(a, 140, 120)
    sconce(a, 760, 110)
    mirror_frame(a, 560, 40, 640, 130)
    mirror_frame(a, 680, 150, 730, 230)
    return a


def wall_west():
    a = base_wall()
    sconce(a, 560, 120)
    sconce(a, 860, 120)
    mirror_frame(a, 14, 70, 84, 220)
    return a


# ---------------------------------------------------------------- オブジェクト

def obj_door():
    a = Art(160, 300)
    a.rect(0, 0, 160, 300, fill=(50, 60, 84), outline=INK, width=2.5)
    a.rect(10, 10, 150, 300, fill=(104, 120, 156), outline=INK, width=2)
    # 鏡張りの細長いパネル
    for (x0, y0, x1, y1) in [(24, 24, 70, 280), (82, 24, 136, 130)]:
        vgrad_rect(a, x0, y0, x1, y1, GLASS_TOP, GLASS_BOTTOM)
        a.rect(x0, y0, x1, y1, outline=(60, 72, 104), width=2, radius=2)
    a.poly([(28, 28), (52, 28), (28, 90)], fill=(255, 255, 255, 60))
    a.rect(82, 142, 136, 280, fill=(120, 136, 172), outline=(60, 72, 104), width=2, radius=2)
    # ダイヤル錠
    a.rect(92, 160, 128, 232, fill=(40, 46, 66), outline=INK, width=2, radius=5)
    for i in range(4):
        y = 168 + i * 15
        a.rect(98, y, 122, y + 11, fill=(214, 226, 244), outline=INK, width=1)
        a.text(110, y + 5.5, "0", 9, INK, font=FONT_LATIN)
    a.ellipse(102, 240, 118, 256, fill=SILVER, outline=INK, width=1.5)
    return a


def obj_clock():
    """壁掛け時計。実物は8時50分。_back は鏡に映した姿（3時10分に見える）。"""
    import math
    a = Art(160, 160)
    a.glow(6, 6, 154, 154, (170, 205, 255, 80), 8)
    a.ellipse(8, 8, 152, 152, fill=SILVER, outline=INK, width=3)
    a.ellipse(16, 16, 144, 144, fill=(244, 246, 250), outline=INK, width=2)
    for n in range(1, 13):
        ang = math.radians(n * 30 - 90)
        a.text(80 + 50 * math.cos(ang), 80 + 50 * math.sin(ang), str(n), 13, INK, font=FONT_LATIN)
    for k in range(60):
        ang = math.radians(k * 6 - 90)
        r0, r1 = (62, 66) if k % 5 else (60, 66)
        a.line([(80 + r0 * math.cos(ang), 80 + r0 * math.sin(ang)), (80 + r1 * math.cos(ang), 80 + r1 * math.sin(ang))], INK, 1)
    h_ang = math.radians((8 + 50 / 60) * 30 - 90)
    m_ang = math.radians(50 * 6 - 90)
    a.line([(80, 80), (80 + 30 * math.cos(h_ang), 80 + 30 * math.sin(h_ang))], INK, 5)
    a.line([(80, 80), (80 + 46 * math.cos(m_ang), 80 + 46 * math.sin(m_ang))], INK, 3)
    a.ellipse(75, 75, 85, 85, fill=GOLD_ACCENT, outline=INK, width=1.5)
    return a


GOLD_ACCENT = (232, 190, 80)

BOOK_COLORS = [(150, 70, 70), (70, 110, 160), (90, 140, 90), (200, 160, 70), (120, 80, 140), (70, 130, 140), (170, 110, 70)]


def obj_books():
    a = Art(200, 300)
    a.rect(0, 0, 200, 300, fill=(60, 72, 102), outline=INK, width=2.5)
    a.rect(8, 8, 192, 292, fill=(26, 32, 50), outline=INK, width=1.5)
    # 上段: 飾り（空の段）、中段: 数字付きの本7冊、下段: 横積みの本
    a.rect(8, 92, 192, 98, fill=(90, 104, 140), outline=INK, width=1.5)
    a.rect(8, 192, 192, 198, fill=(90, 104, 140), outline=INK, width=1.5)
    a.ellipse(60, 52, 96, 90, fill=(110, 130, 180), outline=INK, width=1.5)  # 飾り球
    a.rect(120, 60, 160, 90, fill=(80, 96, 132), outline=INK, width=1.5, radius=3)
    digits = [4, 1, 7, 2, 5, 3, 6]
    x = 18
    for i, d in enumerate(digits):
        w = 22
        top = 108 if d != 7 else 114  # 「7」だけ少し手前に飛び出している
        bottom = 192 if d != 7 else 198
        col = BOOK_COLORS[i]
        a.rect(x, top, x + w, bottom, fill=col, outline=INK, width=1.5)
        a.rect(x, top + 6, x + w, top + 9, fill=GOLD_ACCENT)
        a.text(x + w / 2, (top + bottom) / 2 + 4, str(d), 17, (250, 250, 245), font=FONT_LATIN)
        x += w + 2
    # 下段
    for k, (bx, by) in enumerate([(20, 254), (24, 238), (18, 222), (110, 258)]):
        a.rect(bx, by, bx + 70, by + 14, fill=BOOK_COLORS[(k + 3) % 7], outline=INK, width=1.2)
    return a


def obj_lamp():
    """ステンドグラスのランプ。左から 緑・青・黄・赤・紫。_back は鏡に映した姿。"""
    a = Art(100, 160)
    a.glow(0, 0, 100, 110, (255, 230, 170, 90), 12)
    # 台座と支柱
    a.rect(30, 140, 70, 158, fill=STEEL, outline=INK, width=2, radius=3)
    a.rect(46, 100, 54, 142, fill=STEEL, outline=INK, width=1.5)
    # シェード
    colors = [(70, 190, 120), (70, 120, 220), (240, 210, 80), (220, 70, 70), (150, 90, 210)]
    a.poly([(10, 100), (90, 100), (80, 20), (20, 20)], fill=(40, 40, 50), outline=INK, width=2)
    for i, c in enumerate(colors):
        x0 = 12 + i * 15.2
        x1 = x0 + 14
        tx0 = 22 + i * 11.2
        tx1 = tx0 + 10.5
        a.poly([(x0, 98), (x1, 98), (tx1, 23), (tx0, 23)], fill=c)
    a.rect(20, 14, 80, 22, fill=STEEL, outline=INK, width=1.5, radius=3)
    return a


def obj_calendar():
    a = Art(120, 160)
    a.rect(6, 4, 114, 156, fill=(240, 232, 214), outline=INK, width=2)
    a.rect(6, 4, 114, 40, fill=(190, 60, 70), outline=INK, width=2)
    a.mixed_text(60, 22, [("11", FONT_LATIN), ("月", FONT_JP)], 24, (255, 244, 230))
    a.text(60, 86, "13", 54, (50, 40, 44), font=FONT_LATIN)
    a.text(60, 128, "大安", 16, (120, 70, 60))
    a.ellipse(54, 0, 66, 10, fill=(200, 200, 210), outline=INK, width=1.2)
    for k in range(6):
        a.line([(10 + k * 18, 148), (22 + k * 18, 154)], (150, 140, 120), 1.2)
    return a


def obj_mirror():
    a = Art(220, 300)
    a.glow(6, 6, 214, 294, (170, 205, 255, 70), 10)
    a.rect(0, 0, 220, 300, fill=SILVER_DARK, outline=INK, width=3, radius=14)
    a.rect(8, 8, 212, 292, fill=SILVER, outline=INK, width=1.5, radius=10)
    vgrad_rect(a, 18, 18, 202, 282, GLASS_TOP, GLASS_BOTTOM)
    # 映り込んだ人影（うっすら）
    a.ellipse(94, 90, 126, 124, fill=(30, 36, 60, 90))
    a.poly([(70, 250), (80, 130), (140, 130), (150, 250)], fill=(30, 36, 60, 90))
    a.poly([(24, 24), (110, 24), (24, 150)], fill=(255, 255, 255, 60))
    a.poly([(150, 282), (202, 282), (202, 230)], fill=(255, 255, 255, 40))
    # 脚
    a.rect(60, 292, 160, 300, fill=SILVER_DARK, outline=INK, width=1.5)
    return a


def obj_desk():
    a = Art(240, 120)
    a.rect(4, 44, 236, 56, fill=(98, 82, 76), outline=INK, width=2)  # 天板
    a.rect(14, 56, 226, 116, fill=(74, 62, 60), outline=INK, width=2)
    a.rect(24, 66, 120, 106, fill=(90, 76, 72), outline=INK, width=1.5, radius=2)
    a.rect(60, 82, 84, 88, fill=GOLD_ACCENT, outline=INK, width=1.2, radius=2)
    a.rect(132, 66, 216, 106, fill=(90, 76, 72), outline=INK, width=1.5, radius=2)
    a.rect(162, 82, 186, 88, fill=GOLD_ACCENT, outline=INK, width=1.2, radius=2)
    # 開いた日記
    a.poly([(40, 44), (120, 44), (124, 12), (44, 8)], fill=(244, 238, 220), outline=INK, width=1.5)
    a.poly([(120, 44), (200, 44), (196, 8), (124, 12)], fill=(238, 230, 208), outline=INK, width=1.5)
    for k in range(4):
        a.line([(52, 20 + k * 6), (112, 20 + k * 6 - 1)], (140, 128, 110), 1.2)
        a.line([(132, 18 + k * 6), (188, 18 + k * 6 + 1)], (140, 128, 110), 1.2)
    a.line([(180, 36), (214, 18)], (60, 50, 90), 2.5)  # ペン
    return a


def board_text(readable):
    """黒板の文字。readable=False は鏡文字（左右反転）。"""
    layer = Art(360, 180)
    lines = [
        [("本の数字を", FONT_JP)],
        [("鏡に映したとおり", FONT_JP)],
        [("左から", FONT_JP), ("3", FONT_LATIN), ("番目", FONT_JP)],
    ]
    for i, parts in enumerate(lines):
        layer.mixed_text(180, 54 + i * 34, parts, 22, CHALK)
    return layer if readable else flipped(layer)


def obj_board(readable):
    a = Art(360, 180)
    a.rect(0, 0, 360, 180, fill=(120, 92, 64), outline=INK, width=2.5)
    a.rect(10, 10, 350, 160, fill=(30, 56, 52), outline=INK, width=2)
    vgrad_rect(a, 12, 12, 348, 158, (36, 66, 62), (26, 48, 46))
    a.paste(board_text(readable), 0, 0)
    # チョーク受け
    a.rect(10, 160, 350, 176, fill=(96, 72, 50), outline=INK, width=1.5)
    for cx in (60, 76, 92):
        a.rect(cx, 164, cx + 12, 170, fill=(236, 240, 232), outline=INK, width=1)
    return a


def obj_safe(open_):
    a = Art(150, 150)
    a.rect(6, 10, 144, 146, fill=STEEL, outline=INK, width=3, radius=6)
    a.rect(14, 18, 136, 138, fill=(112, 122, 142), outline=INK, width=2, radius=4)
    if open_:
        a.rect(22, 26, 128, 130, fill=(18, 20, 30))  # 中は暗い
        a.rect(48, 70, 104, 120, fill=(244, 238, 220), outline=INK, width=1.2)
        a.text(76, 96, "4", 34, (50, 40, 44), font=FONT_LATIN)
        # 開いた扉（左側にずれて見える）
        a.poly([(6, 14), (34, 24), (34, 132), (6, 146)], fill=(96, 106, 126), outline=INK, width=2)
    else:
        a.ellipse(40, 40, 110, 110, fill=(88, 98, 118), outline=INK, width=2.5)
        a.ellipse(50, 50, 100, 100, fill=(150, 162, 186), outline=INK, width=2)
        import math
        for k in range(12):
            ang = math.radians(k * 30)
            a.line([(75 + 20 * math.cos(ang), 75 + 20 * math.sin(ang)), (75 + 26 * math.cos(ang), 75 + 26 * math.sin(ang))], INK, 1.5)
        a.line([(75, 75), (75, 54)], (200, 60, 60), 3)
        a.rect(118, 66, 130, 92, fill=GOLD_ACCENT, outline=INK, width=1.5, radius=3)
    a.rect(14, 144, 40, 150, fill=INK)
    a.rect(110, 144, 136, 150, fill=INK)
    return a


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for name, fn in [("north", wall_north), ("east", wall_east), ("south", wall_south), ("west", wall_west)]:
        fn().save(os.path.join(out, f"room_wall_m_{name}.png"))
    clock = obj_clock()
    lamp = obj_lamp()
    objs = {
        "m_door": obj_door(),
        "m_clock": clock, "m_clock_back": flipped(clock),
        "m_books": obj_books(),
        "m_lamp": lamp, "m_lamp_back": flipped(lamp),
        "m_calendar": obj_calendar(),
        "m_mirror": obj_mirror(),
        "m_desk": obj_desk(),
        "m_board": obj_board(False), "m_board_back": obj_board(True),
        "m_safe": obj_safe(False), "m_safe_open": obj_safe(True),
    }
    for k, a in objs.items():
        a.save(os.path.join(out, f"obj_{k}.png"))
    for f in sorted(os.listdir(out)):
        print(f, os.path.getsize(os.path.join(out, f)) // 1024, "KB")


if __name__ == "__main__":
    main()
