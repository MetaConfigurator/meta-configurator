/**
 * System test: verifies that the relay correctly proxies AI requests from MetaConfigurator
 * to an upstream LLM endpoint, injecting the provider API key server-side.
 *
 * The test starts:
 *  - a mock LLM server (Node.js, port 9999) that echoes the user prompt as JSON
 *  - the MetaConfigurator relay (Python, port 8081) pointing at the mock LLM
 *
 * MetaConfigurator is configured (via settings fixture) to route AI calls through the relay.
 * The test enters a schema-creation prompt, submits it, and asserts that the resulting
 * schema document equals the echo response the mock LLM produced.
 */

import {test, expect} from '../../../tests/shared/playwright';
import * as http from 'node:http';
import {ChildProcess, spawn} from 'node:child_process';
import * as path from 'node:path';
import {openApp, forceEditorMode} from '../../../tests/shared/utils';
import {SessionMode} from '../../../meta_configurator/src/store/sessionMode';
import {tpGetData} from '../../../tests/shared/utilsTestPanel';
import {aiPanelEnterCreatePrompt, aiPanelSubmitCreate} from '../../../tests/shared/utilsAiPanel';

const MOCK_LLM_PORT = 9999;
const RELAY_PORT = 18081;
const RELAY_DIR = path.join(__dirname, '..');
const RELAY_CONFIG = path.join(__dirname, 'relay-e2e-config.yaml');

let mockLlmServer: http.Server | null = null;
let relayProcess: ChildProcess | null = null;
let relayStartupError = '';

// ---------------------------------------------------------------------------
// Mock LLM server — echoes the user message content wrapped in {"request": ...}
// ---------------------------------------------------------------------------

function startMockLlmServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        mockLlmServer = http.createServer((req, res) => {
            if (req.method !== 'POST' || req.url !== '/chat/completions') {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            let body = '';
            req.on('data', chunk => (body += chunk));
            req.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    const messages: Array<{role: string; content: string}> = parsed.messages ?? [];
                    const userMsg = [...messages].reverse().find(m => m.role === 'user');
                    const userContent = userMsg?.content ?? '';
                    const replyContent = JSON.stringify({request: userContent});

                    const reply = JSON.stringify({
                        id: 'mock-1',
                        object: 'chat.completion',
                        choices: [
                            {
                                index: 0,
                                message: {role: 'assistant', content: replyContent},
                                finish_reason: 'stop',
                            },
                        ],
                        usage: {prompt_tokens: 5, completion_tokens: 5, total_tokens: 10},
                    });

                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(reply);
                } catch (e) {
                    res.writeHead(400);
                    res.end('Bad request');
                }
            });
        });

        mockLlmServer.on('error', reject);
        mockLlmServer.listen(MOCK_LLM_PORT, '127.0.0.1', () => resolve());
    });
}

function stopMockLlmServer(): Promise<void> {
    return new Promise(resolve => {
        if (!mockLlmServer) return resolve();
        mockLlmServer.close(() => resolve());
    });
}

// ---------------------------------------------------------------------------
// Relay process
// ---------------------------------------------------------------------------

function startRelay(): Promise<void> {
    return new Promise((resolve, reject) => {
        const python = process.platform === 'win32' ? 'python' : 'python3';
        relayStartupError = '';

        relayProcess = spawn(python, ['app.py'], {
            cwd: RELAY_DIR,
            env: {
                ...process.env,
                CONFIG_PATH: RELAY_CONFIG,
                HOST: '127.0.0.1',
                PORT: String(RELAY_PORT),
            },
        });

        relayProcess.stdout?.on('data', data => process.stderr.write(`[relay] ${data}`));
        relayProcess.stderr?.on('data', data => {
            const text = String(data);
            relayStartupError += text;
            process.stderr.write(`[relay] ${text}`);
        });
        relayProcess.on('error', err => {
            relayStartupError += String(err);
            process.stderr.write(`[relay spawn error] ${err}\n`);
        });

        const deadline = Date.now() + 15000;
        const poll = () => {
            if (relayProcess?.exitCode !== null && relayProcess?.exitCode !== undefined) {
                reject(new Error(`Relay exited early with code ${relayProcess.exitCode}: ${relayStartupError.trim()}`));
                return;
            }
            const req = http.get(`http://127.0.0.1:${RELAY_PORT}/health`, res => {
                if (res.statusCode === 200) {
                    resolve();
                } else if (Date.now() < deadline) {
                    setTimeout(poll, 300);
                } else {
                    reject(new Error('Relay health check returned non-200'));
                }
                res.resume();
            });
            req.on('error', () => {
                if (Date.now() < deadline) setTimeout(poll, 300);
                else reject(new Error(`Relay failed to start within 15 s: ${relayStartupError.trim()}`));
            });
        };
        setTimeout(poll, 500);
    });
}

function stopRelay(): void {
    if (relayProcess) {
        relayProcess.kill();
        relayProcess = null;
    }
}

// ---------------------------------------------------------------------------
// Test lifecycle
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
    await startMockLlmServer();
    await startRelay();
});

test.afterAll(async () => {
    stopRelay();
    await stopMockLlmServer();
});

// ---------------------------------------------------------------------------
// The system test
// ---------------------------------------------------------------------------

test('relay proxies schema-creation prompt and applies the response as the new schema', async ({page}) => {
    test.setTimeout(30000);

    const prompt = 'create a simple person schema';

    // Load MC in schema editor mode with relay settings and an empty schema.
    // Providing a schema fixture (even an empty one) skips the initial schema-selection dialog.
    await openApp(page, 'settings_relay_test.json', null, 'schema_empty.json');
    await forceEditorMode(page, SessionMode.SchemaEditor);

    // Enter the prompt in the AI panel's "Create Schema" form and submit.
    await aiPanelEnterCreatePrompt(page, prompt);
    await aiPanelSubmitCreate(page);

    // Poll until the schema document equals the echo response from the mock LLM.
    // The mock wraps the user message in {"request": "<prompt>"}.
    await expect
        .poll(() => tpGetData(page, SessionMode.SchemaEditor), {timeout: 15000})
        .toEqual({request: prompt});
});
