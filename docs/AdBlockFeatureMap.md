# Карта возможностей AdBlock и Browser Monitor

Актуализировано: 15 июля 2026 года. Источники — официальные страницы AdBlock Help Center и Chrome for Developers.

## Что делает AdBlock

Базовая блокировка сочетает сетевые фильтры, cosmetic-фильтры, пользовательские правила и allowlist. Сетевые запросы сопоставляются со списками до загрузки ресурса, а оставшиеся рекламные контейнеры скрываются CSS-селекторами.

Источники:

- [How does AdBlock work?](https://helpcenter.getadblock.com/adblock-help-center/how-does-adblock-work)
- [Introduction to Filter Lists](https://helpcenter.getadblock.com/adblock-help-center/introduction-to-filter-lists)
- [How to use custom filters](https://helpcenter.getadblock.com/adblock-help-center/how-to-use-custom-filters)
- [Advanced pause options](https://helpcenter.getadblock.com/adblock-help-center/advanced-pause-options)

## Premium

AdBlock указывает, что Premium добавляет Cookie Consent Cutter, Distraction Control, темы, Image Swap и доступ к отдельному приложению AdBlock VPN. Backup & Sync удалён начиная с AdBlock 6.28.0 и сейчас недоступен. Browser Monitor покрывает браузерные Premium-инструменты, но не заявляет VPN: одно Chrome-расширение не может обеспечить системное шифрование трафика, скрытие IP и защиту всего устройства.

Источники:

- [All About AdBlock Premium](https://helpcenter.getadblock.com/adblock-help-center/all-about-adblock-premium)
- [About Distraction Control](https://helpcenter.getadblock.com/adblock-help-center/about-distraction-control)
- [Block Cookie Banners](https://getadblock.com/en/premium/block-cookie-banners/)
- [About Custom Image Swap](https://helpcenter.getadblock.com/adblock-help-center/about-custom-image-swap)
- [AdBlock, AdBlock Plus, or AdBlock VPN](https://helpcenter.getadblock.com/adblock-help-center/should-i-use-adblock-adblock-plus-or-adblock-vpn)

## Сопоставление

| Возможность | Статус | Реализация Browser Monitor |
|---|---:|---|
| EasyList / EasyPrivacy | Реализовано | Отдельные переключатели, сетевые правила DNR внутри Chrome |
| RU AdList | Совместимая часть | Opt-in generic cosmetic CSS |
| Fanboy Social / Warning Removal | Совместимая часть | Отдельные opt-in CSS-наборы с предупреждением о социальных кнопках |
| Cryptomining Protection | Реализовано | 297 упакованных NoCoin DNR-правил |
| Cosmetic filtering | Реализовано | Упакованный CSS, отдельный переключатель |
| Глобальная защита и исключения | Реализовано | Popup и полноразмерная вкладка, постоянное или 10-минутное исключение |
| Ручная блокировка элемента | Реализовано | Picker по кнопке и через context menu, до 200 селекторов |
| Собственные домены | Реализовано | До 1 000 динамических DNR-правил |
| HTTPS-подписки | Безопасная совместимая часть | До двух URL; allow, redirect, scriptlet и исполняемые правила отклоняются |
| Cookie Consent Cutter | Реализовано | Скрывает поддерживаемые CMP, не принимает tracking cookies от имени пользователя |
| Distraction Control | Реализовано | Newsletter, survey, notification prompts, autoplay и floating video |
| Темы | Реализовано | System, Light, Dark, Solarized и Forest |
| Image Swap | Реализовано | Три встроенные коллекции и до девяти собственных изображений; максимум две замены |
| Backup & Sync | Локальная замена | JSON export/import; облачная функция AdBlock сейчас недоступна |
| VPN | Не реализуется расширением | Актуальная подписка AdBlock Premium включает отдельное VPN-приложение; Browser Monitor не имитирует системный VPN |
| Аналитика вкладок | Реализовано сверх AdBlock | Локальная аналитика, причины, рекомендации и Eco Mode доступны в popup и не смешиваются с настройками |
| RU / EN | Реализовано | Ручной выбор языка, адаптивный интерфейс одной вкладки |

## Архитектурный принцип

- Продукт является автономным Chrome Extension; SwiftUI, menu bar и Native Messaging отсутствуют.
- Popup содержит быстрые инструменты и аналитику. Полноразмерная вкладка содержит только настройки; её боковое меню переключает независимые панели без прокрутки между разделами.
- Сетевые фильтры работают через Declarative Net Request и не создают JavaScript-обработчик на каждый запрос.
- MutationObserver запускается только для включённых динамических функций и Image Swap и останавливается, когда больше не нужен.
- Element picker существует только между явным запуском и выбором или отменой.
- Все настройки, аналитика и история остаются в локальном профиле Chrome.
- Импорт и удалённые списки ограничены по размеру и количеству правил.
- Cookies и их значения не входят в аналитический снимок или backup настроек.

## Где паритет намеренно неполный

- Browser Monitor не выполняет удалённые scriptlet-правила и anti-circumvention код. Manifest V3 запрещает удалённый исполняемый код, а безопасный компилятор принимает только ограниченный набор сетевых и generic cosmetic-правил.
- Не реализован режим Acceptable Ads и обратный режим «разрешать рекламу везде, кроме выбранных сайтов».
- Временная пауза Browser Monitor рассчитана на 10 минут, тогда как текущий AdBlock предлагает другой срок и дополнительные варианты диапазона URL.
- Набор встроенных Image Swap коллекций меньше, хотя лимит собственных изображений доведён до девяти.
- Системный VPN невозможен в рамках одного расширения и должен оцениваться как отдельный продукт.

Поэтому корректное позиционирование для релиза: **AdBlock-style content protection plus local tab performance controls**, а не «полная копия AdBlock Free и Premium».
