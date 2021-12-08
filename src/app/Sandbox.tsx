import {Editor} from "./Editor";
import {RunButtons} from "./RunButtons";
import {OutputTerminal} from "./OutputTerminal";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {runTests, runCode, runSetupCode, TestCallbacks} from "./Python";
import {noop, tryCastString, useIFrameMessages} from "./services/utils";
import {Terminal} from "xterm";
import {EXEC_STATE, MESSAGE_TYPES, UNDEFINED_CHECKER_RESULT} from "./constants";

const terminalInitialText = "Isaac Python - running Skulpt in xterm.js:\n";
const uid = window.location.hash.substring(1);

export interface Feedback {
	succeeded: boolean;
	message: string;
}

export interface PredefinedCode {
	setup?: string;
	code?: string;
	wrapCodeInMain?: boolean;
	test?: string;
	testInputs?: string[];
	useAllTestInputs?: boolean;
	outputRegex?: RegExp;
}

// TODO Find a better way to do this
// Predefined heights for iframe height calculation
// This is horrible but is needed so that the parent window can frame the editor properly
// If the style changes at all this needs recalculating!
const heightOfEditorLine = 19.6;
const cmContentYPadding = 8;
const editorYPaddingBorderAndMargin = 23 + 2 + 16;
const buttonHeightAndYMargin = 50 + 16;
const terminalHeight = 200;
const nonVariableHeight = cmContentYPadding + editorYPaddingBorderAndMargin + buttonHeightAndYMargin + terminalHeight;

export const Sandbox = () => {
	const [loaded, setLoaded] = useState<boolean>(false);
	const [running, setRunning] = useState<string>(EXEC_STATE.STOPPED);

	const [predefinedCode, setPredefinedCode] = useState<PredefinedCode>({
		code: "# Loading..."
	});

	const {receivedData, sendMessage} = useIFrameMessages(uid);

	const containerRef = useRef<HTMLDivElement>(null);
	const [xterm, setXTerm] = useState<Terminal>();

	const updateHeight = useCallback((editorLines?: number) => {
		if (containerRef?.current && editorLines && editorLines <= 11) {
			sendMessage({
				type: MESSAGE_TYPES.RESIZE,
				height: heightOfEditorLine * (editorLines + 1) + nonVariableHeight
			});
		}
	}, [containerRef, sendMessage]);
	
	useEffect(() => {
		if (undefined === receivedData) return;
		/** The editor can receive two types of messages
		 * Initial messages, used to pass the initial code in the editor and the test to perform
		 * {
		 *     type: "initialise",
		 *     code: "# Calculate the area of a circle below!\ndef circleArea(radius):",
		 *     setup: "pi = 3.142"
		 *     test: "checkerResult = str([circleArea(2), circleArea(8), circleArea(1), circleArea(-3)])"
		 * }
		 *
		 * Feedback messages, to indicate whether the student was correct or not
		 * {
		 *     type: "feedback",
		 *     succeeded: true,
		 *     message: "Congratulations, you passed the test!"
		 * }
		 */
		if (receivedData.type === MESSAGE_TYPES.INITIALISE) {
			const newPredefCode = {
				setup: tryCastString(receivedData?.setup),
				code: tryCastString(receivedData?.code),
				wrapCodeInMain: receivedData?.wrapCodeInMain ? receivedData?.wrapCodeInMain as boolean : undefined,
				test: tryCastString(receivedData?.test),
				testInputs: tryCastString(receivedData?.testInput) ? (receivedData?.testInput as string).split("\n").filter(s => s.length > 0) : undefined,
				useAllTestInputs: receivedData?.useAllTestInputs ? receivedData?.useAllTestInputs as boolean : undefined,
				outputRegex: tryCastString(receivedData?.outputRegex) ? new RegExp(receivedData?.outputRegex as string) : undefined
			}
			setPredefinedCode(newPredefCode);
			const numberOfLines = receivedData?.code ? (receivedData?.code as string).split(/\r\n|\r|\n/).length : 1;
			updateHeight(numberOfLines);
			setLoaded(true);
		} else if(receivedData.type === MESSAGE_TYPES.FEEDBACK) {
			printFeedback({
				succeeded: receivedData.succeeded as boolean,
				message: receivedData.message as string
			});
		}
	}, [receivedData]);

	const terminalWrite = (output: string) => {
		if (xterm) {
			xterm.write(output.replaceAll("\n", "\r\n"));
		}
	}

	const clearTerminal = () => {
		xterm?.clear();
	}

	const printFeedback = ({succeeded, message}: Feedback) => {
		xterm?.write(`\x1b[${succeeded ? "32" : "31"};1m` + message + "\x1b[0m\r\n");
	}

	const printError = ({error}: {error: string}) => {
		printFeedback({
			succeeded: false,
			message: error?.replace(/ on line \d+/, "") ?? "Undefined error (sorry, this particular code snippet may be broken)"
		});
	}

	const editorRef = useRef<{getCode: () => string | undefined}>(null);

	const handleSingleInputChar = (input: string) => new Promise<string>((resolve, reject) => {
		if (undefined === xterm) {
			return resolve("");
		}

		const onDataListener = xterm.onData((s: string) => {
			const cleanUpAndRecurse = (newInput: string) => {
				onDataListener.dispose();
				handleSingleInputChar(newInput).then(resolve).catch(reject);
			}

			switch (s) {
				case '\u0003': // Ctrl+C
					const xtermSelection = xterm.getSelection();
					navigator.clipboard.writeText(xtermSelection).then(() => {
						console.log(`Copied: ${xtermSelection} to clipboard!`);
					}).catch(() => {
						console.log("Failed to copy selection to clipboard");
					}); // Could make this show a "copied to clipboard" popup?
					cleanUpAndRecurse(input);
					return;
				case '\u0016': // Ctrl+V
					navigator.clipboard.readText().then((s) => {
						cleanUpAndRecurse(input + s);
						xterm.write(s);
					}).catch(() => {
						cleanUpAndRecurse(input);
					});
					onDataListener.dispose();
					return;
				case '\r': // Enter
					onDataListener.dispose();
					xterm.write("\r\n");
					resolve(input);
					return;
				case '\n': // Enter (don't handle second character generated)
					return;
				case '\u007F': // Backspace (DEL)
					// Do not delete the prompt
					if (input.length > 0) {
						xterm.write('\b \b');
						cleanUpAndRecurse(input.slice(0, -1));
						return;
					}
					break;
				default: // Print all other characters for demo
					if (s >= String.fromCharCode(0x20) && s <= String.fromCharCode(0x7B) || s >= '\u00a0') {
						xterm.write(s);
						cleanUpAndRecurse(input + s);
						return;
					}
			}
			cleanUpAndRecurse(input);
			return;
		});

	});

	const handleRun = (doChecks?: boolean) => () => {
		if (!loaded) return;

		clearTerminal();

		// Reverses the inputs, importantly by returning a new array and not doing it in place with .reverse()
		//const reversedInputs = predefinedCode.testInputs?.reduce((acc: string[], x) => [x].concat(acc), []) ?? [];
		let reversedInputs: string[] = [];
		let inputCount = 0;
		let outputRegex: RegExp | undefined = undefined;

		// Every time "input()" is called, the first element of the test inputs is given as
		//  the user input, and that element is removed from the list. If no test input is
		//  available, the last one is 'replayed'
		const testInputHandler = () => new Promise<string>((resolve, reject) => {
			inputCount -= 1;
			if (reversedInputs.length === 1) {
				resolve(reversedInputs[0]);
			} else if (reversedInputs.length === 0) {
				printFeedback({succeeded: false, message: "> Your program asked for input when none was expected, so we couldn't give it a valid input..."});
				reject({error: "Your code failed at least one test"});
			} else {
				// @ts-ignore There is definitely an input here
				resolve(reversedInputs.pop());
			}
		});

		const testCallbacks: TestCallbacks = {
			setTestInputs: (inputs: string[] | undefined) => {
				reversedInputs = inputs?.reduce((acc: string[], x) => [x].concat(acc), []) ?? [];
				inputCount = reversedInputs.length;
			},
			setTestRegex: (re: string | undefined) => {
				outputRegex = re ? RegExp(re) : undefined;
			},
			runCurrentTest: (currentOutput: string, allInputsMustBeUsed: boolean, successMessage: string | undefined, failMessage: string | undefined) => {
				// Check output matches regex given
				if (outputRegex) {
					if (!outputRegex.test(currentOutput)) {
						// If the output does not match the provided regex
						return `> ${failMessage ?? "Your program produced unexpected output..."}`;
					} else if (undefined === successMessage) {
						printFeedback({succeeded: true, message: "> The output of your program looks good \u2714"});
					}
				}
				// Check whether all inputs were used (if needed)
				if (allInputsMustBeUsed) {
					if (inputCount > 0) {
						// If the number of inputs used was not exactly the number provided, and the user had to use all available
						//  test inputs, then this is an error
						return `> ${failMessage ?? "Your program didn't call input() enough times..."}`;
					} else if (inputCount < 0) {
						return `> ${failMessage ?? "Your program called input() too many times..."}`;
					} else if (undefined === successMessage) {
						printFeedback({succeeded: true, message: "> Your program accepted the correct number of inputs \u2714"});
					}
				}
				if (successMessage) {
					printFeedback({succeeded: true, message: "> " + successMessage + " \u2714"});
				} else if (!allInputsMustBeUsed && (undefined === outputRegex)) {
					printFeedback({succeeded: true, message: "> Test passed \u2714"});
				}
			}
		}

		const handleTerminalInput = () => handleSingleInputChar("");

		const afterAllTestRun = (finalOutput: string, checkerResult: string) => new Promise<string>(resolve => {
			// Catch anything that doesn't reject - just send off the checker result
			resolve(checkerResult);
		});

		const runTestsAfterCode = (finalOutput: string) => {
			return runTests(editorRef?.current?.getCode() || "", finalOutput, testInputHandler, afterAllTestRun, predefinedCode.test, testCallbacks).then((result: string) => {
				sendMessage({type: MESSAGE_TYPES.CHECKER, result: result});
			});
		};

		if (doChecks) {
			// Green apple unicode: "\ud83c\udf4f"
			// Isaac CS banner: "\x1b[0m \x1b[1;44;30m    \u2b22     \x1b[0m"
			terminalWrite("\x1b[1mRunning tests...\r\n");
		}
		setRunning(doChecks ? EXEC_STATE.CHECKING : EXEC_STATE.RUNNING);

		runSetupCode(terminalWrite, handleTerminalInput, predefinedCode.setup, testCallbacks)
			.catch(({error}) => sendMessage({type: MESSAGE_TYPES.SETUP_FAIL, message: error}))
			.then(() => {
				let code = editorRef?.current?.getCode() || "";
				if (predefinedCode.wrapCodeInMain) {
					code = "def main():\n" + code.split("\n").map(s => "\t" + s).join("\n");
					if (!doChecks) {
						code += "\nmain()";
					}
				}
				return runCode(code, doChecks ? noop : terminalWrite, doChecks ? testInputHandler : handleTerminalInput, {retainGlobals: true, execLimit: 2000 /* 2 seconds */})
			})
			.then((finalOutput) => {
				// Run the tests only if the "Check" button was clicked
				if (doChecks) {
					return runTestsAfterCode(finalOutput);
				}
			})
			.catch(printError)
			.then(() => setRunning(EXEC_STATE.STOPPED));
	};

	return <div ref={containerRef}>
		<Editor initCode={predefinedCode.code} ref={editorRef} updateHeight={updateHeight} />
		<RunButtons running={running} loaded={loaded} onRun={handleRun(false)} onCheck={handleRun(true)} showCheckButton={!!(predefinedCode.test || predefinedCode.testInputs || predefinedCode.outputRegex)}/>
		<OutputTerminal setXTerm={setXTerm} />
	</div>
}
