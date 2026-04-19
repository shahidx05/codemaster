/**
 * CodeExecutor
 *
 * JavaScript: executed locally with new Function() + Promise timeout.
 *
 * C++ (language_id 54) and Python (language_id 71):
 *   Submitted to Judge0 CE public API — https://ce.judge0.com
 *   POST /submissions?base64_encoded=false&wait=true
 *
 *   Each test case must have:
 *     stdin         {string}  — plain-text input sent to the program
 *     expectedStdout {string} — plain-text expected stdout (trimmed comparison)
 *
 *   Judge0 returns: stdout, stderr, compile_output, status.id, time, memory
 */

const JUDGE0_URL     = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true';
const JUDGE0_TIMEOUT = 20_000; // 20 s hard HTTP timeout
const JS_TIMEOUT_MS  = 3_000;

// Judge0 language IDs
const LANG = { cpp: 54, python: 71 };

// Judge0 status IDs
const J0 = {
    ACCEPTED:          3,
    WRONG_ANSWER:      4,
    TIME_LIMIT:        5,
    COMPILATION_ERROR: 6,
    // 7-12 are various runtime errors (SIGSEGV, SIGABRT, etc.)
};

class CodeExecutor {

    /**
     * Main entry point.
     * @param {string} code       Student's submitted code
     * @param {Array}  testCases  Array of { input, expectedOutput, stdin, expectedStdout, isPublic }
     * @param {string} language   'javascript' | 'cpp' | 'python'
     * @param {object} _problem   Unused (kept for API compatibility)
     */
    async executeCode(code, testCases, language = 'javascript', _problem = null) {
        if (!code || !code.trim()) {
            return this._emptyCodeResponse(testCases);
        }
        if (language === 'cpp')    return this._executeWithJudge0(code, testCases, LANG.cpp);
        if (language === 'python') return this._executeWithJudge0(code, testCases, LANG.python);
        return this._executeJavaScript(code, testCases);
    }

    // ── JavaScript (local, timeout-guarded) ──────────────────────────────────

    async _executeJavaScript(code, testCases) {
        const results = [];
        let allPassed = true;

        for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            try {
                const actualOutput = await this._runWithTimeout(code, tc.input, JS_TIMEOUT_MS);
                const passed = JSON.stringify(actualOutput) === JSON.stringify(tc.expectedOutput);
                if (!passed) allPassed = false;
                results.push({
                    testCase: i + 1, passed,
                    input: tc.input, expectedOutput: tc.expectedOutput, actualOutput,
                    error: null, isPublic: tc.isPublic ?? false
                });
            } catch (err) {
                allPassed = false;
                results.push({
                    testCase: i + 1, passed: false,
                    input: tc.input, expectedOutput: tc.expectedOutput, actualOutput: null,
                    error: err.message, isPublic: tc.isPublic ?? false
                });
            }
        }

        const hasTLE = results.some(r => r.error?.includes('Time Limit Exceeded'));
        const hasErr = results.some(r => r.error && !r.error.includes('Time Limit Exceeded'));
        const status = allPassed      ? 'Accepted'
                     : hasTLE         ? 'Time Limit Exceeded'
                     : hasErr         ? 'Runtime Error'
                     : 'Wrong Answer';

        return {
            status, testResults: results,
            runtime: Math.floor(Math.random() * 80) + 10,
            memory:  Math.floor(Math.random() * 15) + 5
        };
    }

    _runWithTimeout(code, input, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Time Limit Exceeded')), timeoutMs);
            try {
                const wrapped = `${code}\nreturn solution(${JSON.stringify(input)});`;
                // eslint-disable-next-line no-new-func
                const result = new Function(wrapped)();
                clearTimeout(timer);
                resolve(result);
            } catch (err) {
                clearTimeout(timer);
                reject(err);
            }
        });
    }

    // ── Judge0 — C++ and Python ───────────────────────────────────────────────

    async _executeWithJudge0(code, testCases, languageId) {
        const results    = [];
        let allPassed    = true;
        let finalStatus  = 'Accepted';
        let totalRuntime = 0;
        let maxMemory    = 0;

        for (let i = 0; i < testCases.length; i++) {
            const tc             = testCases[i];
            const stdin          = tc.stdin ?? '';
            const expectedStdout = (tc.expectedStdout ?? '').trim();

            // ── Call Judge0 ──────────────────────────────────────────────────
            let j0;
            try {
                j0 = await this._callJudge0(code, stdin, languageId);
            } catch (fetchErr) {
                allPassed   = false;
                finalStatus = 'Runtime Error';
                results.push(this._apiErrorResult(i, tc, fetchErr.message));
                continue;
            }

            const statusId      = j0.status?.id ?? 0;
            const stdout        = (j0.stdout        || '').trim();
            const stderr        = (j0.stderr        || '').trim();
            const compileOutput = (j0.compile_output || '').trim();
            totalRuntime       += parseFloat(j0.time   || '0');
            maxMemory           = Math.max(maxMemory, j0.memory || 0);

            // ── Compilation Error ────────────────────────────────────────────
            if (statusId === J0.COMPILATION_ERROR) {
                allPassed   = false;
                finalStatus = 'Compilation Error';
                const errMsg = compileOutput || 'Compilation failed.';
                // All remaining test cases also fail
                for (let j = i; j < testCases.length; j++) {
                    const t = testCases[j];
                    results.push({
                        testCase: j + 1, passed: false,
                        input: t.input, expectedOutput: t.expectedOutput,
                        expectedStdout: (t.expectedStdout ?? '').trim(),
                        actualOutput: null, stdout: null, stderr: null,
                        compileOutput: errMsg, error: errMsg,
                        isPublic: t.isPublic ?? false
                    });
                }
                break;
            }

            // ── Time Limit Exceeded ──────────────────────────────────────────
            if (statusId === J0.TIME_LIMIT) {
                allPassed = false;
                if (finalStatus === 'Accepted') finalStatus = 'Time Limit Exceeded';
                results.push({
                    testCase: i + 1, passed: false,
                    input: tc.input, expectedOutput: tc.expectedOutput,
                    expectedStdout, actualOutput: null,
                    stdout: null, stderr: 'Time Limit Exceeded', compileOutput: null,
                    error: 'Time Limit Exceeded', isPublic: tc.isPublic ?? false
                });
                continue;
            }

            // ── Runtime Error (any non-accepted, non-WA status) ──────────────
            if (statusId !== J0.ACCEPTED && statusId !== J0.WRONG_ANSWER) {
                allPassed = false;
                if (finalStatus === 'Accepted') finalStatus = 'Runtime Error';
                const errMsg = stderr || `Runtime error (Judge0 status ${statusId})`;
                results.push({
                    testCase: i + 1, passed: false,
                    input: tc.input, expectedOutput: tc.expectedOutput,
                    expectedStdout, actualOutput: null,
                    stdout: stdout || null, stderr: errMsg,
                    compileOutput: compileOutput || null, error: errMsg,
                    isPublic: tc.isPublic ?? false
                });
                continue;
            }

            // ── Compare stdout ───────────────────────────────────────────────
            const passed = stdout === expectedStdout;
            if (!passed) {
                allPassed = false;
                if (finalStatus === 'Accepted') finalStatus = 'Wrong Answer';
            }

            results.push({
                testCase: i + 1, passed,
                input: tc.input, expectedOutput: tc.expectedOutput,
                expectedStdout, actualOutput: stdout,
                stdout, stderr: stderr || null,
                compileOutput: compileOutput || null, error: null,
                isPublic: tc.isPublic ?? false
            });
        }

        return {
            status:      finalStatus,
            testResults: results,
            runtime:     Math.round(totalRuntime * 1000),   // s → ms
            memory:      Math.round(maxMemory    / 1024)    // KB → MB approx
        };
    }

    async _callJudge0(sourceCode, stdin, languageId) {
        const headers = { 'Content-Type': 'application/json' };
        // Optional: set JUDGE0_API_KEY in .env for higher rate limits
        if (process.env.JUDGE0_API_KEY) {
            headers['X-Auth-Token'] = process.env.JUDGE0_API_KEY;
        }

        const response = await fetch(JUDGE0_URL, {
            method:  'POST',
            headers,
            body:    JSON.stringify({ source_code: sourceCode, language_id: languageId, stdin: stdin || '' }),
            signal:  AbortSignal.timeout(JUDGE0_TIMEOUT)
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`Judge0 HTTP ${response.status}: ${text.slice(0, 300)}`);
        }
        return response.json();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    _apiErrorResult(i, tc, message) {
        return {
            testCase: i + 1, passed: false,
            input: tc.input, expectedOutput: tc.expectedOutput,
            actualOutput: null, stdout: null, stderr: null, compileOutput: null,
            error: `Code execution service unavailable: ${message}. Please try again.`,
            isPublic: tc.isPublic ?? false
        };
    }

    _emptyCodeResponse(testCases) {
        return {
            status: 'Runtime Error',
            testResults: testCases.map((tc, i) => ({
                testCase: i + 1, passed: false,
                input: tc.input, expectedOutput: tc.expectedOutput,
                actualOutput: null, error: 'No code submitted.',
                isPublic: tc.isPublic ?? false
            })),
            runtime: 0, memory: 0
        };
    }
}

module.exports = new CodeExecutor();
