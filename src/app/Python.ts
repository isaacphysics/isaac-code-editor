// @ts-ignore skulpt doesn't have typings
import Sk from "skulpt"

// transpile and run a snippet of python code
export function runCode(code: string, handleOutput: (output: string) => void,
									  handleSuccess: () => void,
									  handleError: (error: string) => void) {
	Sk.killableWhile = true;
	Sk.configure({
		output: handleOutput,
		read: builtinRead,
		execLimit: 2000, // 2 seconds
		killableWhile: true,
		killableFor: true
	});
	const myPromise = Sk.misceval.asyncToPromise(function () {
		return Sk.importMainWithBody("<stdin>", false, code, true);
	});
	myPromise.then(() => {
			handleSuccess();
		},
		(err: any) => {
			switch(err.tp$name) {
				case "TimeLimitError":
					handleError("Your program took too long to execute! Are there any infinite loops?");
					break;
				default:
					handleError(err.toString());
			}
		}
	);
}

// fun a certain function with a series of arguments to see if output matches
// returns results if succeded, error message otherwise
export function doChecks(functionName: string, tests: any[]): {success: boolean, message?: string, results?: any[]} {
	// configure skulpt
	Sk.configure({
		output: console.log,
		execLimit: 200
	});

	if(functionName in Sk.globals) {
		// the function to test
		const func = Sk.globals[functionName].tp$call;
		const results = [];

		// for every test
		for (let i = 0; i < tests.length; i++) {
			try {
				// run the python function and get result
				const result = func(tests[i].map((v: any) => jsVariableToPython(v))).v;
				results.push(result);
			} catch (e) { // error in python code
				let errMessage = e.toString();
				if(errMessage.startsWith("ExternalError: TypeError: Cannot read property ")) // make error message more human-readable
					errMessage = `NameError: name '${errMessage.split("'")[1]}' is not defined on line ${errMessage.split(' ').pop()}`
				return {success: false, message: errMessage};
			}
		}
		return {success: true, results: results};
	} else {
		return {success: false, message: `Can't find a function called "square"!`};
	}
}

function builtinRead(x: string) {
	if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
		throw new Error("File not found: '" + x + "'");
	return Sk.builtinFiles["files"][x];
}

// convert a javascript variable to one Skulpt can use in python code
function jsVariableToPython(v: any) {
	if(typeof v === "number")
		return new Sk.builtin.int_(v);
	if(typeof v === "string")
		return new Sk.builtin.str(v);
	if(typeof v === "boolean")
		return new Sk.builtin.bool(v);
	return {v: v};
}