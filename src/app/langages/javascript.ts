import {noop} from "../services/utils";
import {UNDEFINED_CHECKER_RESULT} from "../constants";
import {CodeMirrorTheme, ILanguage, TestCallbacks} from "../types";
import {EditorView} from "@codemirror/basic-setup";
import {tags, HighlightStyle} from "@codemirror/highlight";
import {javascript} from "@codemirror/lang-javascript";
import {endTestTemplate, startTestTemplate} from "./common";


/**
 * JAVASCRIPT SUPPORT IS CURRENTLY IN BETA - it can be run, but can't be checked
 */

let checkerResult: string | undefined = undefined;

interface FakeWindow {
    prompt: (prompt: string) => Promise<string>;
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
const runCode = (code: string, printOutput: (output: string) => void, handleInput: () => Promise<string>, options= {}, testCallbacks?: TestCallbacks) => new Promise<string>((resolve, reject) => {

    let finalOutput = "";
    let outputSinceLastTest = "";

    function startTest(inputs: any, regex: any) {
        startTestTemplate(inputs, regex, arguments.length,
            (is) => {
                if (Array.isArray(is) || undefined === is) {
                    return is;
                } else {
                    throw new IsaacError("Test inputs must be a list or undefined");
                }
            }, (re) => {
                if (typeof re === "string" || undefined === re) {
                    return re;
                } else {
                    throw new IsaacError("Regex must be a string or undefined");
                }
            }, () => {
                throw new IsaacError("name 'startTest' is not defined - nice try!");
            }, () => {
                throw new IsaacError("startTest takes two arguments, a list of input strings and a regex string - either can also be set to undefined");
            }, testCallbacks);
    }

    function endTest(testSuccess: any, testFail: any, allInputsMustBeUsed: any) {
        endTestTemplate(testSuccess, testFail, allInputsMustBeUsed, arguments.length,
            (message) => {
                if (typeof message === "string" || undefined === message) {
                    return message;
                } else {
                    throw new IsaacError("'Test success' feedback must be a string or undefined");
                }
            }, (message) => {
                if (typeof message === "string" || undefined === message) {
                    return message;
                } else {
                    throw new IsaacError("'Test failed' feedback must be a string or undefined");
                }
            }, (uai) => {
                if (typeof uai === "boolean" || undefined === uai) {
                    return uai;
                } else {
                    throw new IsaacError("'allInputsMustBeUsed' must be a boolean or undefined");
                }
            }, () => {
                throw new Error("name 'endTest' is not defined - nice try!");
            }, () => {
                throw new IsaacError (
                        "endTest takes three arguments. These are two message strings - one to show on test pass and " +
                        "one to show on test fail, and the third is a boolean deciding whether all test inputs given need to " +
                        "be used or not. The first two arguments can also be set to undefined."
                );
            }, outputSinceLastTest, testCallbacks);
        // If the test fails, an error is thrown. Otherwise, we need to clear outputSinceLastTest
        outputSinceLastTest = "";
    }

    // TODO this doesn't work, and crashes the iframe. Maybe the best way is to provide a synchronous testInputHandler, and
    //  just let the user get inputs via the prompt message box.
    function promptFunc(promptText: any, defaultText?: undefined) {
        if (defaultText !== undefined) {
            throw new IsaacError("Sorry, the Isaac implementation of `prompt` doesn't support default text.");
        }
        printOutput(promptText);

        let ret = undefined;
        setImmediate(async () => {
            ret = await handleInput();
        }, []);
        // Block until ret is populated - TODO breaks everything
        while (ret === undefined);

        return ret;
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

    //const parsedCode = Parser.parse(code, {ecmaVersion: 2020}); // using Parser from acorn

    return (async () => {
        eval(code);
        // if (testCallbacks) {
        //     throw new IsaacError("JavaScript testing is not implemented yet, sorry!");
        // } else {
        //
        // }
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
            } else {
                reject({error: err.toString()});
            }
        });
});

function runSetupCode(printOutput: (output: string) => void, handleInput: () => Promise<string>, setupCode?: string, testCallbacks?: TestCallbacks) {
    if (setupCode) {
        return runCode(setupCode, printOutput, handleInput, {}, testCallbacks);
    } else {
        return new Promise<string>(resolve => resolve(""));
    }
}

function runTests(output: string, handleInput: () => Promise<string>, testCode?: string, testCallbacks?: TestCallbacks) {
    if (testCode) {
        return runCode(testCode, noop, handleInput, {}, testCallbacks).then((testOutput) => {
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
    requiresBundledCode: true
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