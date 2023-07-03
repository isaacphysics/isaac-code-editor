import {noop} from "../services/utils";
import {UNDEFINED_CHECKER_RESULT} from "../constants";
import {CodeMirrorTheme, ILanguage, TestCallbacks} from "../types";
import {EditorView} from "@codemirror/basic-setup";
import {tags, HighlightStyle} from "@codemirror/highlight";
import {javascript} from "@codemirror/lang-javascript";

/**
 * JAVASCRIPT SUPPORT IS CURRENTLY IN BETA
 */

let checkerResult: string | undefined = undefined;

interface FakeWindow {
    prompt: (message: string) => string,
    alert: (text: string) => void;
}

const globalWindow = window;
const windowProxyHandler: ProxyHandler<FakeWindow> = {
    get: function(target, prop, receiver) {
        if (!["prompt", "alert"].includes(prop as string)) {
            // @ts-ignore
            return globalWindow[prop];
        }
        return Reflect.get(target, prop, receiver);
    }
};

class IsaacError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = "IsaacError"; // (different names for different built-in error classes)
    }
}

// Run a snippet of javascript code
const runCode = (code: string, printOutput: (output: string) => void, handleInput: () => (Promise<string> | string), shouldStopExecution: (stop: boolean) => boolean, options= {}, testCallbacks?: TestCallbacks) => new Promise<string>((resolve, reject) => {

    let finalOutput = "";
    let outputSinceLastTest = "";

    function startTest(inputs: any, regex: any) {
        outputSinceLastTest = "";
        const args = arguments.length;
        if (undefined === testCallbacks) {
            return; // since the setup code is bundled with the students code, we need to allow this to be run even if not testing
        }
        if (0 > args || args > 2) {
            throw new IsaacError("startTest takes two arguments, a list of input strings and a regex string - either can also be set to undefined");
        }
        testCallbacks.setTestInputs(args < 1 ? undefined : ((is) => {
            if (Array.isArray(is) || undefined === is) {
                return is;
            } else {
                throw new IsaacError("Test inputs must be a list or undefined");
            }
        })(inputs));
        testCallbacks.setTestRegex(args < 2 ? undefined : ((re) => {
            if (typeof re === "string" || undefined === re) {
                return re;
            } else {
                throw new IsaacError("Regex must be a string or undefined");
            }
        })(regex));
    }

    function getTestOutput() {
        if (undefined === testCallbacks) {
            throw new IsaacError("name 'getTestOutput' is not defined - nice try!");
        }
        return outputSinceLastTest;
    }

    function endTest(testSuccess: any, testFail: any, allInputsMustBeUsed: any) {
        const args = arguments.length;
        if (undefined === testCallbacks) {
            throw new IsaacError("name 'endTest' is not defined - nice try!");
        }
        if (0 > args || args > 3) {
            throw new IsaacError (
                "endTest takes three arguments. These are two message strings - one to show on test pass and " +
                "one to show on test fail, and the third is a boolean deciding whether all test inputs given need to " +
                "be used or not. The first two arguments can also be set to undefined."
            );
        }
        let successMessage = args < 1 ? undefined : ((message) => {
            if (typeof message === "string" || undefined === message) {
                return message;
            } else {
                throw new IsaacError("'Test success' feedback must be a string or undefined");
            }
        })(testSuccess);
        let failMessage = args < 2 ? undefined : ((message) => {
            if (typeof message === "string" || undefined === message) {
                return message;
            } else {
                throw new IsaacError("'Test failed' feedback must be a string or undefined");
            }
        })(testFail);
        let useAllInputs = args < 3 ? undefined : ((uai) => {
            if (typeof uai === "boolean" || undefined === uai) {
                return uai;
            } else {
                throw new IsaacError("'allInputsMustBeUsed' must be a boolean or undefined");
            }
        })(allInputsMustBeUsed);

        // Run test - if the test fails, an error is thrown.
        const error = testCallbacks.runCurrentTest(outputSinceLastTest, useAllInputs, successMessage, failMessage);
        if (error) {
            throw error;
        }
    }

    function promptFunc(promptText: any, defaultText?: undefined) {
        if (defaultText !== undefined) {
            throw new IsaacError("Sorry, the Isaac implementation of `prompt` doesn't support default text.");
        }

        // If the input from `handleInput` is just a string, then we can use it.
        const input = handleInput();
        console.log(input);
        if (typeof input == "string") {
            return input;
        } else {
            return globalWindow.prompt(promptText) ?? "";
        }
    }

    function alertFunc(message: any) {
        printOutput(message.toString());
        finalOutput += message;
        outputSinceLastTest += message;
    }

    // Shadow globally scoped names that we want to override.
    // Using proxies to redirect un-shadowed window and console commands to the actual global objects
    const window = new Proxy({
        prompt: promptFunc,
        alert: alertFunc
    }, windowProxyHandler);

    const prompt = promptFunc;
    const alert = alertFunc;

    // TODO allow stopping execution with shouldStopExecution

    return (async () => {
        eval(code);
    })().then(() => {
            resolve(finalOutput);
        }).catch((err: any) => {
            if (err instanceof Error) {
                switch (err.name) {
                    case "IsaacError":
                        reject({error: err.message, isContentError: true});
                        break;
                    case "TestError":
                        reject({error: err.message, isTestError: true});
                        break;
                    default:
                        reject({error: err.toString()});
                }
            } else if (err.hasOwnProperty("error")) {
                reject(err);
            } else {
                reject({error: err.toString()});
            }
        });
});

function runSetupCode(printOutput: (output: string) => void, handleInput: () => (Promise<string> | string), setupCode?: string, testCallbacks?: TestCallbacks) {
    if (setupCode) {
        return runCode(setupCode, printOutput, handleInput, () => false, {}, testCallbacks);
    } else {
        return new Promise<string>(resolve => resolve(""));
    }
}

function runTests(output: string, handleInput: () => (Promise<string> | string), shouldStopExecution: (stop: boolean) => boolean, testCode?: string, testCallbacks?: TestCallbacks) {
    if (testCode) {
        return runCode(testCode, noop, handleInput, shouldStopExecution, {}, testCallbacks).then((testOutput) => {
            // Do something with output + testOutput maybe?
            return checkerResult ?? UNDEFINED_CHECKER_RESULT;
        });
    } else {
        return new Promise<string>(() => UNDEFINED_CHECKER_RESULT);
    }
}

export const javaScriptLanguage: ILanguage = {
    runCode: runCode,
    runSetupCode: runSetupCode,
    runTests: runTests,
    wrapInMain: (code, doChecks) => "function main() {\n" + code.split("\n").map(s => "\t" + s).join("\n") + "\n}\n" + (!doChecks ? "main()\n" : ""),
    testingLibrary: `
function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

class TestError extends Error {
  constructor(message) {
    super(message);
  }
}
        `,
    requiresBundledCode: true,
    syncTestInputHander: true,
}

// --- JavaScript theme ---

export const javaScriptTheme = EditorView.theme({
    ".cm-gutters": {
        backgroundColor: "#FFFFFF"
    },
    ".cm-line": {
        paddingLeft: "7px"
    },
    "&": {
        color: "#545454"
    },
});

export const javaScriptHighlightStyle = HighlightStyle.define([
    {tag: tags.docString, color: "#008000"},
    {tag: tags.comment, color: "#696969"},
    {tag: tags.definition, color: "#007faa"},
    {tag: tags.function(tags.definition(tags.variableName)), color: "#007faa"},
    {tag: tags.keyword, color: "#7928a1"},
    {tag: tags.number, color: "#aa5d00"},
    {tag: tags.bool, color: "#aa5d00"},
    {tag: tags.lineComment, color: "#696969"},
    {tag: tags.string, color: "#008000"},
]);

export const javaScriptCodeMirrorTheme: CodeMirrorTheme = {
    languageSupport: javascript(),
    theme: javaScriptTheme,
    highlightStyle: javaScriptHighlightStyle
}