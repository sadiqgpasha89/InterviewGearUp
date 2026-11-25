/* One list of question-bank files for every Node consumer (tests, the answer Action, audit scripts).
   Base files load first, then data/curated/*.js, which revise or extend them. index.html and sw.js must list the same files;
   test/run.js checks that. */
const fs = require('node:fs');
const path = require('node:path');

function dataFiles(root) {
  const list = (dir) => {
    const full = path.join(root, dir);
    return fs.existsSync(full) ? fs.readdirSync(full).filter((f) => f.endsWith('.js')).sort().map((f) => dir + '/' + f) : [];
  };
  return list('data').concat(list('data/curated'));
}

module.exports = { dataFiles };
