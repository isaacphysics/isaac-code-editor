// @ts-ignore skulpt doesn't have typings
import Sk from "skulpt"

export function runCode(code: string, handleOutput: (output: string) => void,
									  handleSuccess: () => void,
									  handleError: (error: string) => void) {
	Sk.killableWhile = true;
	Sk.configure({
		output: handleOutput,
		read: builtinRead,
		execLimit: 2000, // 20 seconds
	});
	const myPromise = Sk.misceval.asyncToPromise(function () {
		return Sk.importMainWithBody("<stdin>", false, code, true);
	});
	myPromise.then(() => {
			handleSuccess();
		},
		(err: any) => {
			console.log(err);
			switch(err.tp$name) {
				case "TimeLimitError":
					handleError("Your program took too long to execute! Are there any infinite loops?");
					break;
				default:
					handleError(err.toString());
			}
		});
}

function builtinRead(x: string) {
	if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
		throw new Error("File not found: '" + x + "'");
	return Sk.builtinFiles["files"][x];
}