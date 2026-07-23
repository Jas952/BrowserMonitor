# Browser Monitor Knowledge Base

Актуальная карта проекта Browser Monitor. Состояние первично сверено с рабочим деревом 2026-07-23.

## Проект

- [[Product|Продукт и назначение]]
- [[Architecture|Архитектура]]
- [[Features|Реализованные возможности]]
- [[Decisions|Технические решения]]
- [[Opportunities|Единый план улучшений и задач]]

## Текущее состояние

- Версия расширения: `1.0.0`.
- Платформа: Chrome extension, Manifest V3, минимум Chrome `120`.
- Runtime-каталог: `Extension/`.
- Сборка не требует backend или bundler; тесты запускаются через Node test runner.
- Базовая проверка проекта: `npm --prefix Extension test`.
- База знаний описывает фактическое состояние рабочего дерева на 2026-07-23 и должна обновляться агентом при релевантных изменениях.

## Основные области

- Declarative Net Request блокировка рекламы, трекеров и cryptomining.
- Косметические фильтры, cookie-banner/social/popup suppression и custom filters.
- YouTube/Rutube video-ad controls и optional SponsorBlock.
- Link Safety предупреждения для коротких, похожих, punycode, redirect и risky social-feed ссылок.
- Popup с локальной статистикой блокировок и табов.
- Options UI с настройками защиты, exceptions, privacy controls и русской/английской локализацией.
- Statistics page с rolling seven-day window, top sites и top resources.
- Eco Mode и объяснение активности вкладок.
- Image Swap, element picker, Picture-in-Picture и optional cookie export.

## Статус документации

- [x] Зафиксировано назначение продукта.
- [x] Описана текущая архитектура.
- [x] Зафиксированы реализованные функции.
- [x] Зафиксированы ключевые технические решения.
- [x] Создан единый реестр улучшений и задач.

## Источники

- `README.md`
- `Extension/manifest.json`
- `Extension/package.json`
- `Extension/service-worker.js`
- `Extension/content.js`
- `Extension/options.js`
- `Extension/popup.js`
- `Extension/statistics-page.js`
- `Extension/link-safety.js`
- `Extension/tests/`
