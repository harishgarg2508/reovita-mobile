// Watches files that are compiled into the APK and starts an EAS development build when they change.
// JavaScript/TypeScript edits are not watched: the dev server already hot-reloads them on the phone.
// Usage: node scripts/auto-build.js
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DEBOUNCE_MS = 15000; // wait for edits to settle before building

const WATCHED = [
  'google-services.json',
  'app.config.ts',
  'eas.json',
  'package.json',
  'package-lock.json',
  '.env.cloud',
  'plugins',
];

let timer = null;
let building = false;
let pending = false;

function log(message) {
  console.log(`[auto-build ${new Date().toLocaleTimeString()}] ${message}`);
}

function runBuild() {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  pending = false;
  log('Starting EAS development build (Android APK)...');
  const child = spawn(
    'npx',
    ['--yes', 'eas-cli@latest', 'build', '--profile', 'development', '--platform', 'android', '--non-interactive', '--no-wait'],
    { cwd: ROOT, shell: true, stdio: 'inherit' },
  );
  child.on('exit', (code) => {
    building = false;
    log(code === 0 ? 'Build queued on EAS. Check the link above or run: eas build:list' : `Build command exited with code ${code}`);
    if (pending) runBuild();
  });
}

function scheduleBuild(changed) {
  log(`Changed: ${changed}. Build starts in ${DEBOUNCE_MS / 1000}s unless another change lands first.`);
  clearTimeout(timer);
  timer = setTimeout(runBuild, DEBOUNCE_MS);
}

for (const entry of WATCHED) {
  const full = path.join(ROOT, entry);
  if (!fs.existsSync(full)) {
    log(`Skipping missing path: ${entry}`);
    continue;
  }
  const isDir = fs.statSync(full).isDirectory();
  fs.watch(full, { recursive: isDir }, (_event, filename) => {
    scheduleBuild(isDir && filename ? path.join(entry, String(filename)) : entry);
  });
}

log('Watching native-level files. Save one to trigger a build. Press Ctrl+C to stop.');
