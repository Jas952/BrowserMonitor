# Browser Monitor Privacy Policy

Effective date: July 27, 2026

Browser Monitor is a local-first Chrome extension for safer browsing, reducing page distractions, and understanding browser activity. It has no developer-operated analytics service, advertising service, account system, or remote database.

## Data Processed Locally

Browser Monitor processes data inside the user's Chrome profile to provide visible extension features:

- open-tab titles, URLs, activity state, audio state, and local Web Performance measurements;
- locally available favicons and compact per-domain active-visit counters;
- extension settings, site exceptions, temporary pauses, user-created blocking rules, and user-selected filter-list URLs;
- Link Safety settings, allowed domains, blocked domains, warning counters, and recent redirect chains;
- Search protection labels and local allowlist decisions;
- History filter settings and domains selected by the user for local history cleanup;
- custom Image Swap files selected by the user;
- cookie names and values only after the user explicitly opens the Cookies tool;
- page elements selected by the user with the element picker;
- compact seven-day blocking counters containing site domains, blocked resource domains, and event categories;
- compact 90-day activity counters containing only domains, visits, active seconds, video seconds, and reading seconds;
- video resume records for supported long-form videos, with sanitized URLs and media identity data;
- Crypto Guard address fingerprints for short-lived copy/paste verification;
- privacy receipt data assembled locally for the current site;
- feedback drafts containing the email address, request text, status, and an optional screenshot selected by the user.

This data is used only to show protection state, explain tab activity, provide local analytics, apply user settings, warn before suspicious link transitions, clean selected local history entries after user permission, export data requested by the user, and restore settings later.

## Storage and Retention

Settings, the latest tab snapshot, site exceptions, Link Safety domains, History filter domains, custom rules, and custom images are stored in `chrome.storage.local`. They remain until the user changes or resets them, uninstalls the extension, or clears extension storage.

Blocking and warning statistics are limited to seven local calendar days. Site activity counters are limited to 90 local calendar days. Video resume records are limited to 100 entries and no longer than 90 days. Redirect chains are limited to 100 entries and no longer than 30 days. Crypto Guard stores only an address SHA-256 fingerprint for up to five minutes.

Full page URLs, page titles, and page text are not stored in site activity analytics. Full URLs are used only where a feature explicitly needs to return to a page or prepare a user-requested report, and known tracking or session parameters are removed.

Feedback drafts are limited to the 20 most recent entries and 6 MB in total. They remain local until extension storage is cleared or the extension is uninstalled. A full page URL and title are included only when the user explicitly chooses to report filter problems on the current site. Selecting Send opens a pre-filled email draft to `darktmonth@gmail.com`; the user reviews and explicitly sends it from their mail app. A selected screenshot is not uploaded automatically and must be attached by the user.

Cookie values are not added to analytics, settings backups, or extension storage. A cookie export is created only after a direct user action and is saved or copied to the destination chosen by that user. Exported cookie files can grant access to signed-in accounts and must be kept private.

## Network Activity

Browser Monitor does not transmit browsing history, tab analytics, Link Safety checks, History filter domains, cookies, custom images, settings, or user-created rules to the developer or to analytics providers.

When the user explicitly continues from the feedback form, Chrome opens a `mailto:` draft containing the provided email, request text, extension version, and any explicitly selected site-report details. Nothing is sent until the user sends that email in their mail app.

If the user explicitly adds a custom HTTPS filter-list URL, Chrome contacts that address to download the list. The operator of that address may receive ordinary request information such as the user's IP address and user agent. Browser Monitor accepts only bounded filter data and does not send browsing history or cookies with that request.

When sponsored-segment skipping is enabled and the user opens a YouTube video, Browser Monitor contacts the public SponsorBlock API operated at `sponsor.ajay.app`. It sends a four-character prefix of the SHA-256 hash of the video ID and the requested `sponsor` / `selfpromo` categories. It does not send the full video ID, page URL, cookies, tab title, or local statistics. Like any network service, the API operator can receive ordinary connection information such as the user's IP address and user agent.

## Sharing and Selling Data

Browser Monitor does not sell user data, use it for advertising or credit decisions, share it with data brokers, or allow the developer or other humans to read local extension data. Third-party network interactions are limited to user-configured HTTPS filter-list downloads, the optional SponsorBlock lookup, and explicit email feedback handoff described above.

## Permissions

Required permissions are used for local tab and foreground activity analysis, declarative blocking, settings storage, page controls, alarms, context menus, locally available site icons, and local request diagnostics. The `webRequest` permission observes request metadata needed for local counters and redirect diagnostics; response bodies and request content are not read.

Cookies, downloads, clipboard access, browsing data cleanup, and history access are optional permissions requested only when the user invokes the corresponding tool. The optional `history` permission is used only to delete local Chrome history entries matching domains the user added to the History filter; activity analytics does not read Chrome History.

## Chrome Web Store Limited Use

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## User Control

Users can pause protection, exclude sites, disable tab analysis, remove custom images and rules, clear statistics, reset all settings, revoke optional permissions in Chrome, or uninstall the extension at any time.

## Changes and Contact

Material changes to these practices will be reflected in this document and, where required, disclosed in the extension before the changed data use begins. Support requests can be sent through the feedback form or by email to `darktmonth@gmail.com`.

---

# Политика конфиденциальности Browser Monitor

Дата вступления в силу: 27 июля 2026 года

Browser Monitor — локальное расширение Chrome для более безопасного браузинга, уменьшения помех на страницах и понимания активности браузера. У расширения нет сервера аналитики разработчика, рекламной системы, аккаунтов или удалённой базы данных.

Расширение локально обрабатывает названия и URL открытых вкладок, favicon, состояние активности и звука, показатели Web Performance, настройки защиты, исключения, временные паузы, пользовательские правила, настройки Link Safety, Search protection, History filter, выбранные изображения, данные privacy receipt, compact redirect chains, короткоживущие fingerprints Crypto Guard и компактную статистику по доменам. Полные URL, заголовки и текст страниц не записываются в аналитику посещений.

Данные хранятся в профиле Chrome до изменения или сброса настроек, очистки хранилища либо удаления расширения. Статистика блокировок ограничена семью днями, аналитика посещений — 90 днями, записи продолжения просмотра — 100 записями и 90 днями, redirect chains — 100 записями и 30 днями, Crypto Guard fingerprints — пятью минутами.

Черновики обратной связи содержат указанную пользователем почту, текст, статус и необязательный screenshot. Быстрый репорт фильтров дополнительно включает явно выбранный пользователем URL/заголовок страницы и ограниченную диагностику. Хранятся не более 20 последних записей и не более 6 МБ суммарно. Кнопка отправки открывает заполненное письмо на `darktmonth@gmail.com`; пользователь проверяет и отправляет письмо самостоятельно. Screenshot автоматически не отправляется и прикрепляется пользователем.

Browser Monitor не продаёт и не передаёт историю, аналитику вкладок, cookies, изображения или настройки разработчику, рекламным платформам и брокерам данных. Проверка подозрительных ссылок и результатов поиска выполняется локально и не отправляет URL на внешний reputation-сервис.

При добавлении собственного HTTPS-списка фильтров Chrome обращается непосредственно к указанному пользователем адресу. Если включён SponsorBlock и открыто видео YouTube, Browser Monitor обращается к публичному API `sponsor.ajay.app`, передавая только четыре символа SHA-256 от ID видео и категории `sponsor` / `selfpromo`.

Обязательные разрешения используются для локального анализа вкладок, блокировки, настроек, управления страницами, alarms, контекстного меню, favicon и локальной диагностики запросов. Cookies, загрузки, буфер обмена, browsing data cleanup и история запрашиваются как дополнительные разрешения только при запуске соответствующего инструмента. Пользователь может отключить анализ, исключить сайт, очистить статистику, сбросить данные, отозвать разрешения или удалить расширение в любое время.

Использование информации, полученной через API Google, соответствует Chrome Web Store User Data Policy и требованиям Limited Use.
