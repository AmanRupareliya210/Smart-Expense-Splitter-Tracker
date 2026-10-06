const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const serverDir = path.join(rootDir, 'server');
const clientDir = path.join(rootDir, 'client');

console.log('🚀 Starting Smart Expense Splitter & Tracker (Server + Client)...\n');

// Start Server
const serverProcess = spawn('node', ['server.js'], {
  cwd: serverDir,
  stdio: 'pipe',
  shell: false,
  env: { ...process.env, FORCE_COLOR: '1' }
});

// Start Client (Vite)
const viteBin = path.join(clientDir, 'node_modules', 'vite', 'bin', 'vite.js');
const clientProcess = spawn('node', [viteBin], {
  cwd: clientDir,
  stdio: 'pipe',
  shell: false,
  env: { ...process.env, FORCE_COLOR: '1' }
});

const pipeOutput = (processInstance, prefix, color) => {
  processInstance.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        console.log(`${color}${prefix}\x1b[0m ${line}`);
      }
    });
  });

  processInstance.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        console.error(`${color}${prefix}\x1b[0m ${line}`);
      }
    });
  });
};

pipeOutput(serverProcess, '[SERVER]', '\x1b[36m'); // Cyan
pipeOutput(clientProcess, '[CLIENT]', '\x1b[35m'); // Magenta

const cleanExit = () => {
  console.log('\n🛑 Shutting down server and client...');
  serverProcess.kill();
  clientProcess.kill();
  process.exit(0);
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
