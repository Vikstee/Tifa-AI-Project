import { spawn } from 'child_process';
import path from 'path';

const projectRoot = process.cwd();

console.log('🚀 Starting TIFA Full-Stack Dev Server (Next.js + Python Backend)...');

// Determine Python command
const isWin = process.platform === 'win32';
const pythonCmd = isWin ? 'python' : 'python3';

// 1. Spawn Python Backend (api/index.py)
const pyProcess = spawn(pythonCmd, ['api/index.py'], {
  cwd: projectRoot,
  stdio: 'pipe',
  shell: true
});

pyProcess.stdout.on('data', (data) => {
  const text = data.toString().trim();
  if (text) console.log(`\x1b[36m[Python Backend]\x1b[0m ${text}`);
});

pyProcess.stderr.on('data', (data) => {
  const text = data.toString().trim();
  if (text) console.log(`\x1b[36m[Python Backend]\x1b[0m ${text}`);
});

pyProcess.on('error', (err) => {
  console.error('❌ Failed to start Python backend:', err.message);
});

// 2. Spawn Next.js Dev Server (Port 4028)
const nextCmd = isWin ? 'npx.cmd' : 'npx';
const nextProcess = spawn(nextCmd, ['next', 'dev', '-p', '4028'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true
});

nextProcess.on('error', (err) => {
  console.error('❌ Failed to start Next.js dev server:', err.message);
});

// Graceful Cleanup
const cleanup = () => {
  console.log('\n🛑 Shutting down TIFA Dev Servers...');
  try {
    if (pyProcess && !pyProcess.killed) pyProcess.kill('SIGTERM');
    if (nextProcess && !nextProcess.killed) nextProcess.kill('SIGTERM');
  } catch (e) {
    // Ignore cleanup errors
  }
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
