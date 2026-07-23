# Release checklist

## Automated

- [x] Manifest V3 with production version `1.0.1`.
- [x] No remotely hosted JavaScript, `eval`, or `new Function`.
- [x] Debug-only `declarativeNetRequestFeedback` removed.
- [x] Sensitive tool permissions moved to optional runtime requests.
- [x] Store ZIP is built from an allowlist and excludes tests, fixtures, logs, `package.json`, `.DS_Store`, and the unpacked-extension public key.
- [x] Filter-list attribution is included in the package.
- [x] Privacy policy and EN/RU listing copy prepared.
- [x] `webRequest` statistics permission and SponsorBlock network lookup are disclosed in the policy and Store copy.

## Manual before submission

- [ ] Register the Chrome Web Store developer account and pay Google's one-time registration fee.
- [ ] Enable 2-Step Verification on the publisher account.
- [ ] Host `docs/PrivacyPolicy.md` at a public HTTPS URL.
- [ ] Add a support URL or configure the Store support hub.
- [ ] Capture current 1280 × 800 screenshots from version `1.0.1`.
- [ ] Load the generated ZIP unpacked and perform a final manual smoke test in a clean Chrome profile.
- [ ] Complete the privacy disclosure exactly as documented in `docs/StoreListing.md`.
- [ ] Upload `dist/browser-monitor-1.0.1.zip` with `manifest.json` at the ZIP root.
- [ ] Use staged publishing for the first release and review all Store warnings before submission.
