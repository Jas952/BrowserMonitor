# Browser Monitor Privacy Policy

Effective date: July 15, 2026

Browser Monitor is a local-first Chrome extension for reducing page distractions and understanding or limiting resource-intensive tabs. It has no developer-operated analytics service, advertising service, account system, or remote database.

## Data processed locally

To provide its visible features, the extension processes the following data inside the user's Chrome profile:

- open-tab titles, URLs, activity state, audio state, and local Web Performance measurements;
- extension settings, site exceptions, user-created blocking rules, and user-selected filter-list URLs;
- custom Image Swap files selected by the user;
- cookie names and values only after the user explicitly opens the Cookies tool;
- page elements selected by the user with the element picker.

This data is used only to show tab-load explanations, apply the user's protection settings, export data requested by the user, and restore those settings later.

## Storage and retention

Settings, the latest tab snapshot, site exceptions, custom rules, and custom images are stored in `chrome.storage.local`. They remain until the user changes or resets them, uninstalls the extension, or clears the extension's storage.

Cookie values are not added to analytics, settings backups, or extension storage. A cookie export is created only after a direct user action and is saved or copied to the destination chosen by that user. Exported cookie files can grant access to signed-in accounts and must be kept private.

## Network activity

Browser Monitor does not transmit browsing history, tab analytics, cookies, custom images, settings, or user-created rules to the developer or to analytics providers.

If the user explicitly adds a custom HTTPS filter-list URL, Chrome contacts that address to download the list. The operator of that address may receive ordinary request information such as the user's IP address and user agent. Browser Monitor accepts only bounded filter data and does not send browsing history or cookies with that request.

## Sharing and selling data

Browser Monitor does not sell user data, use it for advertising or credit decisions, share it with data brokers, or allow the developer or other humans to read it. No user data is transferred to third parties by the extension except for the user-initiated HTTPS filter-list request described above.

## Permissions

Required permissions are used for local tab analysis, declarative blocking, settings storage, page controls, alarms, and the element-picker context menu. Cookies, downloads, and clipboard access are optional permissions requested only when the user invokes the corresponding export tool.

## Chrome Web Store Limited Use

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## User control

Users can pause protection, exclude sites, disable tab analysis, remove custom images and rules, reset all settings, revoke optional permissions in Chrome, or uninstall the extension at any time.

## Changes and contact

Material changes to these practices will be reflected in this document and, where required, disclosed in the extension before the changed data use begins. Support requests can be submitted through the support link on the Browser Monitor Chrome Web Store listing.

---

# Политика конфиденциальности Browser Monitor

Дата вступления в силу: 15 июля 2026 года

Browser Monitor — локальное расширение Chrome для уменьшения помех на страницах и контроля ресурсоёмких вкладок. У расширения нет сервера аналитики разработчика, рекламной системы, аккаунтов или удалённой базы данных.

Расширение локально обрабатывает названия и URL открытых вкладок, состояние активности и звука, показатели Web Performance, настройки защиты, исключения, пользовательские правила и изображения. Cookies читаются только после явного открытия инструмента Cookies и не сохраняются в аналитике или резервной копии.

Данные хранятся в профиле Chrome до изменения или сброса настроек, очистки хранилища либо удаления расширения. Browser Monitor не продаёт и не передаёт историю, аналитику вкладок, cookies, изображения или настройки разработчику, рекламным платформам и брокерам данных.

При добавлении собственного HTTPS-списка фильтров Chrome обращается непосредственно к указанному пользователем адресу. Его оператор может получить обычные сетевые данные запроса, но Browser Monitor не добавляет к нему историю браузера или cookies.

Cookies, загрузки и буфер обмена запрашиваются как дополнительные разрешения только при запуске соответствующего инструмента. Пользователь может отключить анализ, исключить сайт, сбросить данные, отозвать разрешения или удалить расширение в любое время.

Использование информации, полученной через API Google, соответствует Chrome Web Store User Data Policy и требованиям Limited Use.
