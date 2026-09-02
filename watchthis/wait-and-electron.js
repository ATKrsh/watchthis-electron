import http from 'http';
import { spawn } from 'child_process';

const checkVite = () => {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5173', (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.end();
  });
};

const waitForServer = async () => {
  console.log('[WatchThis Dev] Waiting for Vite dev server on http://localhost:5173...');
  let ready = false;
  while (!ready) {
    ready = await checkVite();
    if (!ready) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  console.log('[WatchThis Dev] Vite dev server is ready! Launching Electron...');
  
  // Launch electron
  const electronProcess = spawn('npx.cmd', ['electron', '.'], {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  electronProcess.on('close', (code) => {
    process.exit(code || 0);
  });
};

waitForServer();
