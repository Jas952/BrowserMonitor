# Browser Monitor Privacy Policy

Effective date: July 22, 2026

Browser Monitor is a local-first Chrome extension for reducing page distractions and understanding or limiting resource-intensive tabs. It has no developer-operated analytics service, advertising service, account system, or remote database.

## Data processed locally

To provide its visible features, the extension processes the following data inside the user's Chrome profile:

- open-tab titles, URLs, activity state, audio state, and local Web Performance measurements;
- locally available favicons and compact per-domain active-visit counters;
- extension settings, site exceptions, user-created blocking rules, and user-selected filter-list URLs;
- Link Safety settings, allowed domains, blocked domains, and compact warning counters;
- History filter settings and domains selected by the user for local history cleanup;
- custom Image Swap files selected by the user;
- cookie names and values only after the user explicitly opens the Cookies tool;
- page elements selected by the user with the element picker.
- compact seven-day blocking counters containing site domains, blocked resource domains, and event categories;
- compact 90-day activity counters containing only domains, visits, active seconds, video seconds, and reading seconds;
- feedback drafts containing the email address, request text, status, and an optional screenshot selected by the user; a site-filter report also contains the explicitly reported page URL/title and a bounded snapshot of relevant protection settings;
- a YouTube video ID and SponsorBlock segment results cached locally for up to 12 hours when sponsored-segment skipping is enabled.

This data is used only to show tab-load explanations and local activity analytics, apply the user's protection settings, warn before suspicious link transitions, clean selected local history entries after user permission, export data requested by the user, and restore those settings later.

## Storage and retention

Settings, the latest tab snapshot, site exceptions, Link Safety allowed or blocked domains, History filter domains, custom rules, and custom images are stored in `chrome.storage.local`. They remain until the user changes or resets them, uninstalls the extension, or clears the extension's storage. Blocking and warning statistics are limited to seven local calendar days. Site activity counters are limited to 90 local calendar days. Both can be cleared from their statistics windows. Full page URLs, page titles, and page text are not stored in site activity analytics. SponsorBlock cache entries expire after 12 hours and are bounded to 80 videos.

Feedback drafts are limited to the 20 most recent entries and 6 MB in total. They remain local until extension storage is cleared or the extension is uninstalled. A full page URL and title are included only when the user explicitly chooses to report filter problems on the current site. Selecting Send opens a pre-filled GitHub issue page with that report and bounded filter diagnostics; the user reviews and explicitly submits it. A selected screenshot is not uploaded automatically and must be attached by the user on GitHub.

Cookie values are not added to analytics, settings backups, or extension storage. A cookie export is created only after a direct user action and is saved or copied to the destination chosen by that user. Exported cookie files can grant access to signed-in accounts and must be kept private.

## Network activity

Browser Monitor does not transmit browsing history, tab analytics, Link Safety checks, History filter domains, cookies, custom images, settings, or user-created rules to the developer or to analytics providers.

When the user explicitly continues from the feedback form, Chrome opens `github.com/Jas952/BrowserMonitor/issues/new` with the provided email and request text in the URL query. A site-filter report additionally includes the explicitly selected page URL/title, extension version, site exception/pause state, and relevant filter on/off states. GitHub may receive ordinary connection and account information. Nothing is submitted until the user confirms it on GitHub.

If the user explicitly adds a custom HTTPS filter-list URL, Chrome contacts that address to download the list. The operator of that address may receive ordinary request information such as the user's IP address and user agent. Browser Monitor accepts only bounded filter data and does not send browsing history or cookies with that request.

When sponsored-segment skipping is enabled and the user opens a YouTube video, Browser Monitor contacts the public SponsorBlock API operated at `sponsor.ajay.app`. It sends a four-character prefix of the SHA-256 hash of the video ID and the requested `sponsor` / `selfpromo` categories. It does not send the full video ID, page URL, cookies, tab title, or local statistics. Like any network service, the API operator can receive ordinary connection information such as the user's IP address and user agent.

## Sharing and selling data

Browser Monitor does not sell user data, use it for advertising or credit decisions, share it with data brokers, or allow the developer or other humans to read it. Third-party network interactions are limited to the user-configured HTTPS filter-list downloads and the privacy-preserving SponsorBlock lookup described above.

## Permissions

Required permissions are used for local tab and foreground activity analysis, declarative blocking, settings storage, page controls, alarms, the element-picker context menu, and locally available site icons. The `webRequest` permission observes requests that Chrome has already ended with `ERR_BLOCKED_BY_CLIENT` to create domain-level counters; response bodies and request content are not read. Cookies, downloads, clipboard access, and history access are optional permissions requested only when the user invokes the corresponding tool. The optional `history` permission is used only to delete local Chrome history entries matching domains the user added to the History filter; activity analytics does not read Chrome History.

## Chrome Web Store Limited Use

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## User control

Users can pause protection, exclude sites, disable tab analysis, remove custom images and rules, reset all settings, revoke optional permissions in Chrome, or uninstall the extension at any time.

## Changes and contact

Material changes to these practices will be reflected in this document and, where required, disclosed in the extension before the changed data use begins. Support requests can be submitted through the support link on the Browser Monitor Chrome Web Store listing.

---

# Политика конфиденциальности Browser Monitor

Дата вступления в силу: 22 июля 2026 года

Browser Monitor — локальное расширение Chrome для уменьшения помех на страницах и контроля ресурсоёмких вкладок. У расширения нет сервера аналитики разработчика, рекламной системы, аккаунтов или удалённой базы данных.

Расширение локально обрабатывает названия и URL открытых вкладок, локальные favicon, состояние активности и звука, показатели Web Performance, настройки защиты, исключения, пользовательские правила, настройки Link Safety, домены History filter и изображения. Также сохраняются компактные счётчики блокировок и предупреждений по доменам за семь дней и счётчики посещений/активного времени/видео/чтения по доменам за 90 дней. Полные URL, заголовки и текст страниц в аналитику посещений не записываются. Cookies читаются только после явного открытия инструмента Cookies и не сохраняются в аналитике или резервной копии.

Черновики обратной связи содержат указанную пользователем почту, текст, статус и необязательный screenshot. Быстрый репорт фильтров дополнительно сохраняет явно выбранный пользователем URL/заголовок страницы и ограниченную диагностику включённых фильтров, исключения или временной паузы. Хранятся не более 20 последних записей и не более 6 МБ суммарно. Кнопка отправки открывает заполненную форму GitHub Issue; пользователь проверяет и подтверждает публикацию самостоятельно. Screenshot автоматически не загружается и прикрепляется пользователем на GitHub.

Данные хранятся в профиле Chrome до изменения или сброса настроек, очистки хранилища либо удаления расширения. Статистика блокировок автоматически ограничена семью локальными календарными днями, аналитика посещений — 90 днями. Время учитывается только для видимого документа в фокусе после недавнего взаимодействия; фоновые и неиспользуемые вкладки не увеличивают счётчики. Проверка подозрительных ссылок выполняется локально и не отправляет URL на внешний reputation-сервис. Browser Monitor не продаёт и не передаёт историю, аналитику вкладок, cookies, изображения или настройки разработчику, рекламным платформам и брокерам данных.

При добавлении собственного HTTPS-списка фильтров Chrome обращается непосредственно к указанному пользователем адресу. Его оператор может получить обычные сетевые данные запроса, но Browser Monitor не добавляет к нему историю браузера или cookies.

Если включён пропуск рекламных интеграций и открыто видео YouTube, Browser Monitor обращается к публичному API SponsorBlock на `sponsor.ajay.app`. Передаются четыре символа SHA-256 от ID видео и категории `sponsor` / `selfpromo`, но не полный ID, URL, cookies, заголовок вкладки или локальная статистика. Оператор API может получить обычные данные соединения, включая IP-адрес и user agent. Полный ID и найденные сегменты хранятся только локально до 12 часов.

Обязательные разрешения используются для локального анализа вкладок и foreground-активности, блокировки, настроек, управления страницами, alarms, контекстного меню и локальных favicon. Разрешение `webRequest` используется только для подсчёта запросов, уже завершённых Chrome с `ERR_BLOCKED_BY_CLIENT`; содержимое запросов и ответов не читается. Cookies, загрузки, буфер обмена и история запрашиваются как дополнительные разрешения только при запуске соответствующего инструмента. Optional `history` используется только для удаления локальных записей Chrome history по доменам из History filter и не используется аналитикой посещений. Пользователь может отключить анализ, исключить сайт, очистить статистику, сбросить данные, отозвать разрешения или удалить расширение в любое время.

Использование информации, полученной через API Google, соответствует Chrome Web Store User Data Policy и требованиям Limited Use.
