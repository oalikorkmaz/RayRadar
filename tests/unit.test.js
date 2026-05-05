// Run via tests/test-runner.html (Live Server required for ES modules)
import { minutesRemaining, formatMinutes, formatTime } from '../js/services/time.js';
import { createTrain, getTrainProgress, getTrainPosition, getTrainDirection } from '../js/models/Train.js';
import { validateRoute, validateTrainNumber, validateDuration } from '../js/models/Line.js';
import { loadData, saveData, DEFAULT_DATA } from '../js/services/storage.js';

const out = document.getElementById('output');
let passed = 0, failed = 0;

function assert(condition, message) {
  if (condition) {
    out.innerHTML += `<span class="pass">✓ ${message}</span>\n`;
    passed++;
  } else {
    out.innerHTML += `<span class="fail">✗ ${message}</span>\n`;
    failed++;
  }
}

// --- time.js ---
out.innerHTML += '<hr><b>time.js</b>\n';

assert(formatMinutes(0) === '0dk', 'formatMinutes(0) = "0dk"');
assert(formatMinutes(-5) === '0dk', 'formatMinutes(-5) = "0dk"');
assert(formatMinutes(11) === '11dk', 'formatMinutes(11) = "11dk"');
assert(formatMinutes(0.5) === '1dk', 'formatMinutes(0.5) rounds up = "1dk"');

const fiveMinutesAgo = Date.now() - 5 * 60_000;
const rem = minutesRemaining(fiveMinutesAgo, 11);
assert(Math.abs(rem - 6) < 0.1, `minutesRemaining: 11dk trende 5dk geçince ~6dk kalmalı (got ${rem.toFixed(2)})`);

// --- Line.js validation ---
out.innerHTML += '<hr><b>Line.js validation</b>\n';

assert(validateTrainNumber('46500').valid === true, 'validateTrainNumber("46500") → valid');
assert(validateTrainNumber('4650').valid === false, 'validateTrainNumber("4650") 4 hane → invalid');
assert(validateTrainNumber('465ab').valid === false, 'validateTrainNumber("465ab") harf → invalid');
assert(validateTrainNumber('123456').valid === false, 'validateTrainNumber("123456") 6 hane → invalid');

assert(validateDuration(11).valid === true, 'validateDuration(11) → valid');
assert(validateDuration(0).valid === false, 'validateDuration(0) → invalid');
assert(validateDuration(1000).valid === false, 'validateDuration(1000) → invalid');
assert(validateDuration('abc').valid === false, 'validateDuration("abc") → invalid');

assert(validateRoute('NARL', 'PAZA').valid === true, 'validateRoute(NARL, PAZA) → valid');
assert(validateRoute('PAZA', 'PAZA').valid === false, 'validateRoute(PAZA, PAZA) same station → invalid');
assert(validateRoute(null, 'PAZA').valid === false, 'validateRoute(null, PAZA) → invalid');

// --- Train.js ---
out.innerHTML += '<hr><b>Train.js</b>\n';

const t = createTrain({ trainNumber: '46500', fromStation: 'NARL', toStation: 'PAZA', durationMin: 11 });
assert(t.trainNumber === '46500', 'createTrain: trainNumber');
assert(t.status === 'active', 'createTrain: status=active');
assert(t.preWarningFired === false, 'createTrain: preWarningFired=false');

assert(getTrainDirection(t) === 'east', 'getTrainDirection NARL→PAZA = east');
const westTrain = createTrain({ trainNumber: '99999', fromStation: 'PAZA', toStation: 'NARL', durationMin: 12 });
assert(getTrainDirection(westTrain) === 'west', 'getTrainDirection PAZA→NARL = west');

// Progress test: freshly created train → ~0
const freshProgress = getTrainProgress(t);
assert(freshProgress < 0.01, `getTrainProgress: fresh train ≈ 0 (got ${freshProgress.toFixed(4)})`);

// Position test: fresh train starting at NARL (index 2)
const freshPos = getTrainPosition(t);
assert(Math.abs(freshPos - 2) < 0.1, `getTrainPosition: fresh NARL→PAZA ≈ 2 (got ${freshPos.toFixed(4)})`);

// --- storage.js ---
out.innerHTML += '<hr><b>storage.js</b>\n';

// Clear any existing test data
localStorage.removeItem('tren-izleme:v1');

const fresh = loadData();
assert(Array.isArray(fresh.activeTrains), 'loadData: fresh → activeTrains is array');
assert(fresh.firstLaunchCompleted === false, 'loadData: fresh → firstLaunchCompleted=false');
assert(fresh.settings.preWarningMinutes === 3, 'loadData: fresh → preWarningMinutes=3');

// Save and reload
const testData = { ...fresh, firstLaunchCompleted: true };
saveData(testData);
const reloaded = loadData();
assert(reloaded.firstLaunchCompleted === true, 'saveData+loadData: firstLaunchCompleted persists');

// Bad JSON
localStorage.setItem('tren-izleme:v1', '{bad json}');
const recovered = loadData();
assert(Array.isArray(recovered.activeTrains), 'loadData: bad JSON → returns defaults');

// Cleanup
localStorage.removeItem('tren-izleme:v1');

// --- Summary ---
out.innerHTML += `<hr><b>Sonuç: ${passed} geçti, ${failed} başarısız</b>\n`;
