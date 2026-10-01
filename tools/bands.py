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


def fill_blue(h, a=39.95, m=79.89):
    return f"M 0 {a} C 210 {a} 210 0 420 0 C 630 0 630 {m} 840 {m} C 1050 {m} 1050 0 1260 0 C 1470 0 1470 {m} 1680 {m} C 1890 {m} 1890 0 2100 0 L 2100 {h} L 0 {h} Z"


def fill_pink(h, a=43.11, m=86.23):
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


def band(name, y0, y1, bg, fills, texts, min_h=None, center=False):
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
            f'<text class="band__text" fill="{color}"><textPath href="#{pid}" '
            + ('startOffset="50%" text-anchor="middle">' if center else 'startOffset="0.1%">')
            + f"{escape(chars)}</textPath></text>")
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

T_KAL_DONE = "анализ рынка  ✦  гипотезы  ✦  исследование пользователей  ✦  опрос  ✦  MVP  ✦  анализ рынка  ✦  гипотезы  ✦  исследование пользователей  ✦  опрос  ✦  MVP  ✦  анализ рынка  ✦  гипотезы  ✦  исследование пользователей  ✦  опрос  ✦  MVP  ✦  "
T_KAL_SOLUTION = "навигация  ✦  создание события  ✦  создание календаря  ✦  ошибки и нестандартные ситуации  ✦  навигация  ✦  создание события  ✦  создание календаря  ✦  ошибки и нестандартные ситуации  ✦  навигация  ✦  создание события  ✦  создание календаря  ✦  ошибки и нестандартные ситуации  ✦  "
T_KAL_NEXT = "✦  Концепт ✦  Lu ✦  Книги ✦  Концепт ✦  Lu ✦  Книги ✦  Концепт ✦  Lu ✦  Книги ✦  Концепт ✦  Lu ✦  Книги ✦  Концепт ✦  Lu ✦  Книги ✦  Концепт ✦  Lu ✦  Книги ✦"

T_LU_SCREENS = "логин  ✦  чтение  ✦  AI  ✦  профиль и библиотека  ✦  логин  ✦  чтение  ✦  AI  ✦  профиль и библиотека  ✦  логин  ✦  чтение  ✦  AI  ✦  профиль и библиотека  ✦  логин  ✦  чтение  ✦  AI  ✦  профиль и библиотека  ✦  логин  ✦  чтение  ✦  AI  ✦  профиль и библиотека  ✦  "
T_LU_NEXT = "✦  Антивирус  ✦  Kaspersky  ✦  МойОфис  ✦  Антивирус  ✦  Kaspersky  ✦  МойОфис  ✦  Антивирус  ✦  Kaspersky  ✦  МойОфис  ✦  Антивирус  ✦  Kaspersky  ✦  МойОфис  ✦  Антивирус  ✦  Kaspersky  ✦  МойОфис  ✦  Антивирус  ✦  Kaspersky  ✦  МойОфис  ✦  "
T_AV_CONTEXT = "Kaspersky Security Engine  ✦  информационная безопасность  ✦  B2B  ✦  Desktop  ✦  Mobile  ✦  Kaspersky Security Engine  ✦  информационная безопасность  ✦  B2B  ✦  Desktop  ✦  Mobile  ✦  Kaspersky Security Engine  ✦  информационная безопасность  ✦  B2B  ✦  Desktop  ✦  Mobile  ✦  "
T_AV_SOLUTION = "проверка файлов  ✦  блокировка  ✦  карантин  ✦  уведомления  ✦  проверка файлов  ✦  блокировка  ✦  карантин  ✦  уведомления  ✦  проверка файлов  ✦  блокировка  ✦  карантин  ✦  уведомления  ✦  проверка файлов  ✦  блокировка  ✦  карантин  ✦  уведомления  ✦  "
T_AV_NEXT = "✦  Календарь  ✦  Сквадус  ✦  МойОфис  ✦  Календарь  ✦  Сквадус  ✦  МойОфис  ✦  Календарь  ✦  Сквадус  ✦  МойОфис  ✦  Календарь  ✦  Сквадус  ✦  МойОфис  ✦  Календарь  ✦  Сквадус  ✦  МойОфис  ✦  Календарь  ✦  Сквадус  ✦  МойОфис  ✦  Календарь  ✦  Сквадус  ✦  МойОфис  ✦  "
AV_PEACH = fill_peach_full(1936, a=49.64, m=99.28)
HOME_H, HOME_M = 1081, 50
HOME_WAVE = fill_peach_full(HOME_H, a=HOME_M / 2, m=HOME_M)


def below_bottom(h, a, m):
    """Только то, что под нижней волной фигуры fill_peach_full: всё выше остаётся прозрачным."""
    b = h - m
    c = h - a
    return (f"M 2100 {h} C 1890 {h} 1890 {b} 1680 {b} C 1470 {b} 1470 {h} 1260 {h} C 1050 {h} 1050 {b} 840 {b} "
            f"C 630 {b} 630 {h} 420 {h} C 210 {h} 210 {c} 0 {c} L 0 {h + 10} L 2100 {h + 10} Z")


def white_rect(y0, y1):
    return f"M 0 {y0} L 1440 {y0} L 1440 {y1} L 0 {y1} Z"

BANDS = {
    # Кейс Lu (фрейм 190:27675)
    "lu-screens": lambda: band("lu-screens", 2672, 2790, "white", [],
                               [(P_80, -113, 2697, T_LU_SCREENS, INK)], min_h=70),
    "lu-next": lambda: band("lu-next", 6640, 6728, "white", [],
                            [(P_60, -117, 6663, T_LU_NEXT, INK)], min_h=56),
    # Кейс «Антивирус» (фрейм 190:27532): персиковый фон с волнами сверху и снизу
    "av-context": lambda: band("av-context", 1852, 2000, "white",
                               [("peach", AV_PEACH, -120, 1899.19)],
                               [(P_103, -120, 1876, T_AV_CONTEXT, INK)], min_h=90),
    "av-solution": lambda: band("av-solution", 3730, 3860, "white",
                                [("peach", AV_PEACH, -120, 1899.19)],
                                [(P_80, -120, 3771.19, T_AV_SOLUTION, INK)], min_h=80),
    "av-next": lambda: band("av-next", 5630, 5718, "white", [],
                            [(P_60, -162, 5653, T_AV_NEXT, INK)], min_h=56),

    # Кейс «Календарь» (фрейм 190:27294)
    "kal-done": lambda: band("kal-done", 2170, 2290, "white", [],
                             [(P_80, -120, 2195, T_KAL_DONE, INK)], min_h=70),
    "kal-solution": lambda: band("kal-solution", 8211, 8352, "white", [],
                                 [(P_109, -122, 8236, T_KAL_SOLUTION, INK)], min_h=80),
    "kal-next": lambda: band("kal-next", 12148, 12238, "white", [],
                             [(P_60, -101, 12171, T_KAL_NEXT, INK)], min_h=56),

    # Главная
    # низ полосы подрезан по тексту: голубой заливки под лентой больше нет
    "home-skills": lambda: band("home-skills", 572, 684, "white", [],
                                [(P_80, -120, 595, T_SKILLS, INK)], min_h=70),
    # Цветные блоки кейсов: волна сверху и снизу, у всех одна форма и высота.
    # Соседние блоки сдвинуты по фазе, чтобы волны не повторялись.
    # Нижняя полоса рисует фигуру на белой подложке. У Lu иначе: полоса
    # лежит поверх низа видео и рисует только белое под волной.
    **{f"home-{c}-{side}": (lambda c=c, side=side, x=x, y=y:
           band(f"home-{c}-{side}", y if side == "top" else y + HOME_H - HOME_M,
                y + HOME_M if side == "top" else y + HOME_H, "white",
                ([] if side == "top" else [("white", white_rect(y + HOME_H - HOME_M, y + HOME_H), 0, 0)])
                + [(c, HOME_WAVE, x, y)], [], min_h=24))
       for c, x, y in [("blue", -120, 1000), ("pink", -546, 2000), ("peach", -120, 3000), ("lavender", -546, 5043)]
       for side in ("top", "bottom")},
    "home-pink-bottom": lambda: band("home-pink-bottom", 2000 + HOME_H - HOME_M, 2000 + HOME_H, "white",
                                     [("white", below_bottom(HOME_H, HOME_M / 2, HOME_M), -546, 2000)], [], min_h=24),
    # лента после лавандового блока: отдельно по белому, текст по центру экрана
    "home-exp": lambda: band("home-exp", 6100, 6252, "white", [],
                             [(P_80_INV, -330, 6170, T_EXP, INK)], min_h=90, center=True),
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
