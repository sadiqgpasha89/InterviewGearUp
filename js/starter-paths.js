/* Starter learning paths. They only list existing question ids, in a sensible order. They are AI-assembled and have not been
   reviewed by a person; the site labels them that way. Learners copy one into their own paths to edit it. */
(function () {
  const IGU = (window.IGU = window.IGU || {});
  IGU.starterPaths = [
    { id: 'starter-backend-2', title: 'Backend, mid-level core', note: 'Databases, caching, APIs and security basics that mid-level backend interviews return to.',
      ids: ['be-3', 'be-13', 'be-15', 'be-22', 'be-4', 'be-26', 'be-27', 'be-10', 'be-87', 'be-62', 'be-5', 'be-59', 'be-64'] },
    { id: 'starter-frontend-2', title: 'Frontend, mid-level core', note: 'JavaScript runtime, React rendering, the DOM, CSS and browser security.',
      ids: ['fe-3', 'fe-13', 'fe-15', 'fe-17', 'fe-4', 'fe-5', 'fe-30', 'fe-32', 'fe-10', 'fe-11', 'fe-24', 'fe-47'] },
    { id: 'starter-devops-2', title: 'DevOps and SRE, mid-level core', note: 'Kubernetes, containers, Linux and networking fundamentals, plus reliability targets.',
      ids: ['do-3', 'do-31', 'do-4', 'do-32', 'do-33', 'do-22', 'do-25', 'do-16', 'do-19', 'do-5', 'do-53'] },
    { id: 'starter-behavioral-1', title: 'Behavioral warm-up (any role)', note: 'Common behavioral and communication questions. Prepare each answer from your own real experience.',
      ids: ['lead-110', 'lead-112', 'lead-113', 'lead-116', 'lead-117', 'lead-118', 'lead-119', 'lead-101', 'lead-102', 'lead-105', 'lead-114', 'lead-115'] }
  ].map(function (p) { p.origin = 'starter'; return p; });
})();
