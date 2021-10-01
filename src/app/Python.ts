// @ts-ignore skulpt doesn't have typings
import Sk from "skulpt"

// transpile and run a snippet of python code
export function runCode(code: string, handleOutput: (output: string) => void, handleSuccess: () => void,
									  handleError: (error: string) => void, skulptOptions={}) {
	Sk.configure({
		output: handleOutput,
		read: builtinRead,
		execLimit: 2000, // 2 seconds
		killableWhile: true,
		killableFor: true,
		...skulptOptions
	});
	Sk.misceval.asyncToPromise(
		() => {
			return Sk.importMainWithBody("<stdin>", false, code, true)
		}
	).then(() => {
		handleSuccess();
	}).catch((err: any) => {
		switch(err.tp$name) {
			case "TimeLimitError":
				handleError("Your program took too long to execute! Are there any infinite loops?");
				break;
			default:
				handleError(err.toString());
		}
	});
}

export function runSetupCode(setupCode: string) {
	return new Promise((resolve, reject) => {
		runCode(setupCode, console.log, () => resolve(null), reject, {retainGlobals: false});
	});
}

export function doChecks(testCode: string, studentCode: string, studentOutput: string): Promise<{checkerSucceeded: boolean, checkerOutput: string}> {
	Sk.globals.studentCode = new Sk.builtin.str(studentCode);
	Sk.globals.studentOutput = new Sk.builtin.str(studentOutput);
	return new Promise((resolve) => {
		const handleSuccess = () => {
			// check if "correct" variable is true or false
			const checkerOutput = Sk.globals["checkerResult"].v.toString();
			console.log(checkerOutput)
			resolve({checkerSucceeded: true, checkerOutput});
		}
		const handleError = (error: string) => {
			resolve({checkerSucceeded: false, checkerOutput: error.replace(/ on line \d+/, "")});
		}
		runCode(testCode, console.log, handleSuccess, handleError, {retainGlobals: true});
		//runCode("print(studentCode, studentOutput)", console.log, handleSuccess, handleError, {retainGlobals: true});
	});
}

function builtinRead(x: string) {
	if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
		throw new Error("File not found: '" + x + "'");
	return Sk.builtinFiles["files"][x];
}