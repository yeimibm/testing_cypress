import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createWriteStream, mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const host = '127.0.0.1';
const apiPort = 3002;
const webPort = 4173;

export function parseArguments(args) {
  const options = { spec: undefined, browser: 'electron' };
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    if (!['--spec', '--browser'].includes(option)) throw new Error(`Unsupported option: ${option}`);
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`${option} requires a value.`);
    if (option === '--browser' && !['electron', 'chrome', 'firefox', 'edge'].includes(value)) throw new Error('Unsupported browser.');
    options[option.slice(2)] = value;
  }
  return options;
}

export async function assertPortAvailable(port) {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', (error) => reject(new Error(`Port ${port} is already in use or unavailable.`, { cause: error })));
    server.listen(port, host, () => server.close(resolve));
  });
}

export async function stopProcess(child) {
  if (process.platform === 'win32') {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, 'exit');
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    const [killCode] = await once(killer, 'exit');
    if (killCode !== 0 && child.exitCode === null && child.signalCode === null) throw new Error(`Could not stop owned process ${child.pid}.`);
    let timer;
    try {
      await Promise.race([exited, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Process ${child.pid} did not stop.`)), 10_000);
      })]);
    } finally { clearTimeout(timer); }
  } else {
    const signalGroup = (signal) => {
      try { process.kill(-child.pid, signal); return true; }
      catch (error) { if (error.code === 'ESRCH') return false; throw error; }
    };
    // Descendants can survive their group leader; signal the owned group anyway.
    if (!signalGroup('SIGTERM')) return;
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      if (!signalGroup(0)) return;
      await delay(50);
    }
    signalGroup('SIGKILL');
    if (child.exitCode === null && child.signalCode === null) await once(child, 'exit');
  }
}

function startNode(args, environment, logName, children, command = process.execPath) {
  const child = spawn(command, args, {
    cwd: root, env: environment, windowsHide: true, detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  const stdout = createWriteStream(resolve(root, '.data/logs/e2e', `${logName}.stdout.log`));
  const stderr = createWriteStream(resolve(root, '.data/logs/e2e', `${logName}.stderr.log`));
  child.stdout.pipe(stdout); child.stderr.pipe(stderr);
  child.stdout.pipe(process.stdout); child.stderr.pipe(process.stderr);
  child.once('error', (error) => console.error(`${logName}:`, error));
  return child;
}

async function completed(child, label) {
  const [code, signal] = await once(child, 'exit');
  if (code !== 0) throw new Error(`${label} failed (${signal ?? code}).`);
}

async function waitUntilReady(url, child, verify) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Service exited before becoming ready: ${url}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok && await verify(response)) return;
    } catch { /* Retry only until the observable readiness deadline. */ }
    await delay(150);
  }
  throw new Error(`Service readiness timed out: ${url}`);
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Use the pinned Node 24 runtime for native SQLite.');
  await assertPortAvailable(apiPort); await assertPortAvailable(webPort);
  const packageManager = process.env.npm_execpath;
  if (!packageManager) throw new Error('Run this command with pnpm e2e.');
  mkdirSync(resolve(root, '.data/logs/e2e'), { recursive: true });
  const environment = {
    ...process.env, NODE_ENV: 'test', PORT: String(apiPort), DATABASE_PATH: '.data/e2e.sqlite',
    API_PROXY_TARGET: `http://${host}:${apiPort}`,
    CYPRESS_BASE_URL: `http://${host}:${webPort}`,
  };
  const children = [];
  let interrupted = false;
  const launch = (args, label, childEnvironment = environment, command = process.execPath) => {
    if (interrupted) throw new Error('E2E execution interrupted.');
    return startNode(args, childEnvironment, label, children, command);
  };
  const interrupt = () => { interrupted = true; void Promise.allSettled(children.map(stopProcess)); };
  process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
  let failure;
  try {
    const packageManagerIsScript = /\.[cm]?js$/i.test(packageManager);
    await completed(launch(packageManagerIsScript ? [packageManager, 'build'] : ['build'],
      'build', { ...environment, NODE_ENV: 'production' }, packageManagerIsScript ? process.execPath : packageManager), 'Build');
    const { resetDatabase, resolveDatabasePath } = await import(pathToFileURL(resolve(root, 'packages/database/dist/index.js')).href);
    resetDatabase(resolveDatabasePath('.data/e2e.sqlite'), 'test');
    const api = launch([resolve(root, 'apps/api/dist/server.js')], 'api');
    await waitUntilReady(`http://${host}:${apiPort}/api/health`, api, async (response) => (await response.json()).status === 'ok');
    const requireWeb = createRequire(resolve(root, 'apps/web/package.json'));
    const vite = resolve(dirname(requireWeb.resolve('vite/package.json')), 'bin/vite.js');
    const web = launch([vite, 'preview', resolve(root, 'apps/web'), '--host', host, '--port', String(webPort), '--strictPort', '--config', resolve(root, 'apps/web/vite.config.ts')], 'web');
    await waitUntilReady(`http://${host}:${webPort}`, web, async (response) => (await response.text()).includes('<div id="root">'));
    const project = resolve(root, 'apps/e2e');
    const requireE2e = createRequire(resolve(project, 'package.json'));
    const cypressCli = resolve(dirname(requireE2e.resolve('cypress/package.json')), 'bin/cypress');
    const cypressArgs = [cypressCli, 'run', '--project', project, '--browser', options.browser];
    if (options.spec) cypressArgs.push('--spec', resolve(project, options.spec));
    const cypressEnvironment = { ...environment };
    // Electron must start as a browser even when the terminal belongs to Electron.
    delete cypressEnvironment.ELECTRON_RUN_AS_NODE;
    await completed(launch(cypressArgs, 'cypress', cypressEnvironment), 'Cypress');
    if (interrupted) throw new Error('E2E execution interrupted.');
  } catch (error) {
    failure = error;
  } finally {
    process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt);
    const cleanup = await Promise.allSettled(children.reverse().map(stopProcess));
    const failed = cleanup.filter((result) => result.status === 'rejected');
    if (failed.length) failure = new AggregateError([
      ...(failure ? [failure] : []), ...failed.map((result) => result.reason),
    ], 'E2E cleanup failed.');
  }
  if (failure) throw failure;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
