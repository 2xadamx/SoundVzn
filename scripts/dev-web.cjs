/**
 * dev-web.cjs — Arranca backend (8080) + frontend web (5200) sin Electron
 * Uso: npm run dev:full
 */
const { spawn } = require('node:child_process');
const net = require('node:net');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const children = [];
let shuttingDown = false;

function log(name, message) {
  process.stdout.write(`[${name}] ${message}`);
}

function run(name, command, args, extraEnv = {}) {
  const finalCommand = isWindows ? 'cmd.exe' : command;
  const finalArgs = isWindows ? ['/d', '/s', '/c', command, ...args] : args;
  const child = spawn(finalCommand, finalArgs, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-http-header-size=80000',
      NODE_TLS_REJECT_UNAUTHORIZED: '0',
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });
  children.push({ name, child });
  child.stdout.on('data', (chunk) => log(name, chunk.toString()));
  child.stderr.on('data', (chunk) => log(name, chunk.toString()));
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[${name}] exited with ${signal || code}`);
    shutdown(code || 1);
  });
  return child;
}

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.once('connect', () => { socket.end(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
  });
}

function waitForAnyPort(port, hosts = ['127.0.0.1', '::1'], timeoutMs = 60000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      for (const host of hosts) {
        if (await isPortOpen(port, host)) { resolve(); return; }
      }
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timeout esperando puerto ${port}`));
        return;
      }
      setTimeout(tick, 500);
    };
    tick();
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of children) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(code), 300);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

(async () => {
  // ── Backend ──────────────────────────────────────────────────
  const backendRunning = await isPortOpen(8080) || await isPortOpen(8080, '::1');
  if (backendRunning) {
    console.log('[DEV] Backend ya disponible en puerto 8080.');
  } else {
    console.log('[DEV] Arrancando backend en puerto 8080...');
    run('BACKEND', npmCmd, ['run', 'dev:backend']);
    await waitForAnyPort(8080);
    console.log('[DEV] Backend listo en http://localhost:8080');
  }

  // ── Frontend web ─────────────────────────────────────────────
  const frontendRunning = await isPortOpen(5200) || await isPortOpen(5200, '::1');
  if (frontendRunning) {
    console.log('[DEV] Frontend ya disponible en puerto 5200.');
  } else {
    console.log('[DEV] Arrancando frontend web en puerto 5200...');
    run('VITE', npmCmd, ['run', 'dev:web'], {
      VITE_WEB: 'true',
      VITE_BACKEND_URL: 'http://localhost:8080',
    });
    await waitForAnyPort(5200);
    console.log('[DEV] ✅ App lista en http://localhost:5200');
  }

  console.log('\n[DEV] ✅ Todo listo. Abre http://localhost:5200 en el navegador.\n');
  console.log('[DEV] Ctrl+C para parar todo.\n');
})().catch((error) => {
  console.error(`[DEV] Error: ${error.message}`);
  shutdown(1);
});
