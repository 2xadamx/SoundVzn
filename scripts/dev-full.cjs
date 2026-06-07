const { spawn } = require('node:child_process');
const net = require('node:net');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const electronCmd = isWindows ? 'electron.cmd' : 'electron';

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
      NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED || '0',
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

function waitForPort(port, host = '127.0.0.1', timeoutMs = 45000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ port, host });

      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
          return;
        }
        setTimeout(tryConnect, 500);
      });
    };

    tryConnect();
  });
}

function waitForAnyPort(port, hosts = ['127.0.0.1', '::1'], timeoutMs = 45000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tick = async () => {
      for (const host of hosts) {
        if (await isPortOpen(port, host)) {
          resolve();
          return;
        }
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timed out waiting for port ${port}`));
        return;
      }

      setTimeout(tick, 500);
    };

    tick();
  });
}

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });

    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });

    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (error) => {
      resolve(error && error.code === 'EADDRINUSE');
    });

    server.once('listening', () => {
      server.close(() => resolve(false));
    });

    server.listen(port);
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
  if ((await isPortOpen(8080)) || (await isPortOpen(8080, '::1')) || (await isPortInUse(8080))) {
    console.log('[DEV] Backend already available on 8080.');
  } else {
    console.log('[DEV] Starting backend on 8080...');
    run('BACKEND', npmCmd, ['run', 'dev:backend']);
    await waitForPort(8080);
  }

  if ((await isPortOpen(5200)) || (await isPortOpen(5200, '::1')) || (await isPortInUse(5200))) {
    console.log('[DEV] Vite already available on 5200.');
  } else {
    console.log('[DEV] Starting Vite on 5200...');
    run('VITE', npmCmd, ['run', 'dev:web']);
    await waitForAnyPort(5200);
  }

  console.log('[DEV] Starting Electron...');
  run('ELECTRON', electronCmd, ['.'], {
    VITE_DEV_SERVER_URL: 'http://localhost:5200',
    FRONTEND_URL: 'http://localhost:5200',
  });
})().catch((error) => {
  console.error(`[DEV] ${error.message}`);
  shutdown(1);
});
