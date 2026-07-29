# Product

Browser Monitor is a local-first Chrome extension for safer browsing, reducing page noise, and analyzing browser activity locally.

Current release: 1.1.2.

## Principles

- Core protection works without an account or backend.
- User data stays in the Chrome profile.
- Sensitive features require an explicit action and use optional permissions where possible.
- Protection can be reverted or disabled for a specific site.
- Local heuristics are never presented as guaranteed security checks.
- Remote executable code, advertising SDKs, and hidden analytics are prohibited.

## Boundaries

- Platform: Google Chrome 120+, Manifest V3.
- The extension is not an antivirus and cannot guarantee that a site or file is safe.
- Network rules are limited by Declarative Net Request; page controls are limited by the available DOM.
- Link Safety, search result labels, and Crypto Guard operate locally and may produce errors.
- Activity history stores domains and aggregates, not page content.
- External data is used only by explicitly enabled features such as SponsorBlock or when the user sends a feedback request.
- Feedback delivery uses a Cloudflare Worker endpoint when configured. The request includes the reply email, message, optional screenshot, and relevant diagnostics shown by the form.
- Statistics and Activity each use one reusable utility window. Settings, feedback, and receipt details reuse browser tabs, and Browser Monitor never creates a detached copy of its main popup.

Implemented capabilities are listed in [[Features]], implementation structure in [[Architecture]], and future ideas in [[Opportunities]].
