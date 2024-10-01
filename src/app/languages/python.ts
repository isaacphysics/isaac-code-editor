// @ts-ignore skulpt doesn't have typings
import Sk from "skulpt"
import {noop} from "../services/utils";
import {ERRORS, UNDEFINED_CHECKER_RESULT} from "../constants";
import {CodeMirrorTheme, ILanguage, TestCallbacks} from "../types";
import {python} from "@codemirror/lang-python";
import { EditorView } from "codemirror";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// Transpile and run a snippet of python code
const runCode = (code: string, printOutput: (output: string) => void, handleInput: () => (Promise<string> | string), shouldStopExecution: (stop: boolean) => boolean, skulptOptions= {}, testCallbacks?: TestCallbacks, initOutputSinceLastTest = "") => new Promise<string>((resolve, reject) => {

	let finalOutput = "";
	let outputSinceLastTest = initOutputSinceLastTest;

	function startTest(inputs: any, regex: any) {
		outputSinceLastTest = "";
		const args = arguments.length;
		if (undefined === testCallbacks) {
			throw new Sk.builtin.NameError("name 'startTest' is not defined - nice try!");
		}
		if (0 > args || args > 2) {
			throw {error: "startTest takes two arguments, a list of input strings and a regex string - either can also be set to None"}
		}
		testCallbacks.setTestInputs(args < 1 ? undefined : ((is) => {
			if (is instanceof Sk.builtin.list || is instanceof Sk.builtin.tuple) {
				return Sk.ffi.remapToJs(is);
			} else if (Sk.builtin.checkNone(is)) {
				return undefined;
			} else {
				throw {error: "Test inputs must be a list-like object or None"};
			}
		})(inputs));
		testCallbacks.setTestRegex(args < 2 ? undefined : ((re) => {
			if (Sk.builtin.checkString(re)) {
				return Sk.ffi.remapToJs(re);
			} else if (Sk.builtin.checkNone(re)) {
				return undefined;
			} else {
				throw {error: "Regex must be a string or None"};
			}
		})(regex));
	}

	function getTestOutput() {
		if (undefined === testCallbacks) {
			throw new Sk.builtin.NameError("name 'getTestOutput' is not defined - nice try!");
		}
		return Sk.builtins.str(outputSinceLastTest);
	}

	function endTest(testSuccess: any, testFail: any, allInputsMustBeUsed: any) {
		const args = arguments.length;
		if (undefined === testCallbacks) {
			throw new Sk.builtin.NameError("name 'endTest' is not defined - nice try!");
		}
		if (0 > args || args > 3) {
			throw {error: "endTest takes three arguments. These are two message strings - one to show on test pass and " +
					"one to show on test fail, and the third is a boolean deciding whether all test inputs given need to " +
					"be used or not. The first two arguments can also be set to None."};
		}
		let successMessage = args < 1 ? undefined : ((message) => {
			if (Sk.builtin.checkString(message)) {
				return Sk.ffi.remapToJs(message);
			} else if (Sk.builtin.checkNone(message)) {
				return undefined;
			} else {
				throw {error: "'Test success' feedback must be a string or None"};
			}
		})(testSuccess);
		let failMessage = args < 2 ? undefined : ((message) => {
			if (Sk.builtin.checkString(message)) {
				return Sk.ffi.remapToJs(message);
			} else if (Sk.builtin.checkNone(message)) {
				return undefined;
			} else {
				throw {error: "'Test failed' feedback must be a string or None"};
			}
		})(testFail);
		let useAllInputs = args < 3 ? undefined : ((uai) => {
			if (Sk.builtin.checkBool(uai)) {
				return Sk.ffi.remapToJs(uai);
			} else if (Sk.builtin.checkNone(uai)) {
				return undefined;
			} else {
				throw {error: "'allInputsMustBeUsed' must be a boolean or None"};
			}
		})(allInputsMustBeUsed);

		// Run test - if the test fails, an error is thrown
		const error = testCallbacks.runCurrentTest(outputSinceLastTest, useAllInputs, successMessage, failMessage);
		if (error) {
			throw error;
		}
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
		"endTest": endTest,
		"getTestOutput": getTestOutput
	};

	Sk.configure({
		output: (output: string) => {
			finalOutput += output;
			outputSinceLastTest += output;
			printOutput(output);
		},
		inputfun: () => new Promise((resolve, reject) => {
			const inputStartTime = Date.now();
			const input = handleInput();
			if (typeof input === "string") {
				return () => resolve(input);
			} else {
				return input.then((input) => {
					if (Sk.execLimit) {
						Sk.execLimit = Sk.execLimit + (Date.now() - inputStartTime);
					}
					resolve(input);
				}).catch(reject);
			}
		}),
		yieldLimit: 100,
		read: builtinRead,
		killableWhile: true,
		killableFor: true,
		__future__: Sk.python3,
		...skulptOptions
	});
	return Sk.misceval.asyncToPromise(
		() => Sk.importMainWithBody("<stdin>", false, code, true), {
			// https://stackoverflow.com/questions/54503455/how-to-stop-a-script-in-skulpt
			"*": () => {
				if (shouldStopExecution(true)) throw "Execution interrupted"
			}
		}
	).then(() => {
		resolve(finalOutput);
	}).catch((err: any) => {
		if (typeof err === "object" && "nativeError" in err && err.nativeError === ERRORS.EXEC_STOP_ERROR) {
			reject({error: "Execution interrupted"});
			return;
		}
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

function runSetupCode(printOutput: (output: string) => void, handleInput: () => (Promise<string> | string), setupCode?: string, testCallbacks?: TestCallbacks) {
	if (setupCode) {
		return runCode(setupCode, printOutput, handleInput, () => false, {retainGlobals: true, execLimit: 3000 /* setup code can only take a maximum of 3 seconds */}, testCallbacks);
	} else {
		return new Promise<string>(resolve => resolve(""));
	}
}

function runTests(output: string, handleInput: () => (Promise<string> | string), shouldStopExecution: (stop: boolean) => boolean, testCode?: string, testCallbacks?: TestCallbacks) {
	if (testCode) {
		return runCode(testCode, noop, handleInput, shouldStopExecution, {retainGlobals: true}, testCallbacks, output).then((testOutput) => {
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
  pass`,
	requiresBundledCode: false,
	syncTestInputHander: false,
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
	{tag: tags.definitionKeyword, color: "#7928a1"},
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
	highlightStyle: syntaxHighlighting(pythonHighlightStyle),
}
