# Портфолио — Виктория Шаханина, Product Designer

Персональный сайт-портфолио. Senior / Lead Product Designer: B2B, Enterprise, исследования, дизайн-системы, прототипы и сопровождение разработки до релиза.

## Стек

Статический сайт на чистом HTML + CSS, без фреймворков и сборки. Публикуется на GitHub Pages как есть (`.nojekyll`).

## Структура

- `index.html` — главная страница.
- Кейсы (у каждого свой `index.html`): `antivirus/`, `badminton/`, `calendar/`, `mail/`, `proto/`, `recurring/`, `wallet/`.
- `fonts/` — локальные шрифты, `images/` — изображения.
- `cv.pdf` — резюме.
- `CLAUDE.md` + `.claude/rules/` — инструкции для работы с Claude Code.

## Запуск локально

Открыть `index.html` в браузере двойным кликом, либо поднять локальный сервер:

```bash
python3 -m http.server 8000
```

Затем открыть http://localhost:8000

## Деплой

Изменения публикуются на GitHub Pages после пуша в рабочую ветку.
