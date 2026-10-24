import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import test from 'node:test';
import { assertPortAvailable, parseArguments, stopProcess } from './run-e2e.mjs';

test('rejects unsupported and missing options before starting services', () => {
  assert.throws(() => parseArguments(['--record']), /Unsupported/);
  assert.throws(() => parseArguments(['--spec']), /requires a value/);
  assert.deepEqual(parseArguments(['--spec', 'cypress/e2e/successful-order.cy.ts']), {
    spec: 'cypress/e2e/successful-order.cy.ts', browser: 'electron',
  });
});

test('refuses an occupied port without interrupting the existing listener', async () => {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  try {
    await assert.rejects(assertPortAvailable(port), /already in use/);
    assert.equal(server.listening, true);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('stops and waits for a child process that the runner owns', async () => {
  const child = spawn(process.execPath, ['-e', 'console.log("ready"); setInterval(() => {}, 1000)'], { windowsHide: true, detached: process.platform !== 'win32' });
  await once(child.stdout, 'data');
  try {
    await stopProcess(child);
    assert.ok(child.exitCode !== null || child.signalCode !== null);
  } finally { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }
});

test('stops an owned Linux process group after its leader exits', { skip: process.platform !== 'linux' }, async () => {
  const source = `
    const { spawn } = require('node:child_process');
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    console.log(child.pid); child.unref();
  `;
  const leader = spawn(process.execPath, ['-e', source], { detached: true, stdio: ['ignore', 'pipe', 'ignore'] });
  const leaderExited = once(leader, 'exit');
  const [output] = await once(leader.stdout, 'data');
  const descendantPid = Number(output.toString().trim());
  await leaderExited;
  try {
    await stopProcess(leader);
    // A killed orphan can remain a zombie briefly until the system reaps it.
    const { readFile } = await import('node:fs/promises');
    try {
      const status = await readFile(`/proc/${descendantPid}/stat`, 'utf8');
      assert.match(status, /\) Z /);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  } finally { await stopProcess(leader); }
});
