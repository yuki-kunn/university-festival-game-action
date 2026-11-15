#!/usr/bin/env python3
"""効果音を合成して mp3 で出力する（外部素材なし。ライセンスの心配がない）。

  pip install numpy lameenc
  python3 tools/make_se.py OUT_DIR

音色・長さ・音量は各関数の中で調整できる。
"""
import os
import sys

import lameenc
import numpy as np

SR = 44100
RNG = np.random.default_rng(42)


def t_axis(sec):
    return np.linspace(0, sec, int(SR * sec), endpoint=False, dtype=np.float32)


def sine(freq, sec):
    t = t_axis(sec)
    f = np.asarray(freq, dtype=np.float32) if not np.isscalar(freq) else np.full_like(t, freq)
    return np.sin(2 * np.pi * np.cumsum(f) / SR).astype(np.float32)


def sweep(f0, f1, sec, curve=1.0):
    t = np.linspace(0, 1, int(SR * sec), endpoint=False, dtype=np.float32) ** curve
    return sine(f0 + (f1 - f0) * t, sec)


def square(freq, sec, duty=0.5):
    return np.where(sine(freq, sec) > np.cos(np.pi * duty), 1.0, -1.0).astype(np.float32) * 0.6


def noise(sec):
    return RNG.uniform(-1, 1, int(SR * sec)).astype(np.float32)


def env(n, attack=0.005, decay=8.0):
    t = np.linspace(0, n / SR, n, endpoint=False, dtype=np.float32)
    e = np.exp(-decay * t)
    a = int(SR * attack)
    if a > 0:
        e[:a] *= np.linspace(0, 1, a, dtype=np.float32)
    return e


def bandpass(x, lo, hi):
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    spec[(freqs < lo) | (freqs > hi)] = 0
    return np.fft.irfft(spec, len(x)).astype(np.float32)


def tone(freq, sec, decay=8.0, harmonics=(1.0, 0.3, 0.1)):
    out = np.zeros(int(SR * sec), dtype=np.float32)
    for k, amp in enumerate(harmonics, start=1):
        out += amp * sine(freq * k, sec)
    return out * env(len(out), decay=decay)


def mix(*parts):
    n = max(off + len(p) for off, p in parts)
    out = np.zeros(n, dtype=np.float32)
    for off, p in parts:
        out[off: off + len(p)] += p
    return out


def at(sec):
    return int(SR * sec)


# ---------------------------------------------------------------- 効果音

def se_click():
    return tone(1800, 0.06, decay=60, harmonics=(1.0, 0.4)) * 0.8


def se_hover():
    return tone(1300, 0.04, decay=70, harmonics=(1.0,)) * 0.4


def se_jump():
    s = sweep(320, 760, 0.17, 0.8)
    return s * env(len(s), decay=9) * 0.7


def se_dash():
    n = bandpass(noise(0.22), 800, 6000) * env(int(SR * 0.22), attack=0.01, decay=10)
    low = sweep(420, 140, 0.2) * env(int(SR * 0.2), decay=12) * 0.5
    return mix((0, n * 0.9), (0, low))


def se_coin():
    return mix((0, tone(988, 0.1, decay=14)), (at(0.07), tone(1319, 0.32, decay=9))) * 0.55


def se_switch():
    click = tone(380, 0.06, decay=50, harmonics=(1.0, 0.6, 0.3))
    ping = tone(1046, 0.28, decay=10, harmonics=(1.0, 0.25))
    return mix((0, click * 0.9), (at(0.05), ping * 0.6))


def se_block():
    notes = [523, 659, 784]
    return mix(*[(at(0.05 * i), tone(f, 0.18, decay=14)) for i, f in enumerate(notes)]) * 0.5


def se_miss():
    s = sweep(520, 110, 0.5, 0.7)
    body = square(np.linspace(520, 110, len(s), dtype=np.float32), 0.5) * 0.4
    thud = tone(90, 0.25, decay=18, harmonics=(1.0, 0.5)) * 0.9
    return mix((0, (s * 0.5 + body) * env(len(s), decay=4)), (at(0.32), thud))


def se_clear():
    # C5 E5 G5 C6 の上昇アルペジオ＋和音の余韻
    notes = [(0.0, 523.25), (0.12, 659.25), (0.24, 783.99), (0.36, 1046.5)]
    parts = [(at(o), tone(f, 0.5, decay=6, harmonics=(1.0, 0.35, 0.15))) for o, f in notes]
    chord = sum(tone(f, 1.2, decay=3.2, harmonics=(1.0, 0.2)) for f in (523.25, 659.25, 783.99, 1046.5))
    parts.append((at(0.5), chord * 0.55))
    return mix(*parts) * 0.45


def se_unlock():
    c1 = tone(520, 0.05, decay=60, harmonics=(1.0, 0.8, 0.5))
    c2 = tone(700, 0.05, decay=60, harmonics=(1.0, 0.8, 0.5))
    clunk = tone(160, 0.2, decay=18, harmonics=(1.0, 0.6))
    bell = tone(1568, 0.8, decay=5, harmonics=(1.0, 0.4, 0.2))
    return mix((0, c1), (at(0.1), c2), (at(0.22), clunk), (at(0.3), bell * 0.5)) * 0.8


def se_wrong():
    a = square(190, 0.12) * env(int(SR * 0.12), attack=0.003, decay=8)
    return mix((0, a), (at(0.16), a)) * 0.5


def se_key():
    return tone(1000, 0.07, decay=40, harmonics=(1.0, 0.3)) * 0.6


def se_turn():
    n = bandpass(noise(0.24), 300, 2200)
    return n * np.sin(np.linspace(0, np.pi, len(n), dtype=np.float32)) * 0.6


def se_examine():
    return mix((0, tone(700, 0.09, decay=30)), (at(0.05), tone(1050, 0.25, decay=10, harmonics=(1.0, 0.2)) * 0.6)) * 0.6


EFFECTS = {
    "click": se_click, "hover": se_hover, "jump": se_jump, "dash": se_dash, "coin": se_coin,
    "switch": se_switch, "block": se_block, "miss": se_miss, "clear": se_clear, "unlock": se_unlock,
    "wrong": se_wrong, "key": se_key, "turn": se_turn, "examine": se_examine,
}


def encode(x, path):
    peak = float(np.abs(x).max())
    if peak > 0.9:
        x = x * (0.9 / peak)
    enc = lameenc.Encoder()
    enc.set_bit_rate(96)
    enc.set_in_sample_rate(SR)
    enc.set_channels(1)
    enc.set_quality(2)
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()
    with open(path, "wb") as f:
        f.write(enc.encode(pcm) + enc.flush())


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for name, fn in EFFECTS.items():
        x = fn()
        encode(x, os.path.join(out, f"{name}.mp3"))
        print(f"{name}: {len(x) / SR:.2f}s peak={float(np.abs(x).max()):.2f}")


if __name__ == "__main__":
    main()
