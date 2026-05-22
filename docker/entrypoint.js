const fs = require('fs');
const path = require('path');
const { spawnSync, spawn } = require('child_process');

const csvPath = process.env.CSV_PATH || '/app/data/rows.csv';
process.env.CSV_PATH = csvPath;

fs.mkdirSync(path.dirname(csvPath), { recursive: true });

const shouldGenerate =
  process.env.GENERATE_CSV === '1' || !fs.existsSync(csvPath);

if (shouldGenerate) {
  const totalRows = process.env.TOTAL_ROWS || '250000';
  console.log(`Generating CSV at ${csvPath} (TOTAL_ROWS=${totalRows})...`);
  const result = spawnSync('node', ['/app/scripts/generate-csv.js'], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const child = spawn('node', ['/app/src/index.js'], {
  stdio: 'inherit',
  env: process.env,
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
