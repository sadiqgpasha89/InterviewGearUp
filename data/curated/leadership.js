/* Tech lead / Engineering manager: curated answers. AI-drafted, not yet reviewed by a person (see CONTRIBUTING.md).
   The Gear 1 entries are the early-career fundamentals that leadership interviews start from: feedback, collaboration,
   prioritisation and ownership. Candidates must answer them with their own real experience. */
(function () {
  const IGU = window.IGU, L = IGU.L;
  const meta = function (difficulty) { return { difficulty: difficulty, reviewStatus: 'ai-drafted', contentVersion: 1 }; };

  IGU.revise([
    Object.assign(meta('hard'), {
      id: "lead-38",
      short: "Team Topologies defines four team types: stream-aligned teams deliver a flow of work for a business area; enabling teams help others adopt new skills; complicated-subsystem teams own parts needing deep specialist knowledge; and platform teams provide internal services that reduce others' cognitive load. Three interaction modes (collaboration, X-as-a-service, facilitating) describe how teams work together.",
      detail: L(
        "#### The four types",
        "- **Stream-aligned**: the main type, aligned to a flow of business value (a product, user journey or service). It should be able to deliver end to end with minimal hand-offs.",
        "- **Enabling**: specialists (security, testing, SRE practice) who coach stream-aligned teams for a time and then move on, instead of becoming a gate.",
        "- **Complicated-subsystem**: owns a component that needs rare expertise (a video codec, a pricing engine, an ML model) so that others do not have to.",
        "- **Platform**: provides self-service capabilities (deployment, observability, data) as a product, with an internal-customer mindset.",
        "",
        "#### Interaction modes",
        "- **Collaboration**: working closely together for a limited time to discover something new.",
        "- **X-as-a-Service**: one team consumes another's output through clear interfaces.",
        "- **Facilitating**: one team helps another learn or get unblocked.",
        "",
        "#### Why it matters",
        "It frames team design around **cognitive load** and fast flow, and builds on Conway's Law: team structure shapes architecture. To use it, map the current teams, find where hand-offs and tickets slow delivery, and change one boundary at a time. Beware of relabeling teams without changing how they work, and of platform teams that dictate instead of serving."
      ),
      follow: ["How would you know a platform team has become a bottleneck?", "How do you decide the boundary of a stream-aligned team?"],
      tags: ["team topologies", "org design", "platform team", "cognitive load", "conway's law"]
    }),
    Object.assign(meta('hard'), {
      id: "lead-39",
      short: "Conway's Law says organizations design systems that mirror their own communication structure. The Inverse Conway Maneuver deliberately shapes team structure and ownership first to get the architecture you want, for example by creating small autonomous teams that each own a loosely coupled service.",
      detail: L(
        "**What it means in practice**: boundaries between teams become boundaries between modules and services, because change across teams needs meetings, tickets and agreement. A system split along the wrong lines, for example by technical layer (front end, back end, database), forces most features to involve all three teams and produces hand-offs and a distributed monolith.",
        "",
        "#### The Inverse Conway Maneuver",
        "1. Decide the target architecture and domain boundaries (the bounded contexts of domain-driven design help).",
        "2. Reorganize teams so each owns one boundary end to end, including operations, with a clear API to the others.",
        "3. Let the architecture evolve to match, and review it as the organization changes.",
        "",
        "#### Cautions",
        "- Reorganizations are expensive and disruptive; make the case with data such as lead time, the number of teams touched per change and incident ownership.",
        "- Changing the org chart alone does not change communication habits or tooling; you also need clear ownership, interfaces and incentives.",
        "- Too many tiny teams create coordination overhead and a distributed system you may not need.",
        "",
        "A good interview answer pairs the principle with an example from your own experience: a service boundary that matched or fought the team structure, and what you changed."
      ),
      follow: ["How would you use Conway's Law when planning a migration from a monolith?", "What signals tell you that your team boundaries do not match your architecture?"],
      tags: ["conway's law", "architecture", "org design", "team structure", "domain-driven design"]
    }),
    Object.assign(meta('easy'), {
      id: "lead-7",
      short: "A 1-on-1 is the report's meeting, not a status update. Hold it weekly or every two weeks at a fixed time, keep a shared agenda the engineer controls, spend most of the time on their blockers, growth and feedback in both directions, and follow through on what you promise.",
      detail: L(
        "#### Structure",
        "- **Cadence**: weekly for new joiners and people in transition, every two weeks for steady-state seniors. 30 minutes is enough for most; 45 to 60 for career conversations.",
        "- **Shared agenda doc**: the engineer adds topics first. Yours go second, so the meeting does not become a one-way download.",
        "- **A rough flow**: check in as a person, their topics, blockers you can remove, feedback (both ways), then career and growth. Rotate a deeper career or feedback conversation in every few weeks so it does not get squeezed out.",
        "",
        "#### Useful questions",
        "- What is slowing you down this week?",
        "- What is a decision you would like to make differently, or want help with?",
        "- What feedback do you have for me or for the team?",
        "- What work would you like more of, or less of?",
        "",
        "#### Habits that make it work",
        "- Reschedule rather than cancel. Repeated cancellations tell the person they are low priority.",
        "- Take short notes and open the next meeting with the open items, so promises are visible.",
        "- Listen more than you talk. Aim for the engineer speaking most of the time.",
        "- Keep status out of it: read the tracker, standup or PRs instead.",
        "",
        "#### Common failure modes",
        "Turning it into a status meeting, using it only to deliver bad news, never getting to growth topics, or treating a quiet 1-on-1 as proof that nothing is wrong. Silence often means the person does not feel safe or has not been asked a good question yet."
      ),
      follow: ["An engineer says they have nothing to talk about every week. What do you do?", "How do you adapt 1-on-1s for a fully remote team across time zones?", "How is a skip-level 1-on-1 different?"],
      tags: ["1-on-1", "management", "feedback", "coaching", "leadership"]
    }),
    Object.assign(meta('medium'), {
      id: "lead-8",
      short: "A career ladder defines levels and the observable behaviours expected at each, across a few dimensions such as technical craft, scope, execution and collaboration. Publish it, base promotions on sustained performance at the next level, and calibrate across managers so it is applied fairly.",
      detail: L(
        "#### Building blocks",
        "- **Levels and tracks**: for example Engineer I to Principal on an individual-contributor track, with a separate management track. Make clear that management is a different job, not a promotion above Staff.",
        "- **Dimensions**: technical skill, scope and impact, execution, communication and collaboration, leadership and mentoring. Each level describes behaviours you can observe, with examples, not adjectives like 'strong'.",
        "- **Scope grows with level**: a task, then a feature, then a project, then work that spans teams, then direction for an organisation.",
        "",
        "#### Making progression transparent",
        "- Publish the ladder and the promotion process: who decides, what evidence is needed, how often cycles run.",
        "- Promote for **sustained performance at the next level**, not for potential or tenure. Managers collect written evidence (impact, scope, peer feedback) into a promotion packet.",
        "- **Calibrate** across managers in a committee so the same evidence gets the same outcome on different teams.",
        "- Give each person a short gap analysis in 1-on-1s: where you are, what is missing for the next level, what work would show it.",
        "",
        "#### How to start",
        "Draft with a few senior engineers, test it against real people you know well to see whether it matches your intuition, and revise. Review it yearly. Keep it short; a ladder nobody can remember is not used.",
        "",
        "#### Pitfalls",
        "Turning it into a checklist that people game, tying levels too tightly to pay bands before you have calibration, and inflating levels to retain people, which makes every later promotion harder to explain."
      ),
      follow: ["How do you handle an engineer who believes they deserve a promotion you disagree with?", "How do you define a Staff-level role so it is not just 'a senior who has been around longer'?", "How do you keep promotions fair across teams with different kinds of work?"],
      tags: ["career ladder", "promotion", "levels", "calibration", "leadership"]
    }),
    Object.assign(meta('medium'), {
      id: "lead-16",
      short: "A 30-60-90 plan sets clear goals per phase: learn and ship something small in the first month, contribute independently in the second, own a piece of work in the third. Prepare access and a buddy before day one, and check progress against agreed outcomes at each milestone.",
      detail: L(
        "#### Before day one",
        "Laptop and accounts ready, a named onboarding buddy (not the manager), a first-week schedule, and a short list of docs to read. Most slow starts come from waiting for access.",
        "",
        "#### Days 1 to 30: learn",
        "- Set up the environment and ship a **small real change in the first week** (a bug fix or docs fix) to learn the deploy path.",
        "- Meet the team and the main partners (product, design, support). Read the architecture overview and recent design docs.",
        "- Success looks like: can build, test and deploy; knows who owns what; has asked many questions.",
        "",
        "#### Days 31 to 60: contribute",
        "- Own a small feature or a cluster of bugs end to end, with code review as the learning loop.",
        "- Shadow on-call and attend incident reviews.",
        "- Success looks like: delivers a scoped task with light guidance.",
        "",
        "#### Days 61 to 90: own",
        "- Lead a medium-sized piece of work including design notes and communication to stakeholders.",
        "- Join the on-call rotation if the team has one, with a safety net.",
        "- Success looks like: works independently on normal tasks and can explain why decisions were made.",
        "",
        "#### Keeping it honest",
        "Agree the outcomes with the new hire in week one and review them in 1-on-1s at each milestone. Ask for feedback on onboarding itself and fix the gaps (an outdated README is a good first-month task for the new person). Adjust the targets for seniority: a senior should be shaping decisions by day 90, a junior should be reliably delivering small tasks."
      ),
      follow: ["How do you onboard someone remotely so they do not feel isolated?", "What do you do when someone is clearly behind the plan at day 45?", "How would the plan differ for a staff engineer?"],
      tags: ["onboarding", "30-60-90", "new hire", "management", "leadership"]
    }),
    Object.assign(meta('medium'), {
      id: "lead-49",
      short: "Run retros on a steady structure: set the stage, look at data, generate insights, pick one to three actions, and close. Make actions specific with an owner, a date and a measure, review them at the start of the next retro, and keep the room blameless.",
      detail: L(
        "#### A simple structure (about 60 minutes)",
        "1. **Set the stage** (5 min): state the goal and the blameless ground rule: people did the best they could with what they knew.",
        "2. **Gather data** (15 min): a timeline, sprint metrics, incidents, escaped bugs. Facts first, opinions second.",
        "3. **Generate insights** (15 min): a format such as Start/Stop/Continue, 4Ls or Sailboat. Rotate formats so it does not go stale. Group similar notes.",
        "4. **Decide** (15 min): dot-vote, then pick **one to three** things. More than that and none get done.",
        "5. **Close** (5 min): confirm owners and dates, ask how the retro itself went.",
        "",
        "#### Turning talk into measurable actions",
        "Weak: 'improve code review'. Better: 'Add a daily 15-minute review slot. Owner: Priya. Measure: median time to first review goes from about 2 days to under 1 day by the end of next sprint.' An action should name an owner, a date, and how you will know it worked.",
        "",
        "#### What keeps retros useful",
        "- Start the next retro by reviewing the last actions. Unreviewed actions teach the team that retros do not matter.",
        "- Separate what the team can change from what needs escalation; take the second kind to the right person with a clear ask.",
        "- Use anonymous input (a shared board) if trust is low, and make safety explicit: no blaming individuals.",
        "- Rotate the facilitator, and use an outsider occasionally if the team is stuck.",
        "- If the same complaint returns three times, treat it as a problem to solve, not a topic to discuss."
      ),
      follow: ["The team stops engaging in retros. What do you try?", "How do you run a retro after a serious production incident?", "How do you handle a retro where one person dominates?"],
      tags: ["retrospective", "agile", "continuous improvement", "facilitation", "team"]
    })
  ]);

  IGU.add([
    Object.assign(meta('easy'), {
      id: "lead-101", role: "leadership", level: 1, topic: "Behavioral",
      q: "Tell me about a time you received critical feedback. What did you do with it?",
      short: "Pick a real example where the feedback was specific and you changed something. Describe what was said, your first reaction honestly, what you asked to understand it, the concrete change you made and the result. Interviewers look for openness and follow-through, not for a story where you were never wrong.",
      detail: L(
        "#### Structure (STAR)",
        "- **Situation and Task**: one or two sentences on the project and the feedback, for example a code review noting that your pull requests were too large to review.",
        "- **Action**: what you did. Ask clarifying questions, thank the person, agree on a change and apply it: for example, you now split work into pull requests under about 300 lines and describe the intent in the description.",
        "- **Result**: an observable outcome such as faster reviews, fewer bugs, or the reviewer later noticing the improvement. Mention what you learned.",
        "",
        "#### What interviewers listen for",
        "- You can hear criticism without getting defensive and can separate the person from the message.",
        "- You check your understanding and follow up later to see whether the change worked.",
        "",
        "#### Pitfalls",
        "- Choosing a fake weakness ('I work too hard').",
        "- Blaming the person who gave the feedback.",
        "- Stopping at 'I listened' without a change and a result.",
        "",
        "Use your own real experience. If you have little work experience, a university project, internship or open-source review counts."
      ),
      follow: ["What would you do if you disagreed with the feedback?", "How do you ask for feedback proactively?"],
      tags: ["behavioral", "feedback", "growth", "star"]
    }),
    Object.assign(meta('easy'), {
      id: "lead-102", role: "leadership", level: 1, topic: "Behavioral",
      q: "How do you handle a disagreement with a teammate during a code review?",
      short: "Focus on the code and the shared goal, not the person. Ask questions to understand their reasoning, explain yours with evidence (a test, a benchmark, a standard), and look for the smallest change both can accept. If you still disagree, agree on a tie-breaker such as the team's style guide or a third opinion, and move on without resentment.",
      detail: L(
        "#### A good approach",
        "1. **Assume good intent** and ask, for example, 'What problem were you solving with this?' You may be missing context.",
        "2. **Discuss in the right place**: a comment thread for small things, and a short call for anything that has gone back and forth more than twice. Write down the outcome.",
        "3. **Use evidence**: team conventions, a failing test, a measurement or documentation beat opinions.",
        "4. **Separate must-fix from preference**: label comments (for example 'nit:' for style) so the author knows what blocks the merge.",
        "5. **Decide and commit**: if it is a matter of taste, defer to the author or the style guide; if it is a risk (security, correctness), escalate to a more senior reviewer calmly.",
        "",
        "#### Example outline",
        "Tell a short story: the disagreement, how you found out why the other person chose their approach, what you proposed, what you agreed and the result for the team, such as a shared guideline in the contributing doc.",
        "",
        "Avoid stories where you simply won, or gave in without discussing. Interviewers want to see collaboration and judgement."
      ),
      follow: ["When is it right to escalate a disagreement?", "How do you give a review comment that does not sound like criticism of the person?"],
      tags: ["behavioral", "code review", "conflict", "collaboration"]
    }),
    Object.assign(meta('easy'), {
      id: "lead-103", role: "leadership", level: 1, topic: "Behavioral",
      q: "Tell me about a time you helped a teammate who was struggling.",
      short: "Choose a real situation where you noticed someone was stuck and helped without taking over: you checked in privately, asked what was blocking them, offered a specific kind of help (pairing, a walkthrough, a smaller first step) and followed up. Describe the effect on the teammate and the team, and what you learned about supporting others.",
      detail: L(
        "#### What a strong answer includes",
        "- **How you noticed**: a missed standup update, a pull request stuck for days, or a quiet teammate in a new codebase.",
        "- **How you approached it**: privately and respectfully, with curiosity ('How is the task going? What would help?'), not 'let me do it for you'.",
        "- **The help**: an hour of pair programming, drawing the architecture, breaking the task into smaller steps, or pointing to the right documentation, while being clear about what you will and will not do so that your own work does not suffer.",
        "- **The outcome**: the teammate delivered, gained confidence, and perhaps wrote the documentation that now helps others.",
        "",
        "#### Signals interviewers look for",
        "Empathy, initiative, teaching rather than fixing, and a sense of when to involve the lead, for example if the real issue is workload or unclear requirements.",
        "",
        "#### Pitfalls",
        "- Making yourself the hero and the teammate the problem.",
        "- Taking the task over, which does not build their skills.",
        "- Giving no result."
      ),
      follow: ["How do you balance helping others with your own deadlines?", "What would you do if the person kept struggling after several attempts to help?"],
      tags: ["behavioral", "teamwork", "mentoring", "empathy"]
    }),
    Object.assign(meta('easy'), {
      id: "lead-104", role: "leadership", level: 1, topic: "Prioritisation",
      q: "How do you prioritize when you have several tasks due at the same time?",
      short: "List everything, then rank by impact, urgency and effort, and check dependencies, since some tasks block other people. Confirm priorities with whoever assigned the work instead of guessing, communicate early about what will slip, and protect time for the highest-value item. Re-plan when things change.",
      detail: L(
        "#### A simple method",
        "1. **Write it down** with a deadline and the person waiting on each item.",
        "2. **Rank**: what is truly urgent (a production issue, a hard external deadline), what blocks others, what has the highest impact, and what is quick to finish.",
        "3. **Ask**: 'If I can only finish two of these this week, which two?' Your manager or the product owner often knows context you do not.",
        "4. **Communicate trade-offs early**: 'If I do A, B will be a day late. Is that acceptable?' Surprises are worse than delays.",
        "5. **Time-box and deliver in slices**: ship a smaller version of the lower-priority item rather than nothing.",
        "",
        "#### Use a real example",
        "Describe a situation: three requests landed in the same sprint, you listed them, checked with your lead, handled the production bug first, agreed to move one request and delivered the rest. State the outcome.",
        "",
        "#### What interviewers look for",
        "Judgement, communication and honesty about limits. Saying 'I work late until everything is done' signals poor sustainability rather than strong prioritization."
      ),
      follow: ["What do you do when two stakeholders each say their request is the top priority?", "How do you handle an urgent request that interrupts planned work?"],
      tags: ["prioritization", "time management", "communication", "behavioral"]
    }),
    Object.assign(meta('easy'), {
      id: "lead-105", role: "leadership", level: 1, topic: "Behavioral",
      q: "Tell me about a mistake you made at work and how you handled it.",
      short: "Pick a real mistake with real consequences that you owned. Explain what happened, how you found out, how you told the right people straight away, how you fixed or contained it, and what you changed so it would not happen again. Interviewers value honesty, ownership and learning over a spotless record.",
      detail: L(
        "#### Structure",
        "- **Situation**: briefly, what you were working on and the stakes.",
        "- **The mistake**: say it plainly, in the first person ('I deployed without running the migration check'), without excuses.",
        "- **Action**: you raised it immediately, helped mitigate (a rollback, a fix, notifying affected users) and wrote or joined a blameless post-mortem.",
        "- **Result and learning**: a process change such as a checklist, an automated check or an alert, and evidence that it worked, for example the next release went smoothly.",
        "",
        "#### Choose well",
        "Pick a meaningful but recoverable mistake. A trivial one sounds evasive, and a reckless or unethical one raises doubts. Avoid anything that blames a teammate.",
        "",
        "#### What interviewers listen for",
        "Accountability, speed of escalation, calm under pressure, and whether you improve the system rather than only promising to be more careful."
      ),
      follow: ["How soon after noticing did you tell your manager, and why?", "What process change would you suggest to prevent it?"],
      tags: ["behavioral", "ownership", "mistakes", "post-mortem"]
    }),
    Object.assign(meta('easy'), {
      id: "lead-106", role: "leadership", level: 1, topic: "Communication",
      q: "How do you decide when to ask for help instead of continuing on your own?",
      short: "Set a time-box based on the task's size, try to solve it yourself first, and gather what you tried so you can ask a precise question. Ask once you hit the time limit, are blocked on something only someone else can unblock, or the risk of going the wrong way is high. Asking early and well is good judgement, not weakness.",
      detail: L(
        "#### A practical rule",
        "Try for a bounded period (for example 30 to 60 minutes for a bug, a little longer in a new area), noting what you have tried. After that, the cost of staying stuck exceeds the cost of interrupting someone.",
        "",
        "#### Ask good questions",
        "- State the goal and the problem in a sentence or two.",
        "- Say what you tried and what you saw (an error message, logs, a minimal example).",
        "- Say what you think the cause could be and what you specifically need.",
        "This respects the other person's time and often leads you to the answer while you are writing it.",
        "",
        "#### Choose the right channel",
        "Use a team chat channel for questions others will benefit from, a direct message or call for something sensitive or urgent, and the documentation or search first for common issues. Write down the answer afterwards so the next person does not have to ask.",
        "",
        "#### When to ask sooner",
        "Security-sensitive actions, production changes, unclear requirements and anything where a wrong assumption wastes days. Interviewers want self-reliance *and* openness, so describe a real example where asking saved time."
      ),
      follow: ["How do you avoid interrupting senior colleagues too often?", "How do you handle a teammate who is unavailable when you are blocked?"],
      tags: ["communication", "asking for help", "self-management", "behavioral"]
    })
  ]);
})();
