// @ts-ignore skulpt doesn't have typings
import Sk from "skulpt"
import {noop} from "../services/utils";
import {ERRORS, UNDEFINED_CHECKER_RESULT} from "../constants";
import {CodeMirrorTheme, ILanguage, TestCallbacks} from "../types";
import {EditorView} from "@codemirror/basic-setup";
import {tags, HighlightStyle} from "@codemirror/highlight";
import {python} from "@codemirror/lang-python";
import {endTestTemplate, startTestTemplate} from "./common";

// Transpile and run a snippet of python code
const runCode = (code: string, printOutput: (output: string) => void, handleInput: () => Promise<string>, skulptOptions= {}, testCallbacks?: TestCallbacks) => new Promise<string>((resolve, reject) => {

	let finalOutput = "";
	let outputSinceLastTest = "";

	function startTest(inputs: any, regex: any) {
		startTestTemplate(inputs, regex, arguments.length,
			(is) => {
				if (is instanceof Sk.builtin.list || is instanceof Sk.builtin.tuple) {
					return Sk.ffi.remapToJs(is);
				} else if (Sk.builtin.checkNone(is)) {
					return undefined;
				} else {
					throw {error: "Test inputs must be a list-like object or None"};
				}
			}, (re) => {
				if (Sk.builtin.checkString(re)) {
					return Sk.ffi.remapToJs(re);
				} else if (Sk.builtin.checkNone(re)) {
					return undefined;
				} else {
					throw {error: "Regex must be a string or None"};
				}
			}, () => {
				throw new Sk.builtin.NameError("name 'startTest' is not defined - nice try!");
			}, () => {
				throw {error: "startTest takes two arguments, a list of input strings and a regex string - either can also be set to None"}
			}, testCallbacks);
	}

	function endTest(testSuccess: any, testFail: any, allInputsMustBeUsed: any) {
		endTestTemplate(testSuccess, testFail, allInputsMustBeUsed, arguments.length,
			(message) => {
				if (Sk.builtin.checkString(message)) {
					return Sk.ffi.remapToJs(message);
				} else if (Sk.builtin.checkNone(message)) {
					return undefined;
				} else {
					throw {error: "'Test success' feedback must be a string or None"};
				}
			},(message) => {
				if (Sk.builtin.checkString(message)) {
					return Sk.ffi.remapToJs(message);
				} else if (Sk.builtin.checkNone(message)) {
					return undefined;
				} else {
					throw {error: "'Test failed' feedback must be a string or None"};
				}
			}, (uai) => {
				if (Sk.builtin.checkBool(uai)) {
					return Sk.ffi.remapToJs(uai);
				} else if (Sk.builtin.checkNone(uai)) {
					return undefined;
				} else {
					throw {error: "'allInputsMustBeUsed' must be a boolean or None"};
				}
			}, () => {
				throw new Sk.builtin.NameError("name 'endTest' is not defined - nice try!");
			}, () => {
				throw {error: "endTest takes three arguments. These are two message strings - one to show on test pass and " +
						"one to show on test fail, and the third is a boolean deciding whether all test inputs given need to " +
						"be used or not. The first two arguments can also be set to None."};
			}, outputSinceLastTest, testCallbacks);
		// If the test fails, an error is thrown. Otherwise, we need to clear outputSinceLastTest
		outputSinceLastTest = "";
	}

	function builtinRead(x: string) {
		if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
			throw new Error("File not found: '" + x + "'");
		return Sk.builtinFiles["files"][x];
	}

	// Make the custom test functions available in Python
	Sk.builtins = {
		...Sk.builtins,
		"startTest": startTest,
		"endTest": endTest
	};

	Sk.configure({
		output: (output: string) => {
			printOutput(output);
			finalOutput += output;
			outputSinceLastTest += output;
		},
		inputfun: () => new Promise((resolve, reject) => {
			const inputStartTime = Date.now();
			return handleInput().then((input) => {
				if (Sk.execLimit) {
					Sk.execLimit = Sk.execLimit + (Date.now() - inputStartTime);
				}
				resolve(input);
			}).catch(reject);
		}),
		read: builtinRead,
		killableWhile: true,
		killableFor: true,
		__future__: Sk.python3,
		...skulptOptions
	});
	return Sk.misceval.asyncToPromise(
		() => Sk.importMainWithBody("<stdin>", false, code, true)
	).then(() => {
		resolve(finalOutput);
	}).catch((err: any) => {
		switch(err.tp$name) {
			case ERRORS.TIME_LIMIT_ERROR:
				reject({error: "Your program took too long to execute! Are there any infinite loops?"});
				break;
			case ERRORS.EXTERNAL_ERROR:
				reject({error: err.nativeError.error, isTestError: err.nativeError.isTestError});
				break;
			case ERRORS.TEST_ERROR:
				reject({error: err.toString().slice(11), isTestError: true});
				break;
			default:
				reject({error: err.toString()});
		}
	});
});

function runSetupCode(printOutput: (output: string) => void, handleInput: () => Promise<string>, setupCode?: string, testCallbacks?: TestCallbacks) {
	if (setupCode) {
		return runCode(setupCode, printOutput, handleInput, {retainGlobals: true}, testCallbacks);
	} else {
		return new Promise<string>(resolve => resolve(""));
	}
}

function runTests(output: string, handleInput: () => Promise<string>, testCode?: string, testCallbacks?: TestCallbacks) {
	if (testCode) {
		return runCode(testCode, noop, handleInput, {retainGlobals: true}, testCallbacks).then((testOutput) => {
			// Do something with output + testOutput maybe?
			return Sk.globals["checkerResult"]?.v?.toString() ?? UNDEFINED_CHECKER_RESULT;
		});
	} else {
		return new Promise<string>(() => UNDEFINED_CHECKER_RESULT);
	}
}

export const pythonLanguage: ILanguage = {
	runCode: runCode,
	runSetupCode: runSetupCode,
	runTests: runTests,
	wrapInMain: (code, doChecks) => "def main():\n" + code.split("\n").map(s => "\t" + s).join("\n") + (!doChecks ? "\nmain()\n" : ""),
	testingLibrary: `
		class TestError(Exception):
		  pass
  		`,
	requiresBundledCode: false
}

// --- Python theme ---

export const pythonTheme = EditorView.theme({
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

export const pythonHighlightStyle = HighlightStyle.define([
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

export const pythonCodeMirrorTheme: CodeMirrorTheme = {
	languageSupport: python(),
	theme: pythonTheme,
	highlightStyle: pythonHighlightStyle
}