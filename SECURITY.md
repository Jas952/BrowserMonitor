# Security Policy

Browser Monitor is a local-first Chrome extension. It does not use a developer-operated analytics backend, account system, or remote executable code.

## Supported Versions

Security fixes are handled for the latest published GitHub release and the current `main` branch.

## Reporting a Vulnerability

Please do not open a public issue for a suspected vulnerability.

Use GitHub private vulnerability reporting when it is available for this repository. If it is not available, contact the maintainer through one of the contact links in the README and include:

- the affected Browser Monitor version or commit;
- Chrome version and operating system;
- clear reproduction steps;
- expected and actual behavior;
- any relevant screenshots or logs with personal data removed.

Reports involving extension permissions, local storage, link-safety bypasses, filter-list handling, history tools, cookie tools, download handling, or clipboard protections are in scope.

Out of scope:

- reports requiring physical access to an unlocked Chrome profile;
- social engineering against the maintainer or users;
- scanner-only reports without a practical impact explanation;
- behavior caused by manually installing a modified extension package.

The maintainer will review valid reports, avoid public disclosure until a fix or mitigation is available, and credit reporters when requested.
