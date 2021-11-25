// @ts-ignore skulpt doesn't have typings
import Sk from "skulpt"
import {noop} from "./services/utils";

// Transpile and run a snippet of python code
export function runCode(code: string, printOutput: (output: string) => void, handleInput: () => Promise<string>,
						handleSuccess: (finalOutput: string) => void, printError: (error: string) => void, skulptOptions= {}) {

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
		handleSuccess(finalOutput);
	}).catch((err: any) => {
		switch(err.tp$name) {
			case "TimeLimitError":
				printError("Your program took too long to execute! Are there any infinite loops?");
				break;
			default:
				printError(err.toString());
		}
	});
}

export function runSetupCode(setupCode: string, printOutput: (output: string) => void, handleInput: () => Promise<string>) {
	return new Promise((resolve, reject) => {
		runCode(setupCode, printOutput, handleInput, resolve, reject, {retainGlobals: true});
	});
}

export function doChecks(testCode: string, mainCode: string, output: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const handleSuccess = () => {
			resolve(Sk.globals["checkerResult"].v.toString());
		}
		const handleError = (error: string) => {
			reject(error.replace(/ on line \d+/, ""));
		}
		const inputHandler = () => new Promise<string>((resolve, reject) => {
			// In here, I can input test values defined by the content team!
			resolve("");
		});

		runCode(testCode, noop, inputHandler, handleSuccess, handleError, {retainGlobals: true});
	});
}

function builtinRead(x: string) {
	if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
		throw new Error("File not found: '" + x + "'");
	return Sk.builtinFiles["files"][x];
}