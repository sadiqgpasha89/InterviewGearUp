/* Site configuration and shared vocabulary. Edit owner/repo if you fork the project. */
(function () {
  const IGU = (window.IGU = window.IGU || {});

  IGU.config = {
    owner: 'sadiqgpasha89',
    repo: 'InterviewGearUp',
    issueLabel: 'community-question',
    cacheMinutes: 10,
    defaultModel: 'claude-sonnet-5-5'
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
})();
