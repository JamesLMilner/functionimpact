

function main() {
    const code = document.getElementById("code");
    const error = document.getElementById("error");
    const run = document.getElementById("run");
    const params = document.getElementById("params");
    const output = document.getElementById("output");
    const time = document.getElementById("time");
    const frames = document.getElementById("frames");
    const perceptible = document.getElementById("perceptible");
    const warnings = document.getElementById("warnings");
    const webworker = document.getElementById("webworker");
    const dom = document.getElementById("dom");

    let result;

    code.value = getExample();
    handleInput();

    run.addEventListener("click", handleRun);
    code.addEventListener("input", handleInput);

    function handleInput() {
        const codeStr = code.value;

        try {
            result = esprima.parseScript(codeStr);
            error.innerText = "";
            error.style.padding = "0px";
        } catch (e) {
            console.error(e); // Debugging
            error.innerText = "Error: " + e.description;
            error.style.padding = "10px";
            clearParams();
            return;
        }

        const hasBody = result && result.body && result.body.length
        const isFunction = result.body[0].type === "FunctionDeclaration";
        console.log(result);
        if (hasBody && isFunction) {
            clearParams();
            const func = result.body[0];
            if (func.params) {
                func.params.forEach(createInput);
                clearError();
            }
        } else {
            error.innerText = "The code should be a function declaration";
            clearParams();
        }
    }

    function handleRun() {
        frames.style.display = 'none';
        perceptible.style.display = 'none';
        webworker.style.display = 'none';
        dom.style.display = 'none';

        const codeStr = cleanCode();
        const args = getArgs();
        const funcName = getFunctionName();
        eval.call(window, `${codeStr}`);
        const func = window[funcName];
        
        const start = performance.now();
        const returnVal = func.apply(null, args);
        const end = performance.now();

        const timeTaken = (end - start).toFixed(0);
        const framesSkipped = parseInt(timeTaken / 16);

        time.innerText = timeTaken + "ms";
        let hasWarnings = false;
        time.style.background = "#a9fda7";

        if (framesSkipped > 0) {
            hasWarnings = true;
            frames.innerHTML = "Approximately <strong>" + framesSkipped + " frames</strong> would be skipped by this blocking JavaScript";
            frames.style.display = 'list-item';
        }
        
        if (timeTaken >= 50) {
            
            hasWarnings = true;
            perceptible.innerHTML = "If your main thread is unavailable for 50ms or more, <strong>this function might not leave enough time to handle user input </strong> before a perceptible delay occurs"
            time.style.background = "#ffeb81"
            
            webworker.innerHTML = "It may be worth converting this function into a Web Worker";
            webworker.style.display = 'list-item';

            if (timeTaken >= 100) {
                webworker.innerHTML = "It is recommendable to turn this function into a Web Worker";
                perceptible.innerHTML = "delays of longer than <strong>100ms are perceptible to users!</strong>";
                time.style.background = "#ff8181"
            }

            if (codeStr.indexOf("document.") !== -1) {
                dom.innerHTML = 'The code looks as if it <strong>touches the DOM which will not run in a Web Worker>/strong>; consider refactoring it to make it runnable';
                dom.style.display = 'list-item';
            }

            perceptible.style.display = 'list-item';

        }
        if (hasWarnings) {
            warnings.style.display = "block";
        } else {
            warnings.style.display = "none";
        }

        output.innerText = returnVal;
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
                    return JSON.parse(arg);
                }
                if (parsedArg.expression.type === "Literal") {
                    return parsedArg.expression.value;
                }
            }
            if (parsedArg.type === "BlockStatement") {
                return JSON.parse(arg);
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
    
}


main();
