# Chrome Web Store listing

## Product

- Name: **Browser Monitor**
- Category: **Productivity**
- Language variants: English and Russian
- Manifest version: **1.0.0**

## Single purpose

Browser Monitor gives users local control over page distractions and resource-intensive browser tabs by combining declarative content protection with explainable tab-load measurements and reversible page controls.

## Short description

Analyzes Chrome tabs and provides local ad, tracker, distraction, cookie-banner, and custom element controls.

## English description

Browser Monitor keeps Chrome calmer without sending your browsing data to an analytics server.

It blocks common advertising, tracking, and cryptomining requests with Chrome's efficient Declarative Net Request engine, removes supported page distractions, and explains which open tabs are doing the most work. Heavy tabs can be paused with reversible Eco Mode controls.

Key features:

- local tab-load scores with plain-language reasons and recommendations;
- EasyList and EasyPrivacy network protection;
- optional Russian, social-widget, and anti-adblock page filters;
- cookie-banner, newsletter, survey, notification-prompt, autoplay, and floating-video controls;
- permanent site exceptions and a temporary pause;
- manual element picker and custom blocking rules;
- Image Swap themes and up to nine local images;
- local settings backup and restore;
- optional current-site cookie export and Picture-in-Picture tools.

All tab analysis and settings stay in the local Chrome profile. Browser Monitor has no account, advertising SDK, or developer-operated analytics server. Cookie, download, and clipboard permissions are requested only when the related tool is used.

## Russian description

Browser Monitor делает Chrome спокойнее и не отправляет историю браузера на сервер аналитики.

Расширение блокирует распространённую рекламу, трекеры и майнинг через эффективный механизм Chrome Declarative Net Request, убирает выбранные помехи на страницах и объясняет, какие вкладки создают нагрузку. Тяжёлую вкладку можно обратимо приостановить через Eco Mode.

Основные возможности:

- локальная оценка нагрузки вкладок с понятными причинами и рекомендациями;
- сетевая защита EasyList и EasyPrivacy;
- дополнительные русскоязычные, социальные и anti-adblock фильтры;
- управление cookie-баннерами, рассылками, опросами, запросами уведомлений, автовоспроизведением и плавающим видео;
- постоянные исключения и временная пауза для сайта;
- ручное скрытие элемента и собственные правила;
- темы Image Swap и до девяти локальных изображений;
- локальная резервная копия настроек;
- дополнительные инструменты экспорта cookies текущего сайта и Picture-in-Picture.

Аналитика вкладок и настройки остаются в локальном профиле Chrome. У Browser Monitor нет аккаунта, рекламного SDK или сервера аналитики разработчика. Доступ к cookies, загрузкам и буферу обмена запрашивается только при запуске соответствующего инструмента.

## Permission justifications

| Permission | Justification |
|---|---|
| `alarms` | Refreshes local tab measurements, temporary pauses, and user-added filter subscriptions without a persistent background page. |
| `contextMenus` | Starts the user-facing element picker from the page context menu. |
| `declarativeNetRequest` | Applies packaged and user-configured blocking rules inside Chrome. |
| `scripting` | Applies packaged cosmetic CSS and invokes explicit current-page controls such as Picture-in-Picture. |
| `storage` | Stores settings, the latest local tab snapshot, rules, and custom images. |
| `tabs` | Lists open web tabs and reads their title, URL, active, audible, and discarded state for the visible analytics feature. |
| `http://*/*`, `https://*/*` | Runs the local performance observer and page-level protection on regular websites. |
| Optional `cookies` | Reads cookies only after the user opens the Cookies tool. |
| Optional `downloads` | Saves a cookie export or settings backup after a direct user action. |
| Optional `clipboardWrite` | Copies a user-requested cookie export. |

## Privacy dashboard disclosure

Disclose the following as locally processed user data:

- web history: open-tab URL and title;
- website content: selected DOM elements and local performance measurements;
- authentication information: cookie values, only on explicit use of the Cookies tool;
- user activity: tab visibility, media state, and performance events.

Certify that data is not sold, is not used for advertising or creditworthiness, is not transferred except for a user-selected filter-list request, and is not used outside the extension's single purpose.

## Required listing assets

- 128 × 128 store icon: `Extension/icons/browser-monitor-128.png`
- at least one 1280 × 800 or 640 × 400 screenshot;
- recommended screenshots: popup analytics, protection settings, page controls, appearance/Image Swap;
- publicly accessible URL hosting `docs/PrivacyPolicy.md`;
- support URL or the Chrome Web Store support hub.
