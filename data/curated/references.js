/* Authoritative references for high-value questions (Phase 1, content trust).
   Only primary sources: specifications, RFCs, official project documentation, OWASP cheat sheets and the original papers.
   This file adds the `references` field and changes nothing else, so review status, answers and ids stay as they are.
   Links were chosen by an AI assistant and were spot-checked when this file was written (November 2026), not all of them;
   maintainers check every link with `npm run refs:check`. */
(function () {
  const IGU = window.IGU;
  const R = {
    closures: { title: 'MDN: Closures', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures' },
    eventLoop: { title: 'HTML Standard: event loops', url: 'https://html.spec.whatwg.org/multipage/webappapis.html#event-loops' },
    promise: { title: 'MDN: Promise', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise' },
    probes: { title: 'Kubernetes: liveness, readiness and startup probes', url: 'https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/' },
    deployment: { title: 'Kubernetes: Deployments', url: 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/' },
    mvcc: { title: 'PostgreSQL: concurrency control (MVCC)', url: 'https://www.postgresql.org/docs/current/mvcc.html' },
    vacuum: { title: 'PostgreSQL: routine vacuuming', url: 'https://www.postgresql.org/docs/current/routine-vacuuming.html' },
    wal: { title: 'PostgreSQL: write-ahead logging', url: 'https://www.postgresql.org/docs/current/wal-intro.html' },
    iso: { title: 'PostgreSQL: transaction isolation', url: 'https://www.postgresql.org/docs/current/transaction-iso.html' },
    http: { title: 'RFC 9110: HTTP semantics', url: 'https://www.rfc-editor.org/rfc/rfc9110' },
    oauth: { title: 'RFC 6749: OAuth 2.0', url: 'https://www.rfc-editor.org/rfc/rfc6749' },
    pkce: { title: 'RFC 7636: PKCE', url: 'https://www.rfc-editor.org/rfc/rfc7636' },
    jwt: { title: 'RFC 7519: JSON Web Token', url: 'https://www.rfc-editor.org/rfc/rfc7519' },
    tls: { title: 'RFC 8446: TLS 1.3', url: 'https://www.rfc-editor.org/rfc/rfc8446' },
    hsts: { title: 'RFC 6797: HTTP Strict Transport Security', url: 'https://www.rfc-editor.org/rfc/rfc6797' },
    csp: { title: 'W3C: Content Security Policy Level 3', url: 'https://www.w3.org/TR/CSP3/' },
    sqli: { title: 'OWASP: SQL injection prevention cheat sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html' },
    xss: { title: 'OWASP: XSS prevention cheat sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html' },
    csrf: { title: 'OWASP: CSRF prevention cheat sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html' },
    top10: { title: 'OWASP Top 10', url: 'https://owasp.org/Top10/' },
    wcag: { title: 'W3C: WCAG 2.1', url: 'https://www.w3.org/TR/WCAG21/' },
    aria: { title: 'W3C: WAI-ARIA 1.2', url: 'https://www.w3.org/TR/wai-aria-1.2/' },
    vitals: { title: 'web.dev: Web Vitals', url: 'https://web.dev/articles/vitals' },
    kafkaDesign: { title: 'Apache Kafka 4.2 docs: design (delivery semantics, log compaction)', url: 'https://kafka.apache.org/42/design/design/' },
    tfState: { title: 'Terraform: state', url: 'https://developer.hashicorp.com/terraform/language/state' },
    attention: { title: 'Vaswani et al., Attention Is All You Need (2017)', url: 'https://arxiv.org/abs/1706.03762' },
    pvalue: { title: 'ASA statement on p-values (Wasserstein and Lazar, 2016)', url: 'https://doi.org/10.1080/00031305.2016.1154108' },
    postmortem: { title: 'Google SRE book: postmortem culture', url: 'https://sre.google/sre-book/postmortem-culture/' },
    pact: { title: 'Pact documentation', url: 'https://docs.pact.io/' },
    pwWait: { title: 'Playwright: auto-waiting (actionability)', url: 'https://playwright.dev/docs/actionability' }
  };

  const MAP = {
    'fe-1': ['closures'], 'fe-13': ['closures'],
    'fe-3': ['eventLoop', 'promise'], 'fe-16': ['eventLoop'], 'fe-17': ['promise'],
    'be-70': ['probes'], 'do-3': ['deployment', 'probes'], 'do-31': ['probes'],
    'be-20': ['mvcc', 'vacuum'], 'be-21': ['wal'], 'be-3': ['iso', 'mvcc'],
    'be-1': ['http'],
    'be-60': ['oauth', 'pkce'], 'sec-4': ['oauth', 'pkce'], 'be-59': ['jwt'],
    'sec-3': ['tls'], 'sec-65': ['hsts'],
    'fe-48': ['csp'], 'sec-63': ['csp'],
    'be-65': ['sqli'], 'sec-9': ['sqli'], 'sec-2': ['sqli', 'xss'],
    'fe-47': ['xss'], 'fe-7': ['xss', 'csrf'], 'fe-49': ['csrf'], 'sec-11': ['csrf'],
    'sec-8': ['top10'],
    'fe-57': ['wcag'], 'fe-58': ['aria'], 'fe-40': ['vitals'],
    'be-33': ['kafkaDesign'], 'be-34': ['kafkaDesign'],
    'do-5': ['tfState'],
    'ml-35': ['attention'], 'ml-36': ['attention'], 'ml-37': ['attention'],
    'ds-4': ['pvalue'],
    'do-60': ['postmortem'], 'lead-32': ['postmortem'],
    'qa-28': ['pact'], 'qa-24': ['pwWait']
  };

  IGU.referenceMap = MAP;
  IGU.revise(Object.keys(MAP).map(function (id) {
    return { id: id, references: MAP[id].map(function (k) { return { title: R[k].title, url: R[k].url }; }) };
  }));
})();
