// @ts-ignore skulpt doesn't have typings
import Sk from "skulpt"
import {noop} from "./services/utils";

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
			case "TimeLimitError":
				reject({error: "Your program took too long to execute! Are there any infinite loops?", isProgrammaticError: true});
				break;
			default:
				reject({error: err.toString(), isProgrammaticError: true});
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

export function doChecks(mainCode: string, output: string, testCode?: string, testInputs?: string[], outputRegex?: RegExp) {
	if (testCode) {
		// Reverses the inputs, importantly by returning a new array and not doing it in place with .reverse()
		const reversedInputs = testInputs?.reduce((acc: string[], x) => [x].concat(acc), []) ?? [];

		// Every time "input()" is called, the first element of the test inputs is given as
		//  the user input, and that element is removed from the list. If no test input is
		//  available, the empty string is given.
		const inputHandler = () => new Promise<string>(resolve => {
			resolve(reversedInputs.pop() || "");
		});

		const afterRun = (output: string) => new Promise<string>((resolve, reject) => {
			// Check output matches regex first
			if (outputRegex && !outputRegex.test(output)) {
				reject({error: "Your program produced unexpected output!", isProgrammaticError: false});
			} else {
				resolve(Sk.globals["checkerResult"].v.toString());
			}
		});

		return runCode(testCode, noop, inputHandler, {retainGlobals: true}).then(afterRun);
	} else {
		return new Promise<string>(resolve => resolve(""));
	}
}

function builtinRead(x: string) {
	if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
		throw new Error("File not found: '" + x + "'");
	return Sk.builtinFiles["files"][x];
}