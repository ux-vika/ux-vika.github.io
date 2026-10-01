"""Генератор волн-переходов между секциями.

Геометрия и тексты взяты из Figma (слои «Фон · … (волна)» и «Волна · …»).
Координаты — во фрейме макета шириной 1440. Каждая полоса — отдельный
статичный SVG, который подставляется в HTML вместо маркера
<!--band:имя-->.

Запуск: python3 tools/bands.py index.html
"""
import re
import sys
from html import escape

COLORS = {
    "white": "#FFFFFF",
    "blue": "#EBF9FF",
    "pink": "#FFE6E8",
    "peach": "#FFEFDD",
    "lavender": "#D6D3FF",
}

# Кривые из Figma (до сдвига во фрейм)
P_80 = "M 0 40 C 210 40 210 0 420 0 C 630 0 630 80 840 80 C 1050 80 1050 0 1260 0 C 1470 0 1470 80 1680 80 C 1890 80 1890 0 2100 0"
P_80_INV = "M 0 40 C 210 40 210 80 420 80 C 630 80 630 0 840 0 C 1050 0 1050 80 1260 80 C 1470 80 1470 0 1680 0 C 1890 0 1890 80 2100 80"
P_60 = "M 0 30 C 190 30 190 0 380 0 C 570 0 570 60 760 60 C 950 60 950 0 1140 0 C 1330 0 1330 60 1520 60 C 1710 60 1710 0 1900 0"
P_103 = "M 0 51.5 C 210 51.5 210 0 420 0 C 630 0 630 103 840 103 C 1050 103 1050 0 1260 0 C 1470 0 1470 103 1680 103 C 1890 103 1890 0 2100 0"
P_109 = "M 0 51.16 C 210 51.16 210 0 420 0 C 630 0 627.5 109 837.5 109 C 1047.5 109 1050 0 1260 0 C 1470 0 1470 102.32 1680 102.32 C 1890 102.32 1890 0 2100 0"


def fill_blue(h):
    a = 39.95; m = 79.89
    return f"M 0 {a} C 210 {a} 210 0 420 0 C 630 0 630 {m} 840 {m} C 1050 {m} 1050 0 1260 0 C 1470 0 1470 {m} 1680 {m} C 1890 {m} 1890 0 2100 0 L 2100 {h} L 0 {h} Z"


def fill_pink(h):
    a = 43.11; m = 86.23
    return f"M 0 {a} C 210 {a} 210 {m} 420 {m} C 630 {m} 630 0 840 0 C 1050 0 1050 {m} 1260 {m} C 1470 {m} 1470 0 1680 0 C 1890 0 1890 {m} 2100 {m} L 2100 {h} L 0 {h} Z"


def fill_peach_top(h, a=39.28, m=78.56):
    return f"M 0 {a} C 210 {a} 210 0 420 0 C 630 0 630 {m} 840 {m} C 1050 {m} 1050 0 1260 0 C 1470 0 1470 {m} 1680 {m} C 1890 {m} 1890 0 2100 0 L 2100 {h} L 0 {h} Z"


def fill_peach_full(h, a=39.28, m=78.56):
    """Фигура с волнами сверху и снизу (персиковый/лавандовый фон)."""
    b = h - m
    c = h - a
    return (f"M 0 {a} C 210 {a} 210 0 420 0 C 630 0 630 {m} 840 {m} C 1050 {m} 1050 0 1260 0 "
            f"C 1470 0 1470 {m} 1680 {m} C 1890 {m} 1890 0 2100 0 L 2100 {h} "
            f"C 1890 {h} 1890 {b} 1680 {b} C 1470 {b} 1470 {h} 1260 {h} C 1050 {h} 1050 {b} 840 {b} "
            f"C 630 {b} 630 {h} 420 {h} C 210 {h} 210 {c} 0 {c} Z")


def shift(d, dx, dy):
    """Сдвигает абсолютные координаты пути M/C/L на (dx, dy)."""
    out = []
    nums = []
    for tok in re.findall(r"[MCLZ]|-?\d+(?:\.\d+)?", d):
        if tok in "MCLZ":
            out.append(tok)
        else:
            nums.append(float(tok))
            out.append(None)
    res, i, k = [], 0, 0
    for tok in out:
        if tok is None:
            v = nums[k] + (dx if i % 2 == 0 else dy)
            res.append(f"{v:.2f}".rstrip("0").rstrip("."))
            i += 1
            k += 1
        else:
            res.append(tok)
            i = 0
    return " ".join(res)


def band(name, y0, y1, bg, fills, texts, min_h=None):
    """fills: [(color, d, dx, dy)], texts: [(d, dx, dy, chars, color)]"""
    h = y1 - y0
    parts = [f'<rect x="0" y="{y0}" width="1440" height="{h}" fill="{COLORS[bg]}"/>'] if bg != "white" else []
    for color, d, dx, dy in fills:
        parts.append(f'<path d="{shift(d, dx, dy)}" fill="{COLORS[color]}"/>')
    defs = []
    for i, (d, dx, dy, chars, color) in enumerate(texts):
        pid = f"wave-{name}-{i}"
        defs.append(f'<path id="{pid}" d="{shift(d, dx, dy)}"/>')
        parts.append(
            f'<text class="band__text" fill="{color}"><textPath href="#{pid}" startOffset="0.1%">'
            f"{escape(chars)}</textPath></text>")
    label = " ".join(t[3] for t in texts).replace("\ufe0f", "").replace("✦", ",").replace("♥", ",")
    label = re.sub(r"\s*,\s*", ", ", re.sub(r"\s+", " ", label)).strip(" ,")
    aria = f' role="img" aria-label="{escape(label)}"' if texts else ' aria-hidden="true"'
    style = f"--band-h:{h}" + (f";--band-min:{min_h}px" if min_h else "")
    return (f'<div class="band band--{name}" style="{style}"{aria}>'
            f'<svg viewBox="0 {y0} 1440 {h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
            + (f"<defs>{''.join(defs)}</defs>" if defs else "")
            + "".join(parts) + "</svg></div>")


INK = "#181818"
INK_2 = "#1D1D1B"

T_SKILLS = "исследования  ✦  интервью  ✦  юзабилити-тесты  ✦  Discovery  ✦  CJM  ✦  прототипы  ✦  исследования  ✦  интервью  ✦  юзабилити-тесты  ✦  Discovery  ✦  CJM  ✦  прототипы  ✦  исследования  ✦ "
T_EXP = "B2B  ✦  Enterprise  ✦  почта  ✦  календарь  ✦  мессенджер  ✦  ВКС  ✦  iOS  ✦  Android  ✦  Web  ✦  B2B  ✦  Enterprise  ✦   почта  ✦  календарь  ✦  мессенджер  ✦  ВКС  ✦  iOS  ✦  Android  ✦  Web  ✦  B2B  ✦  Enterprise  ✦  "
T_CONTACT = "напишите мне  ♥\ufe0f  " * 10

BANDS = {
    # Главная
    "home-skills": lambda: band("home-skills", 572, 716, "white",
                                [("blue", fill_blue(1488), -120, 635)],
                                [(P_80, -120, 595, T_SKILLS, INK)], min_h=90),
    "home-pink": lambda: band("home-pink", 1928, 2020, "blue",
                              [("pink", fill_pink(1509), -120, 1932)], [], min_h=46),
    # лежит поверх низа видео Lu (класс band--overlay), поэтому без подложки
    "home-peach": lambda: band("home-peach", 3126, 3214, "white",
                               [("peach", fill_peach_full(1696, a=40.69, m=81.39), -120, 3130)], [], min_h=43),
    "home-lavender": lambda: band("home-lavender", 4644, 4730, "peach",
                                  [("lavender", fill_peach_full(1475.56), -546, 4648.72)], [], min_h=43),
    "home-exp": lambda: band("home-exp", 6040, 6172, "white",
                             [("lavender", fill_peach_full(1475.56), -546, 4648.72)],
                             [(P_80_INV, -543, 6085, T_EXP, INK)], min_h=84),
    "home-contact": lambda: band("home-contact", 7432, 7520, "white", [],
                                 [(P_60, -169, 7454, T_CONTACT, INK_2)], min_h=56),
}


def main(path):
    html = open(path, encoding="utf-8").read()

    def repl(m):
        name = m.group(1)
        return BANDS[name]()

    # маркер может быть уже заменён — тогда обновляем блок целиком
    def refresh(m):
        extra, name = m.group(1), m.group(2)
        return BANDS[name]().replace('class="band ', f'class="band {extra}', 1)

    html = re.sub(r'<div class="band ((?:band--overlay )?)band--([\w-]+)"[^>]*>.*?</svg></div>', refresh, html, flags=re.S)
    html = re.sub(r"<!--band:([\w-]+)-->", repl, html)
    open(path, "w", encoding="utf-8").write(html)


if __name__ == "__main__":
    for p in sys.argv[1:]:
        main(p)
