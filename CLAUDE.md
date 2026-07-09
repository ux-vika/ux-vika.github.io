# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Портфолио Виктории Шаханиной — Product Designer

Статический сайт-портфолио. Деплой на GitHub Pages (`.nojekyll`, ветка публикуется как есть, без сборки).

## Commands

Сборки, линтера и тестов нет — это чистый статический сайт.

- **Локальный просмотр:** `python3 -m http.server 8000`, затем http://localhost:8000
- **Скриншот страницы** (для сверки с референсом): через Playwright, результат в `output/playwright/` (см. @.claude/rules/design-recreation.md)

## Architecture

- **Каждая страница самодостаточна.** Общего CSS-файла в проекте нет вообще — стили лежат в `<style>` внутри каждого HTML-файла, скрипты тоже inline. Визуальный стиль между страницами **не наследуется**: правка оформления на одной странице не влияет на другие.
- `index.html` (~1000 строк) — главная: hero, блок «доступность», сетка карточек-кейсов. Каждая карточка ссылается на свой `<кейс>/index.html`.
- Кейсы (`antivirus/`, `badminton/`, `calendar/`, `mail/`, `proto/`, `recurring/`, `wallet/`) — отдельные короткие страницы (~175 строк) со своими стилями и скриптами. `badminton/` содержит дополнительно `proto.html`.
- Следствие: чтобы изменить общий вид (шрифты, цвета, отступы) на всём сайте, нужно пройтись по `<style>` в каждом файле, а не в одном месте.

## Правила (подключены импортами)

- @.claude/rules/stack.md
- @.claude/rules/structure.md
- @.claude/rules/design-recreation.md
- @.claude/rules/conventions.md
