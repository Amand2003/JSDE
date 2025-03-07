document.addEventListener('DOMContentLoaded', function () {
    const codeEditor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        mode: 'javascript',
        lineNumbers: true,
        theme: 'custom-theme',
        indentUnit: 4,
        tabSize: 4,
        matchBrackets: true,
        autoCloseBrackets: true,
        extraKeys: {
            'Ctrl-Enter': function (cm) {
                if (!isRunning) {
                    executeCode();
                }
            },
            'Cmd-Enter': function (cm) {
                if (!isRunning) {
                    executeCode();
                }
            },
            'Tab': function (cm) {
                const spaces = Array(cm.getOption('indentUnit') + 1).join(' ');
                cm.replaceSelection(spaces);
            }
        }
    });

    // Ensure CodeMirror fills its container
    codeEditor.setSize(null, '100%');

    const runButton = document.getElementById('run-button');
    const consoleOutput = document.getElementById('console-output');
    const errorBadge = document.getElementById('error-badge');

    let isRunning = false;
    let originalConsoleLog;
    let logBuffer = [];

    function extractLineNumber(errorStack) {
        const lineMatch = errorStack.match(/<anonymous>:(\d+):(\d+)/);
        if (lineMatch && lineMatch[1]) {
            return parseInt(lineMatch[1], 10);
        }
        return null;
    }

    function updateConsoleOutput() {
        if (logBuffer.length > 0) {
            consoleOutput.innerHTML = `<div class="output-text">${logBuffer.join('\n')}</div>`;
        }
    }

    function setupConsoleOverride() {
        if (!originalConsoleLog) {
            originalConsoleLog = console.log;
        }

        console.log = function (...args) {
            const logMessage = args.map(arg => {
                if (typeof arg === 'object' && arg !== null) {
                    // Properly stringify objects for display
                    return JSON.stringify(arg, null, 2);
                } else {
                    return String(arg);
                }
            }).join(' ');

            logBuffer.push(logMessage);
            updateConsoleOutput();

            originalConsoleLog.apply(console, args);
        };
    }

    function executeCode() {
        isRunning = true;
        consoleOutput.innerHTML = '';
        errorBadge.style.display = 'none';
        runButton.textContent = 'Running...';
        runButton.disabled = true;

        logBuffer = [];

        setupConsoleOverride();

        setTimeout(() => {
            try {
                const result = eval(codeEditor.getValue()); // Use getValue() to get the content from CodeMirror

                if (result !== undefined) {
                    // Handle objects properly in the result
                    if (typeof result === 'object' && result !== null) {
                        logBuffer.push(JSON.stringify(result, null, 2));
                    } else {
                        logBuffer.push(String(result));
                    }
                    updateConsoleOutput();
                }

                if (result && typeof result.then === 'function') {
                    logBuffer.push(`Note: Async operation detected. Watch for additional output...`);
                    updateConsoleOutput();
                } else {
                    if (logBuffer.length === 0) {
                        consoleOutput.innerHTML = `<div class="output-text"></div>`;
                    }

                    isRunning = false;
                    runButton.textContent = 'Run Code ▶';
                    runButton.disabled = false;
                }
            } catch (err) {
                const errorMessage = `${err.name}: ${err.message}\n${err.stack || ''}`;
                consoleOutput.innerHTML = `<div class="error-text">Error Detected:\n${errorMessage}</div>`;

                const lineNumber = extractLineNumber(err.stack || '');
                if (lineNumber !== null) {
                    errorBadge.textContent = `Error on line ${lineNumber}`;
                    errorBadge.style.display = 'block';
                }

                isRunning = false;
                runButton.textContent = 'Run Code ▶';
                runButton.disabled = false;
            }
        }, 10);
    }

    const observer = new MutationObserver((mutations) => {
        if (!isRunning) {
            return;
        }

        setTimeout(() => {
            if (isRunning) {
                runButton.textContent = 'Run Code ▶';
                runButton.disabled = false;
                isRunning = false;
            }
        }, 10000);
    });

    observer.observe(consoleOutput, { childList: true, subtree: true });

    // Add event listener to the run button
    runButton.addEventListener('click', executeCode);

    // Add a reset button to restore the original console
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset Console';
    resetButton.className = 'run-button';
    resetButton.style.marginLeft = '0.5rem';
    resetButton.style.backgroundColor = '#6b7280';

    resetButton.addEventListener('click', function () {
        if (originalConsoleLog) {
            console.log = originalConsoleLog;
        }
        isRunning = false;
        runButton.disabled = false;
        runButton.textContent = 'Run Code ▶';
        logBuffer = [];
        consoleOutput.innerHTML = '<div class="placeholder-text">Console has been reset...</div>';
    });

    document.querySelector('.panel-header').appendChild(resetButton);
});