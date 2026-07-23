# GitHub и релизы

Этот документ задаёт единый стандарт работы с GitHub, README и релизами Browser Monitor. Он применяется ко всем следующим версиям.

## Общие принципы

- GitHub-материалы пишутся для пользователя продукта, а не как технический журнал разработки.
- В центре описания находятся новые возможности, заметные изменения поведения и пользовательская польза.
- В release notes не перечисляются имена внутренних функций, файлов, API, CSS selectors, разрешённые лимиты, тестовые fixture или детали рефакторинга.
- Мелкие fixes, совместимость, оптимизация и визуальные правки объединяются в одну общую фразу.
- Нельзя заявлять функцию выпущенной, если её нет в release ZIP или она не прошла предусмотренную проверку.
- Privacy-изменения, новые permissions и внешние сетевые взаимодействия описываются явно, даже если технические подробности обычно скрываются.

## Версионирование

Используется формат `MAJOR.MINOR.PATCH`:

- `PATCH` — исправления, оптимизация и небольшие улучшения существующих возможностей;
- `MINOR` — заметная новая пользовательская возможность или крупное расширение продукта;
- `MAJOR` — несовместимое изменение продукта, данных или основного пользовательского сценария.

Перед релизом одна версия должна быть указана во всех местах:

- `Extension/manifest.json`;
- README badge и имя ZIP в инструкции установки;
- `docs/ReleaseChecklist.md`;
- `docs/ReleaseNotes-X.Y.Z.md`;
- `docs/knowledge/Product.md`;
- Git tag `vX.Y.Z`;
- название GitHub Release и release assets.

## Единый формат GitHub Release

Release notes пишутся на английском языке в следующем формате:

```markdown
# Browser Monitor X.Y.Z

One short paragraph explaining the release in user-facing language.

## What’s new

- three to six user-visible changes;
- each point explains value rather than implementation;
- related small changes are combined.

## Improvements

This release also includes general reliability, compatibility, performance, and interface improvements across browser protection and analytics.

## Privacy

Include this section when the release processes new data, changes permissions, or adds an external interaction. Otherwise briefly confirm that Browser Monitor remains local-first.

## Install

1. Download `browser-monitor-X.Y.Z.zip` below.
2. Extract the archive to a permanent folder.
3. Open `chrome://extensions` and enable **Developer mode**.
4. Select **Load unpacked** and choose the extracted folder containing `manifest.json`.
5. Pin Browser Monitor to the Chrome toolbar.

## Downloads

- `browser-monitor-X.Y.Z.zip` — unpacked Chrome extension package;
- `SHA256SUMS.txt` — checksum for archive verification.
```

## Как описывать изменения

Хорошо:

- `Improved protection against video advertising on supported sites.`
- `Added local activity insights for reading and video time.`
- `This release also includes general reliability and performance improvements.`

Не использовать:

- перечень изменённых функций и файлов;
- номера внутренних правил или лимитов;
- описание каждого исправленного selector;
- отдельные пункты «уменьшен polling», «изменён timeout», «исправлена мутация Date»;
- длинный список мелких UI-отступов и состояний кнопок.

Если мелких изменений много, они сворачиваются в одну фразу раздела `Improvements`. Техническая детализация остаётся в commit history, тестах и knowledge-документации.

## README

README описывает текущее стабильное состояние продукта:

- краткое назначение;
- основные пользовательские возможности;
- local-first и privacy-позиционирование;
- актуальную версию;
- установку последнего ZIP;
- ссылку на последний GitHub Release;
- контакты и связанные проекты.

README не должен превращаться в changelog. Устаревшие возможности и старые номера ZIP обновляются в рамках каждого релиза.

## Процесс выпуска

1. Сопоставить заявленные возможности с фактическим кодом.
2. Обновить версию во всех обязательных местах.
3. Создать `docs/ReleaseNotes-X.Y.Z.md` по единому шаблону.
4. Запустить основной набор тестов расширения.
5. Собрать ZIP через release builder.
6. Проверить имя архива, версию manifest, состав ZIP и SHA-256.
7. Зафиксировать release scope отдельным commit.
8. Отправить изменения в GitHub и убедиться, что release commit находится в основной ветке.
9. Создать tag `vX.Y.Z`.
10. Создать GitHub Release из подготовленного файла и приложить ZIP вместе с `SHA256SUMS.txt`.
11. Проверить опубликованную страницу, текст, tag и скачивание обоих assets.

## Запреты

- Не публиковать tag до успешной сборки и тестов.
- Не перезаписывать существующий release tag другой сборкой.
- Не включать в commit локальные каталоги `.obsidian`, `.codebase-memory`, временные screenshots или служебные файлы Codex.
- Не публиковать секреты, cookies, локальные browser profiles и пользовательские данные.
- Не называть черновую или непроверенную возможность выпущенной.

## Связанные материалы

- [[Product]]
- [[Architecture]]
- [[Features]]
- [[Decisions]]
- [[Opportunities]]
