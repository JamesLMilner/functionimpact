(function() {

    // DOM Elements
    const code = document.getElementById("code");
    const error = document.getElementById("error");
    const run = document.getElementById("run");
    const parameters = document.getElementById("parameters");
    const params = document.getElementById("params");
    const output = document.getElementById("output");
    const time = document.getElementById("time");
    const warnings = document.getElementById("warnings");

    // DOM Elements - Warnings
    const frames = document.getElementById("frames");
    const perceptible = document.getElementById("perceptible");
    const perceptibleLong = document.getElementById("perceptibleLong");
    const webworkerRecommendable = document.getElementById("webworkerRecommendable");
    const webworker = document.getElementById("webworker");
    const dom = document.getElementById("dom");
    const ric = document.getElementById("ric");
    const longDom = document.getElementById("longDom");
    const transfer = document.getElementById("transfer");
    const allWarnings = [
        frames, perceptible, perceptibleLong, webworkerRecommendable, webworker,
        dom, ric, longDom, transfer
    ];

    // DOM Elements - Inner warning elements
    const skipped = document.getElementById("skipped");
    const transferTime = document.getElementById("transferTime");

    const worker = new Worker('worker.js');
    let runCount = 0;

    // Event handlers
    run.addEventListener("click", handleRun);
    code.addEventListener("input", handleInput);

    let result;

    code.value = getExample(); // Set example
    handleInput(); // Run initially before key strokes

    function handleInput() {
        const codeStr = code.value;
        parameters.style.display = 'initial';

        try {
            result = esprima.parseScript(codeStr);
            error.innerText = "";
            error.style.padding = "0px";
        } catch (e) {
            console.error(e); // Debugging
            error.innerText = "Error: " + e.description;
            error.style.padding = "10px";
            parameters.style.display = 'none';
            clearParams();
            return;
        }

        const hasBody = result && result.body && result.body.length
        const isFunction = result.body[0].type === "FunctionDeclaration";

        if (hasBody && isFunction) {
            clearParams();
            const func = result.body[0];
            if (func.params) {
                func.params.forEach(createInput);
                clearError();
            }
        } else {
            error.innerText = "The first declaration in the code should be a function";
            error.style.padding = "10px";
            parameters.style.display = 'none';
            clearParams();
        }
    }

    // TODO: Make this more robust, possibly via esprima?
    function touchesDOM(codeStr) {
        return codeStr.indexOf("document.") !== -1
    }

    // TODO: Make this more robust, possibly via esprima?
    function usesPromises(codeStr) {
        return codeStr.indexOf(".resolve") !== -1 || codeStr.indexOf(".reject") !== -1
    }

    function showWarning(domEl) {
        domEl.style.display = 'list-item';
    }

    function handleRun() {
        clearWarnings();
        runCount++;

        const timeGreen = "#a9fda7";
        const timeOrange = "#ffeb81";
        const timeRed = "#ff8181";

        const codeStr = cleanCode();
        const args = getArgs();
        const funcName = getFunctionName();
        eval.call(window, codeStr);
        const func = window[funcName];
        
        const start = performance.now();
        const returnVal = func.apply(null, args);
        const end = performance.now();

        const timeTaken = (end - start).toFixed(0);
        const framesSkipped = parseInt(timeTaken / 16);

        time.innerText = timeTaken + "ms";
        let hasWarnings = false;
        time.style.background = timeGreen;

        if (framesSkipped > 0) {
            hasWarnings = true;
            skipped.innerText = framesSkipped + " frames";
            showWarning(frames);
        }

        if (timeTaken > 0 && timeTaken < 50) {
            // functions that use reject and resolve promises shouldnt 
            // be used in rIC because they will stack up the microtask queue
            if (!usesPromises(codeStr)) {
                showWarning(ric);
            }
        }
        
        if (timeTaken >= 50) {
            time.style.background = timeOrange
            const domTouch = touchesDOM(codeStr);
            hasWarnings = true;

            getWorkerTiming(args, runCount).then((time) => {
                transferTime.innerText = time + "ms";
            });

            if (timeTaken < 100) {
                showWarning(perceptible);
                if (!domTouch) {
                    showWarning(webworker);
                }
            }
           
            if (timeTaken >= 100) {
                if (!domTouch) {
                    showWarning(webworkerRecommendable);
                } else {
                    showWarning(longDom);
                }
                showWarning(perceptibleLong);
                time.style.background = timeRed
            }

            if (domTouch) {
                showWarning(dom);
            }
            
        }
        if (hasWarnings) {
            warnings.style.display = "block";
        } else {
            warnings.style.display = "none";
        }

        output.innerText = returnVal;
    }

    function getWorkerTiming(args, runNumber) {

        return new Promise((resolve, reject) => {
            // Cost of sending data to the web worker
            const sendStart = performance.now();
            worker.postMessage({data: args});
            const sendEnd = performance.now();
        
            worker.onmessage = (e) => {
                const onmessageTime = Date.now() - e.data.now;
                if (runNumber === runCount) {
                    showWarning(transfer);
                    const time = (onmessageTime + (sendEnd - sendStart));
                    resolve(time);
                }
            }
        });

    }

    function cleanCode() {
        const codeStr = code.value.trim();
        if (codeStr[codeStr.length - 1] === ";") {
            codeStr = codeStr.slice(0, -1);
        }
        return codeStr;
    }

    function getFunctionName() {
        return result && result.body[0] && result.body[0].id && result.body[0].id.name;
    }

    function getArgs() {
        values = [];
        const paramInputs = document.querySelectorAll("#params input");
        for (var i = 0; i < paramInputs.length; i++) {
            const arg = paramInputs[i].value;
            values.push(parseArgs(arg));
        }
        return values;
    }
    
    function parseArgs(arg) {
        const result = esprima.parse(arg);
        if (result && result.body && result.body[0]) {
            const parsedArg = result.body[0];
            if (parsedArg.type === "ExpressionStatement") {
                if (parsedArg.expression.type === "ArrayExpression") {
                    return JSON.parse(arg); // Array
                }
                if (parsedArg.expression.type === "Literal") {
                    return parsedArg.expression.value; // String, Boolean, Number
                }
            }
            if (parsedArg.type === "BlockStatement") {
                return JSON.parse(arg); // Object
            }
        }
    }

    function createInput(param) {
        const inputContainer = document.createElement("div");
        inputContainer.className = "parameter";
        const label = document.createElement("label");
        label.textContent = param.name;
        const input = document.createElement("input");
        inputContainer.appendChild(label);
        inputContainer.appendChild(input);
        params.appendChild(inputContainer);
    }

    function clearWarnings() {
        allWarnings.forEach((w) => w.style.display = 'none');
    }
    
    function clearError() {
        error.innerText = "";
    }
    
    function clearParams() {
        document.getElementById("params").innerHTML = "";
    }

    function getExample() {
        return `
        function pi(precision) {
            let insideCircle = 0;

            for(let i = 0; i < precision; i++) {
                const x = 2 * Math.random() - 1;
                const y = 2 * Math.random() - 1;
                if (x * x + y * y < 1) {
                    insideCircle++;
                }
            }
        
            return 4 * insideCircle / precision;
        }
        `
    }
    
})();
