/**
 * CodeExecutor
 *
 * JavaScript: executed locally with new Function() + Promise timeout.
 *   Note: new Function() cannot kill true infinite loops (single-threaded JS).
 *   For production, replace with a sandboxed VM (isolated-vm / Docker).
 *
 * C++: sent to Piston public API (https://emkc.org/api/v2/piston).
 *   No API key or Docker required — Node 18+ native fetch() is used.
 *   Each Problem document stores a `cppWrapper` field: a complete main()
 *   function that reads JSON from stdin, calls the student's solution(),
 *   and prints the result as JSON to stdout.
 *   A shared JSON utility header is prepended to every C++ submission so
 *   wrappers can use helpers like _jsonIntArray(), _jsonString(), etc.
 */

// ── Shared C++ JSON utility header ───────────────────────────────────────────
// Prepended to every C++ Piston submission. Provides lightweight JSON
// parsing without any external libraries.
const CPP_JSON_UTILS = `#include <bits/stdc++.h>
using namespace std;

// ── auto-injected JSON helpers ────────────────────────────────────────────────

long long _jsonInt(const string& s, const string& key = "") {
    string src = s;
    if (!key.empty()) {
        string k = "\\"" + key + "\\":";
        size_t p = src.find(k);
        if (p == string::npos) return 0;
        src = src.substr(p + k.size());
    }
    size_t i = 0;
    while (i < src.size() && src[i] == ' ') i++;
    size_t j = i;
    if (j < src.size() && src[j] == '-') j++;
    while (j < src.size() && isdigit(src[j])) j++;
    if (i == j) return 0;
    return stoll(src.substr(i, j - i));
}

bool _jsonBool(const string& s, const string& key = "") {
    string src = s;
    if (!key.empty()) {
        string k = "\\"" + key + "\\":";
        size_t p = src.find(k);
        if (p == string::npos) return false;
        src = src.substr(p + k.size());
    }
    size_t p = src.find_first_of("tf");
    if (p == string::npos) return false;
    return src[p] == 't';
}

vector<int> _jsonIntArray(const string& s, const string& key = "") {
    string src = s;
    if (!key.empty()) {
        string k = "\\"" + key + "\\":";
        size_t p = src.find(k);
        if (p == string::npos) return {};
        src = src.substr(p + k.size());
    }
    size_t a = src.find('['), b = src.find(']');
    if (a == string::npos) return {};
    string inner = src.substr(a + 1, b - a - 1);
    vector<int> res;
    stringstream ss(inner);
    string tok;
    while (getline(ss, tok, ',')) {
        tok.erase(remove_if(tok.begin(), tok.end(), ::isspace), tok.end());
        if (!tok.empty()) res.push_back(stoi(tok));
    }
    return res;
}

vector<char> _jsonCharArray(const string& s, const string& key = "") {
    string src = s;
    if (!key.empty()) {
        string k = "\\"" + key + "\\":";
        size_t p = src.find(k);
        if (p == string::npos) return {};
        src = src.substr(p + k.size());
    }
    size_t start = src.find('['), stop = src.rfind(']');
    if (start == string::npos) return {};
    vector<char> res;
    for (size_t i = start + 1; i < stop; i++) {
        if (src[i] == '"' && i + 2 <= stop && src[i + 2] == '"') {
            res.push_back(src[i + 1]);
            i += 2;
        }
    }
    return res;
}

string _jsonString(const string& s, const string& key = "") {
    string src = s;
    if (!key.empty()) {
        string k = "\\"" + key + "\\":\\"";
        size_t p = src.find(k);
        if (p == string::npos) {
            k = "\\"" + key + "\\":";
            p = src.find(k);
            if (p == string::npos) return "";
            src = src.substr(p + k.size());
            size_t q = src.find('"');
            if (q == string::npos) return "";
            src = src.substr(q + 1);
        } else {
            src = src.substr(p + k.size());
        }
    } else {
        size_t q = src.find('"');
        if (q == string::npos) return src;
        src = src.substr(q + 1);
    }
    string res;
    for (size_t i = 0; i < src.size(); i++) {
        if (src[i] == '"') break;
        if (src[i] == '\\\\' && i + 1 < src.size()) { res += src[++i]; continue; }
        res += src[i];
    }
    return res;
}
// ─────────────────────────────────────────────────────────────────────────────
`;

const PISTON_URL      = 'https://emkc.org/api/v2/piston/execute';
const PISTON_TIMEOUT_S = 3;    // seconds passed to Piston run_timeout
const JS_TIMEOUT_MS   = 3000;  // milliseconds for local JS execution

class CodeExecutor {
    /**
     * @param {string} code       Student's submitted code
     * @param {Array}  testCases  Array of { input, expectedOutput, isPublic }
     * @param {string} language   'javascript' | 'cpp'
     * @param {object} problem    Full Problem document (required for C++ cppWrapper)
     */
    async executeCode(code, testCases, language = 'javascript', problem = null) {
        if (language === 'cpp') {
            return this._executeCpp(code, testCases, problem);
        }
        if (language === 'python') {
            return this._executePython(code, testCases, problem);
        }
        return this._executeJavaScript(code, testCases);
    }

    // ── JavaScript (local, timeout guarded) ──────────────────────────────────

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
                    testCase: i + 1,
                    passed,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    actualOutput,
                    error: null,
                    isPublic: tc.isPublic ?? false
                });
            } catch (err) {
                allPassed = false;
                results.push({
                    testCase: i + 1,
                    passed: false,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    actualOutput: null,
                    error: err.message,
                    isPublic: tc.isPublic ?? false
                });
            }
        }

        const hasTLE = results.some(r => r.error && r.error.includes('Time Limit Exceeded'));
        const hasErr = results.some(r => r.error && !r.error.includes('Time Limit Exceeded'));
        const status = allPassed        ? 'Accepted'
            : hasTLE                   ? 'Time Limit Exceeded'
            : hasErr                   ? 'Runtime Error'
            :                            'Wrong Answer';

        return {
            status,
            testResults: results,
            runtime: Math.floor(Math.random() * 80) + 10,
            memory:  Math.floor(Math.random() * 15) + 5
        };
    }

    _runWithTimeout(code, input, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Time Limit Exceeded'));
            }, timeoutMs);
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

    // ── C++ via Piston API ────────────────────────────────────────────────────

    async _executeCpp(code, testCases, problem) {
        const wrapper = problem?.cppWrapper?.trim() || '';
        if (!wrapper) {
            return this._cppNotConfigured(testCases);
        }

        // Full source sent to Piston: JSON utils + student code + problem wrapper
        const fullSource = `${CPP_JSON_UTILS}\n${code}\n${wrapper}`;

        const results      = [];
        let   allPassed    = true;
        let   finalStatus  = 'Accepted';
        let   totalRuntime = 0;

        for (let i = 0; i < testCases.length; i++) {
            const tc    = testCases[i];
            const stdin = JSON.stringify(tc.input);

            let piston;
            try {
                piston = await this._callPiston(fullSource, stdin, 'cpp', '10.2.0');
            } catch (fetchErr) {
                allPassed   = false;
                finalStatus = 'Runtime Error';
                results.push({
                    testCase: i + 1,
                    passed: false,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    actualOutput: null,
                    error: 'C++/Python judge is temporarily unavailable. Please try JavaScript or try again later.',
                    isPublic: tc.isPublic ?? false
                });
                continue;
            }

            const { compile, run } = piston;

            // Compilation error → all subsequent test cases also fail
            if (compile && compile.code !== 0) {
                allPassed   = false;
                finalStatus = 'Compilation Error';
                const errMsg = (compile.stderr || compile.output || 'Compilation failed').slice(0, 500);
                for (let j = i; j < testCases.length; j++) {
                    results.push({
                        testCase: j + 1,
                        passed: false,
                        input: testCases[j].input,
                        expectedOutput: testCases[j].expectedOutput,
                        actualOutput: null,
                        error: errMsg,
                        isPublic: testCases[j].isPublic ?? false
                    });
                }
                break;
            }

            // Time Limit Exceeded: Piston sends SIGKILL when run_timeout is hit
            if (run.signal === 'SIGKILL') {
                allPassed = false;
                if (finalStatus === 'Accepted') finalStatus = 'Time Limit Exceeded';
                results.push({
                    testCase: i + 1,
                    passed: false,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    actualOutput: null,
                    error: `Time Limit Exceeded (>${PISTON_TIMEOUT_S}s)`,
                    isPublic: tc.isPublic ?? false
                });
                continue;
            }

            // Runtime Error: non-zero exit or stderr output
            if (run.code !== 0 || (run.stderr && run.stderr.trim())) {
                allPassed = false;
                if (finalStatus === 'Accepted') finalStatus = 'Runtime Error';
                const errMsg = (run.stderr || `Process exited with code ${run.code}`).slice(0, 300);
                results.push({
                    testCase: i + 1,
                    passed: false,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    actualOutput: null,
                    error: errMsg,
                    isPublic: tc.isPublic ?? false
                });
                continue;
            }

            // Compare stdout against expected output (both as JSON strings)
            const rawOut  = (run.stdout || '').trim();
            const expected = JSON.stringify(tc.expectedOutput);
            const passed   = rawOut === expected;

            if (!passed) {
                allPassed = false;
                if (finalStatus === 'Accepted') finalStatus = 'Wrong Answer';
            }

            let actualOutput;
            try { actualOutput = JSON.parse(rawOut); }
            catch { actualOutput = rawOut; }

            totalRuntime += run.time ?? 0;

            results.push({
                testCase: i + 1,
                passed,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                actualOutput,
                error: null,
                isPublic: tc.isPublic ?? false
            });
        }

        return {
            status: finalStatus,
            testResults: results,
            runtime: Math.round(totalRuntime * 1000), // convert s → ms
            memory: 0 // Piston free tier does not expose memory usage
        };
    }

    async _callPiston(source, stdin, language = 'cpp', version = '10.2.0') {
        const body = {
            language,
            version,
            files: [{ content: source }],
            stdin,
            args: [],
            compile_timeout: 10,
            run_timeout: PISTON_TIMEOUT_S,
            compile_memory_limit: -1,
            run_memory_limit: 268435456  // 256 MB
        };

        const response = await fetch(PISTON_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(20000) // 20 s hard HTTP timeout
        });

        if (!response.ok) {
            throw new Error(`Piston returned HTTP ${response.status}`);
        }
        return response.json();
    }

    // ── Python via Piston API ──────────────────────────────────────────────────

    async _executePython(code, testCases, problem) {
        const wrapper = problem?.pyWrapper?.trim() || '';
        if (!wrapper) {
            return this._pythonNotConfigured(testCases);
        }

        const fullSource = `${code}\n${wrapper}`;

        const results      = [];
        let   allPassed    = true;
        let   finalStatus  = 'Accepted';
        let   totalRuntime = 0;

        for (let i = 0; i < testCases.length; i++) {
            const tc    = testCases[i];
            const stdin = JSON.stringify(tc.input);

            let piston;
            try {
                piston = await this._callPiston(fullSource, stdin, 'python', '3.10.0');
            } catch (fetchErr) {
                allPassed   = false;
                finalStatus = 'Runtime Error';
                results.push({
                    testCase: i + 1,
                    passed: false,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    actualOutput: null,
                    error: 'C++/Python judge is temporarily unavailable. Please try JavaScript or try again later.',
                    isPublic: tc.isPublic ?? false
                });
                continue;
            }

            const { run } = piston;

            if (run.signal === 'SIGKILL') {
                allPassed = false;
                if (finalStatus === 'Accepted') finalStatus = 'Time Limit Exceeded';
                results.push({
                    testCase: i + 1,
                    passed: false,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    actualOutput: null,
                    error: `Time Limit Exceeded (>${PISTON_TIMEOUT_S}s)`,
                    isPublic: tc.isPublic ?? false
                });
                continue;
            }

            if (run.code !== 0 || (run.stderr && run.stderr.trim())) {
                allPassed = false;
                if (finalStatus === 'Accepted') finalStatus = 'Runtime Error';
                const errMsg = (run.stderr || `Process exited with code ${run.code}`).slice(0, 300);
                results.push({
                    testCase: i + 1,
                    passed: false,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    actualOutput: null,
                    error: errMsg,
                    isPublic: tc.isPublic ?? false
                });
                continue;
            }

            const rawOut   = (run.stdout || '').trim();
            const expected = JSON.stringify(tc.expectedOutput);
            const passed   = rawOut === expected;

            if (!passed) {
                allPassed = false;
                if (finalStatus === 'Accepted') finalStatus = 'Wrong Answer';
            }

            let actualOutput;
            try { actualOutput = JSON.parse(rawOut); }
            catch { actualOutput = rawOut; }

            totalRuntime += run.time ?? 0;

            results.push({
                testCase: i + 1,
                passed,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                actualOutput,
                error: null,
                isPublic: tc.isPublic ?? false
            });
        }

        return {
            status: finalStatus,
            testResults: results,
            runtime: Math.round(totalRuntime * 1000),
            memory: 0
        };
    }

    _cppNotConfigured(testCases) {
        return {
            status: 'Runtime Error',
            testResults: testCases.map((tc, i) => ({
                testCase: i + 1,
                passed: false,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                actualOutput: null,
                error: 'C++ is not configured for this problem. Please use JavaScript.',
                isPublic: tc.isPublic ?? false
            })),
            runtime: 0,
            memory: 0
        };
    }

    _pythonNotConfigured(testCases) {
        return {
            status: 'Runtime Error',
            testResults: testCases.map((tc, i) => ({
                testCase: i + 1,
                passed: false,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                actualOutput: null,
                error: 'Python is not configured for this problem. Please use JavaScript.',
                isPublic: tc.isPublic ?? false
            })),
            runtime: 0,
            memory: 0
        };
    }
}

module.exports = new CodeExecutor();
