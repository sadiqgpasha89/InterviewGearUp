/* Tech lead / Engineering manager. */
(function () {
  const IGU = window.IGU, L = IGU.L;
  IGU.add([
    {
      id: 'lead-1', role: 'leadership', level: 3, topic: 'People management',
      q: 'How do you handle an underperforming engineer on your team?',
      short: "Act early and specifically: gather concrete examples, discuss expectations and impact directly, agree clear goals with support and a timeline, check in often, and make a fair decision based on progress.",
      detail: L(
        "**Diagnose first**: is it skill, motivation, clarity, context (unclear expectations, wrong role, poor onboarding, personal circumstances, team problems)?",
        "",
        "#### The conversation",
        "Describe observable behaviours and their impact, not personality. Ask for their view and listen.",
        "",
        "#### The plan",
        "Measurable goals over a few weeks, concrete support (pairing, mentoring, training), regular one-to-ones, written follow-ups. Involve HR when a formal improvement plan is needed, and be transparent about consequences.",
        "",
        "#### Outcomes",
        "Improvement, a better-fitting role, or an exit handled with dignity.",
        "",
        "#### Common mistakes",
        "Waiting too long, vague feedback, surprising someone at review time, and letting teammates quietly cover for the gap, which damages the whole team.",
        "",
        "Show empathy and fairness, and keep the standard consistent."
      ),
      follow: ['What if it is a high performer with poor behaviour?', 'How do you know when to stop coaching?', 'How do you give difficult feedback?'],
      tags: ['performance', 'management', 'feedback', 'coaching', 'underperformer', 'people']
    },
    {
      id: 'lead-2', role: 'leadership', level: 3, topic: 'Prioritisation',
      q: 'How do you balance technical debt against new features?',
      short: "Treat debt as a business trade-off: quantify its cost in delivery speed, incidents and risk, reserve steady capacity for it, and tie the biggest items to roadmap goals so stakeholders see the payoff.",
      detail: L(
        "**Classify**: deliberate versus accidental; debt that slows daily work versus debt that creates risk (security, scale).",
        "",
        "**Make it visible**: keep a backlog with estimated cost (hours lost per week, incident count, onboarding time).",
        "",
        "#### Ways to fund it",
        "1. A default share of capacity each sprint (for example 15 to 25%).",
        "2. Leave code better than you found it while working on features.",
        "3. Include debt that blocks a feature inside that feature's estimate.",
        "4. Dedicated time for large items with explicit outcomes. Avoid open-ended rewrites.",
        "",
        "#### Communicating",
        "Use the stakeholder's language: 'This change cuts deploys from 2 hours to 15 minutes, which gives us roughly one extra release a week.' Back it with data: DORA metrics, postmortems, cycle time.",
        "",
        "Prioritise by interest rate: what hurts most and compounds. Say no to refactoring that is only about taste."
      ),
      follow: ['How do you convince a non-technical product manager?', 'When is a rewrite justified?', 'How do you measure technical debt?'],
      tags: ['tech debt', 'prioritization', 'roadmap', 'stakeholders', 'planning']
    },
    {
      id: 'lead-3', role: 'leadership', level: 3, topic: 'Planning',
      q: 'Your manager sets a deadline you think is unrealistic. What do you do?',
      short: "Break the work down, estimate with ranges and risks, show the trade-off between scope, time and quality, and offer options such as phased delivery or reduced scope instead of a plain yes or no.",
      detail: L(
        "1. **Understand the date**: is it tied to a market event or contract, and what is truly fixed?",
        "2. **Decompose and estimate** with best, likely and worst cases. Surface unknowns and dependencies, and run a short spike on the riskiest part.",
        "3. **Present options**:",
        "   - Full scope at a later date.",
        "   - Reduced scope (an MVP with an explicit cut list) on the requested date.",
        "   - Adding people, with a warning about ramp-up cost (Brooks's law: adding people to a late project makes it later).",
        "   - Cutting quality, only with explicit acknowledgement of risk, and rarely recommended.",
        "4. **Agree the decision in writing**, track progress with a burn-up chart, and raise risks early.",
        "5. If you are told to commit anyway, do so transparently, protect the team from burnout, and make any shortcuts visible as debt.",
        "",
        "Trust comes from being accurate over time, not from always saying yes."
      ),
      follow: ['What if your manager insists on the original date?', 'How do you estimate unfamiliar work?', 'What is Brooks\'s law?'],
      tags: ['estimation', 'deadline', 'planning', 'stakeholders', 'negotiation', 'scope']
    },
    {
      id: 'lead-4', role: 'leadership', level: 4, topic: 'Technical strategy',
      q: 'How do you set technical direction across multiple teams?',
      short: "Set direction through shared principles and written proposals: clarify the problem and constraints, run an RFC process for input from affected teams, decide with a named owner, record the decision, and align roadmap and funding behind it.",
      detail: L(
        "**Start from the business**: which technical capabilities will the company need in two to three years? Assess the current state with real data (pain points, DORA metrics).",
        "",
        "#### Mechanisms",
        "- A short technical vision with guardrails (approved languages, paved roads) rather than dictating each choice.",
        "- An **RFC process**: the author states the problem, options with trade-offs, a recommendation and a migration plan; a time-boxed review (one to two weeks) by affected teams; an accountable owner decides ('disagree and commit'); the outcome is recorded as an architecture decision record.",
        "- **Influence without authority**: build relationships, pilot with a willing team, show data, make adoption easy with tooling.",
        "",
        "#### Stay grounded",
        "Remain close to the code through reviews and incidents, give decisions a review date, measure adoption and outcomes, and handle dissent respectfully."
      ),
      follow: ['How do you handle a team that ignores the standard?', 'RFC versus ADR: what is the difference?', 'How do you choose between two good options?'],
      tags: ['technical strategy', 'rfc', 'adr', 'architecture', 'influence', 'staff engineer']
    },
    {
      id: 'lead-5', role: 'leadership', level: 4, topic: 'Delivery',
      q: 'Tell me about a time your team missed a deadline.',
      short: "Own it, communicate early and plainly, reset expectations with a credible plan, then run a blameless review that fixes the system causes: estimation, scope change, dependencies or visibility.",
      detail: L(
        "Use the STAR structure, but spend most of the time on leadership.",
        "",
        "#### What to cover",
        "- **When you first saw the risk** and what you did about it. If you raised it late, say so and what you learned.",
        "- **Actions**: re-planned with the team, cut scope with product, renegotiated the date with data, protected the team from heroics and crunch, shipped the smallest valuable slice first.",
        "- **Root causes**: optimistic estimates, hidden dependencies, scope creep, unclear ownership, tech debt, understaffing.",
        "- **Changes you made**: risk review at kickoff, milestone checkpoints, buffers, earlier integration, weekly stakeholder updates, a clear definition of done.",
        "- **Result**: for example, the next three projects landed within an agreed margin.",
        "",
        "#### Avoid",
        "Blaming other teams or the product manager, claiming you made no mistakes, and ending without a systemic fix."
      ),
      follow: ['When did you first know it would slip?', 'How did you rebuild stakeholder trust?', 'What would you have cut?'],
      tags: ['behavioral', 'deadline', 'delivery', 'ownership', 'retrospective', 'leadership']
    },
    {
      id: 'lead-6', role: 'leadership', level: 4, topic: 'Hiring',
      q: 'How do you build an interview process and keep the hiring bar high?',
      short: "Define what great looks like for the role, design structured interviews that each test specific competencies against consistent rubrics, train and calibrate interviewers, and keep the bar the same regardless of hiring pressure.",
      detail: L(
        "1. **Scorecard**: outcomes, skills and behaviours expected at the level.",
        "2. **Loop design**: coding or problem solving, system design at the right level, debugging or code review, collaboration and behavioural, hiring manager. Avoid redundant rounds; give each interviewer clear competencies to assess.",
        "3. **Rubrics** with behavioural anchors per level, structured questions, and work samples rather than trick puzzles.",
        "4. **Independent feedback**: interviewers write evidence-based notes before seeing others' opinions, which prevents anchoring.",
        "5. **Reduce bias**: consistent questions, diverse panels, evidence over gut feeling.",
        "6. **Calibration**: shadowing and reverse shadowing, regular review of hire decisions against on-the-job performance, tracking pass rates by interviewer, and a bar-raiser or hiring committee.",
        "7. **Candidate experience**: clear timelines, respectful communication, useful feedback.",
        "",
        "Metrics: time to hire, offer acceptance, 90-day ramp-up, regretted attrition, and quality of hire. When roles are urgent, hold the bar and widen the sourcing instead."
      ),
      follow: ['How do you handle a split debrief?', 'How do you test for seniority?', 'How do you keep the bar when under pressure to fill roles?'],
      tags: ['hiring', 'interview process', 'rubric', 'calibration', 'recruiting', 'management']
    }
  ]);
})();
