/* Site configuration and shared vocabulary. Edit owner/repo if you fork the project. */
(function () {
  const IGU = (window.IGU = window.IGU || {});

  IGU.config = {
    owner: 'sadiqgpasha89',
    repo: 'InterviewGearUp',
    issueLabel: 'community-question',
    cacheMinutes: 10,
    defaultProvider: 'gemini',
    defaultModel: 'gemini-2.5-flash',
    providers: {
      gemini: { name: 'Google Gemini', defaultModel: 'gemini-2.5-flash', keyHint: 'AIzaSy... (free key via aistudio.google.com)' },
      anthropic: { name: 'Anthropic Claude', defaultModel: 'claude-sonnet-5-5', keyHint: 'sk-ant-...' },
      openai: { name: 'OpenAI', defaultModel: 'gpt-4o-mini', keyHint: 'sk-...' }
    }
  };

  IGU.meta = {
    // Gears: 1 = first gear (entry level) ... 4 = top gear (lead / staff).
    levels: [
      { n: 1, name: 'Junior', years: '0 to 2 years' },
      { n: 2, name: 'Mid-level', years: '2 to 5 years' },
      { n: 3, name: 'Senior', years: '5 to 8 years' },
      { n: 4, name: 'Lead / Staff', years: '8+ years' }
    ],
    roles: [
      { id: 'general', name: 'Software engineer (core)' },
      { id: 'frontend', name: 'Frontend engineer' },
      { id: 'backend', name: 'Backend engineer' },
      { id: 'devops', name: 'DevOps / SRE / Cloud' },
      { id: 'data', name: 'Data engineer' },
      { id: 'ml', name: 'ML / AI engineer' },
      { id: 'datascience', name: 'Data scientist' },
      { id: 'qa', name: 'QA / SDET' },
      { id: 'security', name: 'Security engineer' },
      { id: 'leadership', name: 'Tech lead / Engineering manager' }
    ],
    domains: [
      'Fintech / Banking', 'E-commerce / Retail', 'Telecom / Networking', 'Healthcare',
      'SaaS / Enterprise software', 'Gaming / Media', 'AI / Data products',
      'Cloud / Infrastructure', 'Consulting / IT services', 'Other'
    ],
    rounds: [
      'Phone screen', 'Coding', 'System design', 'Technical deep dive',
      'Behavioral', 'Hiring manager', 'Take-home', 'Onsite loop'
    ]
  };

  // Join lines into one markdown string: L("para", "", "- bullet")
  IGU.L = function () { return Array.prototype.join.call(arguments, '\n'); };

  IGU.bank = IGU.bank || [];
  // Data files call IGU.add([...]) with entries: { id, role, level, topic, q, short, detail, follow, tags }
  IGU.add = function (entries) {
    entries.forEach(function (e) { IGU.bank.push(e); });
  };
  // Retire a duplicate question. The id is removed from the bank but remembered, so old links (#/q/id) and the
  // router still resolve to the surviving entry. Throws on an unknown id.
  IGU.retired = IGU.retired || {};
  IGU.retire = function (id, replacedBy) {
    const i = IGU.bank.findIndex(function (e) { return e.id === id; });
    if (i < 0) throw new Error('IGU.retire: unknown id ' + id);
    if (!IGU.bank.some(function (e) { return e.id === replacedBy; })) throw new Error('IGU.retire: unknown replacement ' + replacedBy);
    IGU.bank.splice(i, 1);
    IGU.retired[id] = replacedBy;
  };
  // Replace the answer content of existing entries by id, keeping id, role, level, topic and question
  // unless the revision supplies them. IDs never change, so saved progress and shared links keep working.
  // Throws on an unknown id so a typo cannot silently drop a revision.
  IGU.revise = function (entries) {
    entries.forEach(function (rev) {
      const i = IGU.bank.findIndex(function (e) { return e.id === rev.id; });
      if (i < 0) throw new Error('IGU.revise: unknown id ' + rev.id);
      IGU.bank[i] = Object.assign({}, IGU.bank[i], rev);
    });
  };
})();
