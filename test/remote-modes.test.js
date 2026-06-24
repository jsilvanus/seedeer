import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { WorkerPool } from '../src/shared/worker-pool.js';
import { startSocketServer } from '../src/socket-model-server.js';
import { startGrpcServer } from '../src/grpc-model-server.js';

const ECHO_ENGINE = new URL('./fixtures/echo-engine.js', import.meta.url).href;

test('WorkerPool (socket mode) round-trips through socket-model-server', async () => {
  const socketPath = path.join(os.tmpdir(), `seedeer-test-${process.pid}.sock`);
  const server = await startSocketServer({
    enginePath: ECHO_ENGINE,
    engineOptions: { greeting: 'socket-hi' },
    concurrency: 1,
    socketPath,
  });

  try {
    const pool = new WorkerPool(ECHO_ENGINE, { mode: 'socket', servers: [socketPath] });
    const result = await pool.run({ type: 'ping' });
    assert.equal(result.echoedOptions.greeting, 'socket-hi');
    assert.equal(result.task.type, 'ping');
    await pool.destroy();
  } finally {
    await server.close();
  }
});

test('WorkerPool (grpc mode) round-trips through grpc-model-server', async () => {
  const server = await startGrpcServer({
    enginePath: ECHO_ENGINE,
    engineOptions: { greeting: 'grpc-hi' },
    concurrency: 1,
    host: '127.0.0.1',
    port: 0,
  });

  try {
    const pool = new WorkerPool(ECHO_ENGINE, { mode: 'grpc', servers: [server.address] });
    const result = await pool.run({ type: 'ping' });
    assert.equal(result.echoedOptions.greeting, 'grpc-hi');
    assert.equal(result.task.type, 'ping');
    await pool.destroy();
  } finally {
    await server.close();
  }
});
