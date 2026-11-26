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
- [ ] Open Prepare, Practice and Community menus with keyboard only; Escape closes them.
- [ ] Home (v1.5): in a fresh browser profile the onboarding appears; complete it in under a minute with keyboard only (gear choices are radio buttons). Skip for now leads to a dashboard with a "Set up in 30 seconds" card. Reset profile brings the onboarding back without losing progress.
- [ ] Home on a phone at 320, 360, 390 and 430 px: no sideways scrolling; the Next up card and its Continue button are visible without scrolling far.
- [ ] Home with a screen reader: each dashboard card is announced as a labelled region; the gear progress bar has a text label.
- [ ] Mock (v1.6): open "How answers are assessed" before starting; after a round each answer shows Content and Delivery rows with evidence and at most three next steps; a deliberately unrelated answer is labelled Off topic.
- [ ] Plan (v1.6): set a rest day and workload limits in Edit plan; Swap and Tomorrow work on tasks; the This week section reads sensibly with a screen reader.
- [ ] JD analyzer and Readiness (v1.7): paste a posting, check named and inferred skills show their phrases, choose "Use as my target job", then open Prepare > Readiness: statuses have evidence, Not assessed is shown with no data, Reset readiness assessment and Use all evidence again work.
- [ ] Coding and design (v1.8): on a phone, type in the coding editor without the page zooming; run a wrong coin-change solution and read the first-failure summary; in a design problem, change the calculator, answer a failure scenario, check the SVG preview and the print view.
- [ ] Answer marked Needs correction (set one temporarily in a data file): the warning appears above the answer in the app and on its static page.
- [ ] Search & SEO (v1.13–v1.14): search abbreviations (`k8s`, `authn`), check typo suggestions, verify `q/role-backend.html` links back into Drill/App, and open offline/update banners without errors.
- [ ] Flashcards, Topic Map, Warm-up & Calendar Export (v1.16–v1.19): create flashcards from `#/flashcards` and confirm SRS intervals update; navigate prerequisites on `#/map`; complete a 3-question timed `#/warmup`; download today and week `.ics` files from `#/plan` and verify import in Apple/Google/Outlook calendar with local times and without private notes unless ticked.
- [ ] Guide & Opt-in Feedback (v1.20): open Community > Guide & feedback (`#/guide`), verify walkthrough links, test loading a sample scenario, and generate an opt-in feedback Markdown export confirming no network tracking calls occur.

## Content
- [ ] Open five random answers marked "AI-drafted" and check them against an authoritative source before changing their status to `reviewed`.
