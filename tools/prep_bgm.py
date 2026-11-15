#!/usr/bin/env python3
"""ノベルパートのBGMを、ゲーム用にループ化・音量調整・軽量化する。

  pip install numpy lameenc miniaudio
  python3 tools/prep_bgm.py SRC_DIR OUT_DIR

SRC_DIR に daily.mp3 / mystery.mp3 / tension.mp3 / climax.mp3（Google Drive 保管。
リポジトリには含めない）を置く。OUT_DIR に同名のmp3を出力する。

処理:
1. 末尾の無音・フェードアウトを切り落とす（音量が中央値の60%を割る手前まで）
2. 末尾と冒頭をクロスフェードして、ループの継ぎ目を消す
3. RMSを揃える（曲ごとの音量差をなくす）
4. 96kbps で再エンコードして軽量化する
"""
import os
import sys

import lameenc
import miniaudio
import numpy as np

TRACKS = ["daily", "mystery", "tension", "climax"]
TARGET_RMS = 0.085  # 全曲の目標RMS
PEAK_LIMIT = 0.92
CROSSFADE_SEC = 2.0
BITRATE = 96


def load(path):
    d = miniaudio.mp3_read_file_f32(path)
    a = np.array(d.samples, dtype=np.float32).reshape(-1, d.nchannels)
    if d.nchannels == 1:
        a = np.repeat(a, 2, axis=1)
    return a, d.sample_rate


def trim_tail(a, sr, ratio=0.6):
    """末尾から見て、窓RMSが中央値のratio倍に達する最後の位置までを残す。"""
    win = int(sr * 0.1)
    n = len(a) // win
    rms = np.sqrt((a[: n * win].reshape(n, win, -1) ** 2).mean(axis=(1, 2)))
    thr = float(np.median(rms)) * ratio
    last = np.nonzero(rms >= thr)[0]
    end = (int(last[-1]) + 1) * win if len(last) else len(a)
    return a[:end]


def make_loop(a, sr, fade_sec):
    """先頭 L 秒を末尾 L 秒へクロスフェードで重ね、先頭 L 秒を捨てて継ぎ目を消す。"""
    L = int(sr * fade_sec)
    if len(a) < L * 4:
        return a
    t = np.linspace(0, 1, L, dtype=np.float32)[:, None]
    fade_in, fade_out = np.sin(t * np.pi / 2), np.cos(t * np.pi / 2)  # 等パワー
    cross = a[-L:] * fade_out + a[:L] * fade_in
    return np.concatenate([a[L:-L], cross], axis=0)


def normalize(a):
    rms = float(np.sqrt((a**2).mean()))
    a = a * (TARGET_RMS / rms)
    peak = float(np.abs(a).max())
    if peak > PEAK_LIMIT:
        a = a * (PEAK_LIMIT / peak)
    return a


def encode(a, sr, path):
    enc = lameenc.Encoder()
    enc.set_bit_rate(BITRATE)
    enc.set_in_sample_rate(sr)
    enc.set_channels(2)
    enc.set_quality(2)
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()
    with open(path, "wb") as f:
        f.write(enc.encode(pcm) + enc.flush())


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    src, out = sys.argv[1:]
    os.makedirs(out, exist_ok=True)
    for name in TRACKS:
        a, sr = load(os.path.join(src, f"{name}.mp3"))
        before = len(a) / sr
        a = trim_tail(a, sr)
        trimmed = len(a) / sr
        a = make_loop(a, sr, CROSSFADE_SEC)
        a = normalize(a)
        dst = os.path.join(out, f"{name}.mp3")
        encode(a, sr, dst)
        print(f"{name}: {before:.1f}s -> {len(a) / sr:.1f}s (尾を{before - trimmed:.1f}s削除), {os.path.getsize(dst) // 1024}KB")


if __name__ == "__main__":
    main()
