# Decisions

## Local-first Chrome extension

Статус: принято

Решение: Browser Monitor работает как Manifest V3 Chrome extension без аккаунта, backend-сервера и developer-operated analytics.

Обоснование: продукт анализирует browser activity и privacy-sensitive browsing data. Эти данные должны оставаться в локальном Chrome profile.

Последствия: все новые функции должны проходить проверку на локальность данных, permissions и понятный user consent.

Связанные файлы: `Extension/manifest.json`, `README.md`, `docs/PrivacyPolicy.md`.

## Manifest V3 и Declarative Net Request

Статус: принято

Решение: network-блокировка строится на Chrome Declarative Net Request и rule resources в `Extension/rules/`.

Обоснование: Manifest V3 требует декларативной модели блокировки; она снижает runtime-нагрузку service worker и соответствует текущей платформе Chrome extensions.

Последствия: списки должны учитывать лимиты DNR, происхождение правил и предсказуемость обновления generated JSON.

Связанные файлы: `Extension/manifest.json`, `Extension/rules/`, `Extension/blocker.js`, `Extension/filter-parser.js`.

## Ручные cosmetic rules ограничены сайтом

Статус: принято

Решение: команда контекстного меню сначала использует элемент, по которому выполнен правый клик, а fallback picker позволяет выбрать другую область. Новое правило хранится как `domain##selector` и применяется только на соответствующем сайте. Исключение сайта из блокировки использует общий allowlist DNR и cosmetic protection.

Обоснование: глобальный selector может случайно скрыть похожие элементы на несвязанных сайтах. Привязка к домену делает ручную блокировку предсказуемой и соответствует ожиданию пользователя.

Последствия: старые selector-only правила остаются совместимыми и продолжают считаться глобальными; новые правила требуют HTTP/HTTPS sender URL. После добавления исключения страница перезагружается, чтобы восстановить ранее заблокированные network-ресурсы.

Связанные файлы: `Extension/content.js`, `Extension/service-worker.js`, `Extension/tests/manifest.test.js`.

## Optional permissions для чувствительных возможностей

Статус: принято

Решение: `clipboardWrite`, `cookies`, `downloads` и `history` остаются optional permissions и запрашиваются только для связанных пользовательских действий.

Обоснование: базовая защита не должна требовать больше прав, чем нужно. History/cookies/downloads/clipboard являются чувствительными возможностями и должны иметь явную причину.

Последствия: любое изменение permissions требует обновления `docs/PrivacyPolicy.md` и базы знаний.

Связанные файлы: `Extension/manifest.json`, `docs/PrivacyPolicy.md`.

## Разделение extension surfaces

Статус: принято

Решение: service worker, content script, popup, options, statistics и link warning существуют как отдельные surfaces.

Обоснование: разные части расширения имеют разные lifecycle, доступные APIs и UX-задачи. Смешивание логики усложнит permissions, тестирование и поддержку.

Последствия: общие модели и helpers должны выделяться в отдельные JS-модули, а UI pages должны обращаться к ним через явные интерфейсы.

Связанные файлы: `Extension/service-worker.js`, `Extension/content.js`, `Extension/popup.js`, `Extension/options.js`, `Extension/statistics-page.js`, `Extension/link-safety.js`.

## Локальная Link Safety эвристика

Статус: принято

Решение: suspicious-link предупреждения основаны на локальных проверках: shorteners, lookalike domains, punycode, redirect-сигналы и risky social-feed destinations.

Обоснование: локальная модель сохраняет privacy и не требует отправки URL внешнему сервису.

Последствия: UI и документация не должны обещать стопроцентную phishing protection; результат является предупреждением, а не вердиктом безопасности.

Связанные файлы: `Extension/link-safety.js`, `Extension/link-warning.html`, `Extension/link-warning.js`.

## Plain JavaScript без bundler

Статус: принято

Решение: runtime использует plain HTML/CSS/JavaScript modules и Node test runner, без отдельного bundler-пайплайна.

Обоснование: текущий extension можно загружать напрямую через `Load unpacked`, а отсутствие сборки упрощает аудит файлов, permissions и release ZIP.

Последствия: при добавлении dependency или build step нужно явно обновить release flow, README и checklist.

Связанные файлы: `Extension/package.json`, `docs/ReleaseChecklist.md`.

## Активность вместо истории открытых вкладок

Статус: принято

Решение: аналитика посещений строится на коротких foreground samples из content script, а не на Chrome History и не на времени жизни вкладки. Sample принимается только от видимого документа в фокусе после недавнего взаимодействия. Хранятся домен и дневные visits/active/video/reading counters за 90 дней.

Обоснование: история переходов не показывает, читал ли пользователь страницу, а время открытой вкладки завышает использование. Локальная foreground-модель лучше соответствует фактическому вниманию и не требует нового чувствительного permission.

Последствия: нестандартные video players и текстовые приложения могут классифицироваться неидеально. Полные URL, заголовки и текст не сохраняются. Permissions ограничены текущими функциями.

Связанные файлы: `Extension/content.js`, `Extension/service-worker.js`, `Extension/activity-statistics.js`, `Extension/activity.html`, `Extension/activity-page.js`, `Extension/manifest.json`.

## Ограниченные фоновые сканы и пакетная статистика

Статус: принято

Решение: content script не выполняет постоянный полный DOM-поллинг на каждой странице. Generic protection работает по релевантным DOM-событиям, fallback-поллинг ограничен YouTube/Rutube, observers защиты и history privacy приостанавливаются в скрытых вкладках, а Eco Mode объединяет частые mutation-события. Сетевые события статистики записываются в `chrome.storage.local` пакетами.

Обоснование: полный поиск по DOM каждые 1-2 секунды в каждой вкладке и частые полные записи storage создают CPU, memory и I/O нагрузку, которая растёт вместе с количеством открытых динамических страниц.

Последствия: ни один пользовательский инструмент не удаляется. При возврате скрытой вкладки выполняется актуализирующий скан; SponsorBlock time-update обработчик продолжает работать для подключённого видео; задержка отображения самого нового счётчика статистики может составлять до двух секунд, а явный запрос statistics принудительно сбрасывает накопленный пакет.

Связанные файлы: `Extension/content.js`, `Extension/service-worker.js`, `Extension/tests/manifest.test.js`.

## Обратная связь через явный GitHub submission

Статус: принято

Решение: feature/bug request сначала сохраняется как локальный черновик, затем расширение открывает заполненный GitHub issue composer. Для проблемы фильтров popup по явному нажатию передаёт форме полный URL и заголовок текущей страницы; форма добавляет ограниченную диагностику состояния защиты и фильтров. Пользователь видит текст, вручную прикрепляет screenshot и подтверждает публикацию.

Обоснование: в проекте нет backend и support API. Прямая скрытая отправка потребовала бы нового сервиса, disclosure и политики хранения. GitHub даёт проверяемое место назначения без новых extension permissions.

Последствия: email, текст, явно выбранный для репорта URL, ограниченная диагностика и необязательное изображение до 2 МБ могут находиться в локальной очереди до 20 записей и не более 6 МБ суммарно. Обычная аналитика по-прежнему не сохраняет полные URL. Изображение нельзя безопасно прикрепить к GitHub Issue автоматически без токена/API, поэтому пользователь добавляет его в открывшейся форме вручную.

Связанные файлы: `Extension/feedback.html`, `Extension/feedback.css`, `Extension/feedback.js`, `Extension/popup.html`, `Extension/options.html`.

## Связанные материалы

- [[Product]]
- [[Architecture]]
- [[Features]]
- [[Opportunities]]
