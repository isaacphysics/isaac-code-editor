// @ts-ignore skulpt doesn't have typings
import Sk from "skulpt"
import {noop} from "./services/utils";
import {ERRORS, UNDEFINED_CHECKER_RESULT} from "./constants";

// Transpile and run a snippet of python code
export const runCode = (code: string, printOutput: (output: string) => void, handleInput: () => Promise<string>, skulptOptions= {}) => new Promise<string>((resolve, reject) => {

	let finalOutput = "";

	Sk.configure({
		output: (output: string) => {
			printOutput(output);
			finalOutput += output;
		},
		inputfun: () => new Promise((resolve, reject) => {
			const inputStartTime = Date.now();
			return handleInput().then((input) => {
				Sk.execLimit = Sk.execLimit + (Date.now() - inputStartTime);
				resolve(input);
			}).catch(reject);
		}),
		read: builtinRead,
		execLimit: 2000, // 2 seconds
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
			case ERRORS.TimeLimitError:
				reject({error: "Your program took too long to execute! Are there any infinite loops?"});
				break;
			default:
				reject({error: err.toString()});
		}
	});
});

export function runSetupCode(printOutput: (output: string) => void, handleInput: () => Promise<string>, setupCode?: string) {
	if (setupCode) {
		return runCode(setupCode, printOutput, handleInput, {retainGlobals: true});
	} else {
		return new Promise<string>(resolve => resolve(""));
	}
}

export function doChecks(mainCode: string, output: string, testCode?: string, testInputs?: string[], outputRegex?: RegExp, useAllTestInputs?: boolean) {
	if (testCode) {
		// Reverses the inputs, importantly by returning a new array and not doing it in place with .reverse()
		const reversedInputs = testInputs?.reduce((acc: string[], x) => [x].concat(acc), []) ?? [];
		let inputCount = reversedInputs.length;

		// Every time "input()" is called, the first element of the test inputs is given as
		//  the user input, and that element is removed from the list. If no test input is
		//  available, an error is thrown
		const inputHandler = () => new Promise<string>((resolve, reject) => {
			if (useAllTestInputs === true && reversedInputs.length === 0) {
				reject({error: "Your program called input() too many times!"});
			}
			inputCount -= 1;
			// @ts-ignore I've checked above whether there is an element to pop or not
			resolve(reversedInputs.pop() || "");
		});

		const afterRun = (output: string) => new Promise<string>((resolve, reject) => {
			// Check output matches regex first
			if (outputRegex && !outputRegex.test(output)) {
				// If the output does not match the provided regex
				reject({error: "Your program produced unexpected output!"});
			} else if (useAllTestInputs === true && inputCount !== 0) {
				// If the number of inputs used was not exactly the number provided, and the user had to use all available
				//  test inputs, then this is an error
				reject({error: "Your program didn't call input() enough times!"});
			} else {
				resolve(undefined === Sk.globals["checkerResult"] ? UNDEFINED_CHECKER_RESULT : Sk.globals["checkerResult"].v.toString());
			}
		});

		return runCode(testCode, noop, inputHandler, {retainGlobals: true}).then(afterRun);
	} else {
		return new Promise<string>(resolve => resolve(UNDEFINED_CHECKER_RESULT));
	}
}

function builtinRead(x: string) {
	if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
		throw new Error("File not found: '" + x + "'");
	return Sk.builtinFiles["files"][x];
}