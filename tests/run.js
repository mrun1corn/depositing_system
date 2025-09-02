const path = require('path');
const tests = [
  './utils.test.js',
];

let failed = 0;
for (const t of tests) {
  try {
    require(path.join(__dirname, t));
    console.log(`PASS ${t}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${t}`);
    console.error(e && e.stack || e);
  }
}

if (failed) {
  console.error(`Tests failed: ${failed}`);
  process.exit(1);
}
console.log('All tests passed.');
