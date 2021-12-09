// @ts-ignore skulpt doesn't have typings
import Sk from "skulpt"
import {noop} from "./services/utils";
import {ERRORS, UNDEFINED_CHECKER_RESULT} from "./constants";
import {ILanguage, TestCallbacks} from "./types";

// Transpile and run a snippet of python code
const runCode = (code: string, printOutput: (output: string) => void, handleInput: () => Promise<string>, skulptOptions= {}, testCallbacks?: TestCallbacks) => new Promise<string>((resolve, reject) => {

	let finalOutput = "";
	let outputSinceLastTest = "";

	function startTest(inputs: any, regex: any) {
		if (undefined === testCallbacks) {
			throw new Sk.builtin.NameError("name 'startTest' is not defined - nice try!");
		}

		if (arguments.length !== 2) {
			throw {error: "startTest takes two arguments, a list of input strings and a regex string - either can also be set to None"};
		}
		if (inputs instanceof Sk.builtin.list || inputs instanceof Sk.builtin.tuple) {
			testCallbacks.setTestInputs(Sk.ffi.remapToJs(inputs));
		} else if (!Sk.builtin.checkNone(inputs)) {
			throw {error: "Test inputs must be a list-like object or None"};
		} else {
			testCallbacks.setTestInputs(undefined);
		}
		if (Sk.builtin.checkString(regex)) {
			testCallbacks.setTestRegex(Sk.ffi.remapToJs(regex));
		} else if (!Sk.builtin.checkNone(regex)) {
			throw {error: "Regex must be a string or None"};
		} else {
			testCallbacks.setTestRegex(undefined);
		}
	}

	function endTest(testSuccess: string, testFail: string, allInputsMustBeUsed: boolean) {
		if (undefined === testCallbacks) {
			throw new Sk.builtin.NameError("name 'endTest' is not defined - nice try!");
		}

		let successMessage = undefined;
		let failMessage = undefined;
		let useAllInputs = true;

		if (arguments.length !== 3) {
			throw {error: "endTest takes three arguments. These are two message strings - one to show on test pass and " +
					"one to show on test fail, and the third is a boolean deciding whether all test inputs given need to " +
					"be used or not. The first two arguments can also be set to None."};
		}
		if (Sk.builtin.checkString(testSuccess)) {
			successMessage = Sk.ffi.remapToJs(testSuccess);
		} else if (!Sk.builtin.checkNone(testSuccess)) {
			throw {error: "'Test success' feedback must be a string or None"};
		}
		if (Sk.builtin.checkString(testFail)) {
			failMessage = Sk.ffi.remapToJs(testFail);
		} else if (!Sk.builtin.checkNone(testFail)) {
			throw {error: "'Test failed' feedback must be a string or None"};
		}
		if (Sk.builtin.checkBool(allInputsMustBeUsed)) {
			useAllInputs = Sk.ffi.remapToJs(allInputsMustBeUsed);
		} else {
			throw {error: "'allInputsMustBeUsed' must be a boolean"};
		}

		testCallbacks.runCurrentTest(outputSinceLastTest, useAllInputs, successMessage, failMessage)
			.then(() => {
				outputSinceLastTest = ""
			})
			.catch(reject);
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
		startTest: startTest,
		killableWhile: true,
		killableFor: true,
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
	wrapInMain: (code, doChecks) => "def main():\n" + code.split("\n").map(s => "\t" + s).join("\n") + (!doChecks ? "\nmain()" : "")
}