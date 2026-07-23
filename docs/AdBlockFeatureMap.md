# Карта возможностей AdBlock и Browser Monitor

Актуализировано: 22 июля 2026 года. Источники — актуальная страница AdBlock «What's new», официальный Help Center и Chrome for Developers.

## Что делает AdBlock

Базовая блокировка сочетает сетевые фильтры, cosmetic-фильтры, пользовательские правила и allowlist. Сетевые запросы сопоставляются со списками до загрузки ресурса, а оставшиеся рекламные контейнеры скрываются CSS-селекторами.

Источники:

- [How does AdBlock work?](https://helpcenter.getadblock.com/adblock-help-center/how-does-adblock-work)
- [Introduction to Filter Lists](https://helpcenter.getadblock.com/adblock-help-center/introduction-to-filter-lists)
- [How to use custom filters](https://helpcenter.getadblock.com/adblock-help-center/how-to-use-custom-filters)
- [Advanced pause options](https://helpcenter.getadblock.com/adblock-help-center/advanced-pause-options)
- [AdBlock What's new — Here's everything you get](https://getadblock.com/en/whats-new/)

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
| RU AdList | Реализовано | 1 000 сетевых DNR-правил и 692 cosmetic-правила, включены по умолчанию |
| Fanboy Social / Warning Removal | Совместимая часть | Отдельные opt-in CSS-наборы с предупреждением о социальных кнопках |
| Cryptomining Protection | Реализовано | 297 упакованных NoCoin DNR-правил |
| Cosmetic filtering | Реализовано | Упакованный CSS, отдельный переключатель |
| Глобальная защита и исключения | Реализовано | Popup и полноразмерная вкладка, постоянное или 10-минутное исключение |
| Ручная блокировка элемента | Реализовано | Picker по кнопке и через context menu, до 200 селекторов |
| Собственные домены | Реализовано | До 1 000 динамических DNR-правил |
| HTTPS-подписки | Безопасная совместимая часть | До двух URL; allow, redirect, scriptlet и исполняемые правила отклоняются |
| Cookie Consent Cutter | Реализовано | Включаемый EasyList Cookie List (15 272 cosmetic-селектора) плюс безопасные селекторы популярных CMP; ничего не принимает от имени пользователя |
| Distraction Control | Реализовано | Newsletter, survey, notification prompts, autoplay и floating video |
| Видеореклама | Усилено | Фильтры VAST/VPAID/IMA, точечные элементы YouTube/Rutube, Skip-кнопки и безопасное завершение только явно отмеченного ad-сегмента |
| Рекламные интеграции YouTube | Реализовано с внешней базой | SponsorBlock lookup по 4-символьному SHA-256 префиксу; sponsor/selfpromo сегмент пропускается при воспроизведении |
| Статистика блокировок | Реализовано | Отдельное realtime-окно: сегодня, 7 дней, типы событий, топ сайтов и ресурсов; хранение только локально |
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
- Cookie List подключается CSS-движком Chrome только по запросу пользователя; на остальных сайтах не добавляет наблюдателей.
- На YouTube и Rutube специализированная проверка работает с интервалом 1,2 секунды в видимой вкладке и 4 секунды в фоне; Rutube Shadow DOM обходится не чаще раза в 5 секунд, с лимитом 30 roots / 2 500 элементов.
- На остальных страницах MutationObserver реагирует только на добавление video/audio или точных рекламных кандидатов; произвольные DOM-изменения не запускают полный поиск.
- SponsorBlock получает только 4 символа SHA-256 от ID видео; полный ID остаётся локально и кэшируется не более чем на 12 часов.
- Статистика записывается пачкой с задержкой 250 мс, содержит только домены/категории и автоматически ограничивается семью локальными календарными днями.
- Element picker существует только между явным запуском и выбором или отменой.
- Все настройки, аналитика вкладок и статистика блокировок остаются в локальном профиле Chrome; исключение — приватный lookup SponsorBlock, описанный выше.
- Импорт и удалённые списки ограничены по размеру и количеству правил.
- Cookies и их значения не входят в аналитический снимок или backup настроек.

## Где паритет намеренно неполный

- Browser Monitor не выполняет удалённые scriptlet-правила и anti-circumvention код. Manifest V3 запрещает удалённый исполняемый код, а безопасный компилятор принимает только ограниченный набор сетевых и generic cosmetic-правил. Локальный YouTube/Rutube-слой уменьшает этот разрыв, но ни один блокировщик не может гарантировать отсутствие рекламы при каждом серверном эксперименте.
- Реклама, физически смонтированная в тот же зашифрованный видеопоток, неотличима от ролика по сетевому запросу. Она пропускается только при наличии корректной временной разметки SponsorBlock; неизвестные сегменты остаются.
- Не реализован режим Acceptable Ads и обратный режим «разрешать рекламу везде, кроме выбранных сайтов».
- Временная пауза Browser Monitor рассчитана на 10 минут, тогда как текущий AdBlock предлагает другой срок и дополнительные варианты диапазона URL.
- Набор встроенных Image Swap коллекций меньше, хотя лимит собственных изображений доведён до девяти.
- Системный VPN невозможен в рамках одного расширения и должен оцениваться как отдельный продукт.
- Защита приложений, игр, всего устройства, скрытие IP, смена страны и threat protection на сетевом уровне относятся к AdBlock VPN/DNS и не заявляются Browser Monitor.

Поэтому корректное позиционирование для релиза: **AdBlock-style content protection plus local tab performance controls**, а не «полная копия AdBlock Free и Premium».
