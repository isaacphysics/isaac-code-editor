import {noop} from "../services/utils";
import {UNDEFINED_CHECKER_RESULT} from "../constants";
import {ICodeMirrorTheme, ILanguage, TestCallbacks} from "../types";
import {EditorView} from "@codemirror/basic-setup";
import {tags, HighlightStyle} from "@codemirror/highlight";
import {javascript} from "@codemirror/lang-javascript";
import {Parser} from "acorn";

let checkerResult: string | undefined = undefined;

// Run a snippet of javascript code
const runCode = (code: string, printOutput: (output: string) => void, handleInput: () => Promise<string>, options= {}, testCallbacks?: TestCallbacks) => new Promise<string>((resolve, reject) => {

    let finalOutput = "";
    let outputSinceLastTest = "";

    function startTest(inputs: any, regex: any) {
        console.log("IN START TEST")
        if (undefined === testCallbacks) {
            throw {error: "name 'startTest' is not defined - nice try!"};
        }
        if (arguments.length !== 2) {
            throw {error: "startTest takes two arguments, a list of input strings and a regex string - either can also be set to None"};
        }
        if (Array.isArray(inputs)) {
            testCallbacks.setTestInputs(inputs);
        } else if (inputs !== undefined) {
            throw {error: "Test inputs must be a list or undefined"};
        } else {
            testCallbacks.setTestInputs(undefined);
        }
        if (typeof regex === "string") {
            testCallbacks.setTestRegex(regex);
        } else if (regex !== undefined) {
            throw {error: "Regex must be a string or None"};
        } else {
            testCallbacks.setTestRegex(undefined);
        }
    }

    function endTest(testSuccess: any, testFail: any, allInputsMustBeUsed: any) {
        console.log("IN END TEST")
        if (undefined === testCallbacks) {
            throw {error: "name 'endTest' is not defined - nice try!"};
        }

        let successMessage = undefined;
        let failMessage = undefined;
        let useAllInputs = true;

        if (arguments.length !== 3) {
            throw {error: "endTest takes three arguments. These are two message strings - one to show on test pass and " +
                    "one to show on test fail, and the third is a boolean deciding whether all test inputs given need to " +
                    "be used or not. The first two arguments can also be set to undefined."};
        }
        if (typeof testSuccess === "string") {
            successMessage = testSuccess;
        } else if (testSuccess !== undefined) {
            throw {error: "'Test success' feedback must be a string or undefined"};
        }
        if (typeof testFail === "string") {
            failMessage = testFail;
        } else if (testFail !== undefined) {
            throw {error: "'Test failed' feedback must be a string or undefined"};
        }
        if (typeof allInputsMustBeUsed === "boolean") {
            useAllInputs = allInputsMustBeUsed;
        } else {
            throw {error: "'allInputsMustBeUsed' must be a boolean"};
        }

        testCallbacks.runCurrentTest(outputSinceLastTest, useAllInputs, successMessage, failMessage)
            .then(() => {
                outputSinceLastTest = ""
            })
            .catch(reject);
    }

    // function prompt(text: any, defaultInput?: any): string {
    //     console.log("IN PROMPT")
    //     if (typeof text !== "string" && text !== undefined) {
    //         throw {error: "'text' must be a string or undefined"};
    //     }
    //     if (typeof defaultInput !== "string" && defaultInput !== undefined) {
    //         throw {error: "'defaultInput' must be a string or undefined"};
    //     }
    //     // return new Promise((resolve, reject) => {
    //     //     //const inputStartTime = Date.now();
    //     //     return .then((input) => {
    //     //         // Pause exec limit here (if implementing)
    //     //         resolve(input || defaultInput);
    //     //     }).catch(reject);
    //     // });
    //     return handleInput();
    // }
    //
    // function alert(message: any) {
    //     console.log("IN ALERT")
    //     if (typeof message !== "string") {
    //         throw {error: "'message' must be a string"};
    //     }
    //     printOutput(message);
    //     finalOutput += message;
    //     outputSinceLastTest += message;
    // }

    const parsedCode = Parser.parse(code, {ecmaVersion: 2020});

    console.log(parsedCode);

    eval(code);

    resolve(finalOutput);

    // return
    //     .then(() => {
    //         resolve(finalOutput);
    //     })
    //     .catch((reason: any) => {
    //         reject(reason)
    //     });
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
    testErrorSubclass:
        "class TestError extends Error {\n" +
        "  constructor(message) {\n" +
        "    super(message);\n" +
        "  }\n" +
        "}"
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

export const javaScriptCodeMirrorTheme: ICodeMirrorTheme = {
    languageSupport: javascript(),
    theme: javaScriptTheme,
    highlightStyle: javaScriptHighlightStyle
}