# Manual QA checklist

Automated tests (`npm test`) cover the logic. These checks need a person and a real browser. Record the date, browser and result when you run them; nothing here has been run on real devices by the automated tooling.

## Each release
- [ ] Open the site on a phone-sized window (about 390px). No sideways scrolling on Questions, Plan, Review, Mock, Drill, Progress.
- [ ] Tab through the header, a question list, the Plan form and a Review card with the keyboard only. Focus is always visible; nothing traps focus.
- [ ] Screen reader pass (VoiceOver or NVDA) on Plan, Review and Mock results: headings, form labels, the rubric table and the live regions read sensibly.
- [ ] Light, dark and Auto themes: text stays readable on Plan, Review, Mock.
- [ ] Offline: load once, switch the network off, reload. Questions, Plan, Review and Mock still work. AI buttons show a clear error.
- [ ] After a deploy, a returning visitor gets the new version within one or two loads (service worker cache name bumped).
- [ ] Settings: save a key, then download a backup from Progress and confirm the key is not in the file.
- [ ] Import a backup made by the previous release: progress, notes and review schedule are intact.
- [ ] Coding lab on a real phone and desktop: run a passing and a failing solution, paste `while(true){}` and confirm the page stays responsive and the run stops after about 3 seconds.
- [ ] Voice practice: in Chrome and Safari, start dictation, accept and decline the microphone prompt, and confirm the cloud-speech warning appears first and typing still works after a denial. Confirm no transcript is stored unless the box is ticked.
- [ ] Company pages with a real labelled issue: apply `approved`, `needs-review` and `rejected` on a test issue and check the board and company page for each.
- [ ] Screen reader pass on Stories, Design, Coding (results and timer) and Voice.
- [ ] Open Practice and Community menus with keyboard only; Escape closes them.

## Content
- [ ] Open five random answers marked "AI-drafted" and check them against an authoritative source before changing their status to `reviewed`.
