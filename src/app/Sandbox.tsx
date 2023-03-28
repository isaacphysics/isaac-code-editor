import {Editor} from "./Editor";
import {RunButtons} from "./RunButtons";
import {OutputTerminal, xtermInterface} from "./OutputTerminal";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {noop, tryCastString, useIFrameMessages} from "./services/utils";
import {Terminal} from "xterm";
import {
	DEMO_CODE_PYTHON,
	EXEC_STATE,
	IN_IFRAME,
	LANGUAGES,
	MESSAGE_TYPES
} from "./constants";
import {ITerminal, TestCallbacks, Feedback, PredefinedCode, ILanguage, EditorChange, EditorSnapshot} from "./types";
import classNames from "classnames";

const terminalInitialText = "Ada Code Editor - running Skulpt in xterm.js:\n";
const uid = window.location.hash.substring(1);

const handleRun = (terminal: ITerminal,
				   language: ILanguage,
				   code: string,
				   setupCode: string | undefined,
				   testCode: string | undefined,
				   wrapCodeInMain: boolean | undefined,
				   printFeedback: (f: Feedback) => void,
				   shouldStopExecution: (stop: boolean) => boolean,
				   logSnapshot: (s: EditorSnapshot) => void,
				   onTestFinish: (checkerResult: string) => void,
				   onSetupFail: (error: string) => void,
				   doChecks: boolean | undefined) => {

	// TODO handle when the errors throw are errors in code that content have written - they should be sent to the front-end
	const printError = ({error, isTestError, isContentError}: {error: string, isTestError?: boolean, isContentError?: boolean}) => {
		printFeedback({
			succeeded: false,
			message: (isTestError ? error?.replace(/ on line \d+/, "") : error) ?? "Undefined error (sorry, this particular code snippet may be broken)",
			isTest: isTestError
		});
		if (isTestError) {
			printFeedback({
				succeeded: false,
				message: "Your code failed at least one test!"
			});
		} else if (isContentError) {
			onSetupFail(error);
		}
	}

	// Reverses the inputs, importantly by returning a new array and not doing it in place with .reverse()
	let reversedInputs: string[] = [];
	let inputCount = 0;
	let outputRegex: RegExp | undefined = undefined;

	const testInputHandler = (sync: boolean) => {
		// Every time "input()" is called, the first element of the test inputs is given as
		//  the user input, and that element is removed from the list. If no test input is
		//  available, a test error is thrown TODO add option for dummy inputs
		const asyncTestInputHandler = () => new Promise<string>((resolve, reject) => {
			inputCount -= 1;
			if (reversedInputs.length === 0) {
				reject({error: "Your program asked for input when none was expected, so we couldn't give it a valid input...", isTestError: true});
			} else {
				// There is definitely an input here
				resolve(reversedInputs.pop() ?? "");
			}
		});

		const syncTestInputHandler = () => {
			inputCount -= 1;
			if (reversedInputs.length === 0) {
				throw {error: "Your program asked for input when none was expected, so we couldn't give it a valid input...", isTestError: true};
			} else {
				// There is definitely an input here
				return reversedInputs.pop() ?? "";
			}
		};
		return () => {
			if (sync) {
				return syncTestInputHandler();
			} else {
				return asyncTestInputHandler();
			}
		}
	}

	const testCallbacks: TestCallbacks = {
		setTestInputs: (inputs: string[] | undefined) => {
			reversedInputs = inputs?.reduce((acc: string[], x) => [x].concat(acc), []) ?? [];
			inputCount = reversedInputs.length;
		},
		setTestRegex: (re: string | undefined) => {
			outputRegex = re ? RegExp(re) : undefined;
		},
		runCurrentTest: (currentOutput: string, allInputsMustBeUsed?: boolean, successMessage?: string, failMessage?: string) => {
			if (outputRegex) {
				//console.log(outputRegex);
				//console.log(currentOutput);
				if (!outputRegex.test(currentOutput)) {
					// If the output does not match the provided regex
					return {error: failMessage ?? "Your program produced unexpected output...", isTestError: true};
				} else if (undefined === successMessage) {
					printFeedback({succeeded: true, message: "The output of your program looks good", isTest: true});
				}
			}
			// Check whether all inputs were used (if needed)
			if (allInputsMustBeUsed) {
				if (inputCount > 0) {
					// If the number of inputs used was not exactly the number provided, and the user had to use all available
					//  test inputs, then this is an error
					return {error: failMessage ?? "Your program didn't call input() enough times...", isTestError: true};
				} else if (inputCount < 0) {
					return {error: failMessage ?? "Your program called input() too many times...", isTestError: true};
				} else if (undefined === successMessage) {
					printFeedback({succeeded: true, message: "Your program accepted the correct number of inputs", isTest: true});
				}
			}

			if (successMessage) {
				printFeedback({succeeded: true, message: successMessage, isTest: true});
			} else if (!allInputsMustBeUsed && (undefined === outputRegex)) {
				printFeedback({succeeded: true, message: "Test passed", isTest: true});
			}
			return undefined;
		}
	}

	// First clear the terminal
	terminal.clear();

	// If tests are being run, indicate this to the user
	if (doChecks) {
		// Green apple unicode: "\ud83c\udf4f"
		// Isaac CS banner: "\x1b[0m \x1b[1;44;30m    \u2b22     \x1b[0m"
		terminal.output("\x1b[1mRunning tests...\r\n");
	}

	const bundledSetupCode = language.testingLibrary + "\n" + (setupCode ?? "");

	if (language.requiresBundledCode) {
		const bundledCode = bundledSetupCode + "\n" + (wrapCodeInMain ? language.wrapInMain(code, doChecks) : code);
		if (doChecks) {
			const bundledTestCode = bundledCode + "\n" + testCode
			return language.runTests("", testInputHandler(language.syncTestInputHander), shouldStopExecution, bundledTestCode, testCallbacks)
				.then((checkerResult: string) => {
					onTestFinish(checkerResult);
				}).catch(printError);
		} else {
			return language.runCode(
				bundledCode,
				terminal.output,
				terminal.input,
				shouldStopExecution,
				{retainGlobals: true, execLimit: 30000 /* 30 seconds */})
				.then((finalOutput) => {
					logSnapshot({snapshot: code, compiled: true, timestamp: Date.now()});
					return finalOutput;
				}).catch((e) => {
					logSnapshot({snapshot: code, compiled: false, timestamp: Date.now(), error: e});
					printError(e);
				});
		}
	} else {
		return language.runSetupCode(terminal.output, terminal.input, bundledSetupCode, testCallbacks)
			.catch(({error}) => onSetupFail(error))
			.then(() => {
				// Wrap code in a 'main' function if specified by the content block
				let modifiedCode = wrapCodeInMain ? language.wrapInMain(code, doChecks) : code;
				return language.runCode(
					modifiedCode,
					doChecks ? noop : terminal.output,
					doChecks ? testInputHandler(language.syncTestInputHander) : terminal.input,
					shouldStopExecution,
					{retainGlobals: true, execLimit: 30000 /* 30 seconds */})
			})
			.then((finalOutput) => {
				logSnapshot({snapshot: code, compiled: true, timestamp: Date.now()});
				// Run the tests only if the "Check" button was clicked
				if (doChecks) {
					return language.runTests(finalOutput, testInputHandler(language.syncTestInputHander), shouldStopExecution, testCode, testCallbacks)
						.then((checkerResult: string) => {
							onTestFinish(checkerResult);
						});
				}
			})
			.catch((e) => {
				logSnapshot({snapshot: code, compiled: false, timestamp: Date.now(), error: e});
				printError(e);
			});
	}
};

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
	const [loaded, setLoaded] = useState<boolean>(!IN_IFRAME);
	const [running, setRunning] = useState<string>(EXEC_STATE.STOPPED);

	const [predefinedCode, setPredefinedCode] = useState<PredefinedCode>(IN_IFRAME ? {
		code: "# Loading..."
	} : DEMO_CODE_PYTHON);

	const {receivedData, sendMessage} = useIFrameMessages(uid);

	const containerRef = useRef<HTMLDivElement>(null);
	const codeRef = useRef<{getCode: () => string | undefined}>(null);
	const [xterm, setXTerm] = useState<Terminal>();

	const [recordLogs, setRecordLogs] = useState<boolean>(false);

	const [changeLog, setChangeLog] = useState<EditorChange[]>([]);
	const appendToChangeLog = (change: EditorChange) => {
		if (!recordLogs) return;
		setChangeLog((current) => (current.concat([change])));
	};
	const [snapshotLog, setSnapshotLog] = useState<EditorSnapshot[]>([]);
	const appendToSnapshotLog = (snapshot: EditorSnapshot) => {
		if (!recordLogs) return;
		setSnapshotLog((current) => (current.concat([snapshot])));
	};

	const updateHeight = useCallback((editorLines?: number) => {
		if (containerRef?.current) {
			sendMessage({
				type: MESSAGE_TYPES.RESIZE,
				height: heightOfEditorLine * (Math.min(editorLines ?? 11, 11) + 1) + nonVariableHeight
			});
		}
	}, [containerRef, sendMessage]);

	const shouldStop = useRef<boolean>(false);

	// Called by the code execution handling functions to check whether they should stop executing.
	const shouldStopExecution = (stop: boolean) => {
		if (!stop) return shouldStop.current;
		if (shouldStop.current) {
			shouldStop.current = false;
			return true;
		}
		return false;
	};
	// To be called by either the stop button or inside the MESSAGE_TYPES.INITIALISE message receive code. It sets
	// a flag which the running code periodically checks to see whether it should stop execution.
	const stopExecution = () => {
		shouldStop.current = true;
		// This is horrible... dispatch a random key event to xterm so that it "realises" that it should stop accepting input
		xterm?.element?.querySelector(".xterm-helper-textarea")?.dispatchEvent(new KeyboardEvent('keydown', {
			key: "b",
			keyCode: 66,
			code: "KeyE",
			which: 66,
			shiftKey: false,
			ctrlKey: false,
			metaKey: false
		}));
		return;
	}

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
			// Stop currently running code (or try to)
			if (running !== EXEC_STATE.STOPPED) {
				stopExecution();
			}

			const newPredefCode = {
				setup: tryCastString(receivedData?.setup) ?? "",
				code: tryCastString(receivedData?.code),
				wrapCodeInMain: receivedData?.wrapCodeInMain ? receivedData?.wrapCodeInMain as boolean : undefined,
				test: tryCastString(receivedData?.test),
				language: tryCastString(receivedData?.language),
			}
			setRecordLogs(receivedData?.logChanges ? receivedData?.logChanges as boolean : false);
			setPredefinedCode(newPredefCode);
			const numberOfLines = receivedData?.code ? (receivedData?.code as string).split(/\r\n|\r|\n/).length : 1;
			updateHeight(numberOfLines);
			setLoaded(true);
			// Clear any irrelevant log data, and make an initial snapshot
			setChangeLog([]);
			setSnapshotLog([{compiled: false, snapshot: newPredefCode.code ?? "", timestamp: Date.now()}]);

			// Clear any old terminal output
			xterm && xtermInterface(xterm, () => shouldStopExecution(false)).clear();

			// Confirm that the initialisation was successful
			sendMessage({
				type: MESSAGE_TYPES.CONFIRM_INITIALISED,
			});
		} else if (receivedData.type === MESSAGE_TYPES.FEEDBACK) {
			printFeedback({
				succeeded: receivedData.succeeded as boolean,
				message: receivedData.message as string
			});
		} else if (receivedData.type === MESSAGE_TYPES.PING) {
			if (containerRef?.current) {
				sendMessage({
					type: MESSAGE_TYPES.PING,
					timestamp: Date.now()
				});
			}
		} else if (receivedData.type === MESSAGE_TYPES.LOGS) {
			if (containerRef?.current) {
				sendMessage({
					type: MESSAGE_TYPES.LOGS,
					changes: changeLog,
					snapshots: snapshotLog
				});
				setChangeLog([]);
				setSnapshotLog([]);
			}
		}
	}, [receivedData]);

	const sendCheckerResult = (checkerResult: string) => {
		sendMessage({type: MESSAGE_TYPES.CHECKER, result: checkerResult});
	}

	const alertSetupCodeFail = (error: string) => {
		console.log("Setup code failed with error: " + error);
		sendMessage({type: MESSAGE_TYPES.SETUP_FAIL, message: error});
	}

	// Dependant on xterm character encoding - will need changing for a different terminal
	const printFeedback = ({succeeded, message, isTest}: Feedback) => {
		xterm && xtermInterface(xterm, () => shouldStopExecution(true)).output(`\x1b[${succeeded ? "32" : "31"};1m` + (isTest ? "> " : "") + message + (succeeded && isTest ? " \u2714" : "") + "\x1b[0m\r\n")
	}

	const callHandleRun = (doChecks?: boolean) => () => {
		if (!loaded || !xterm) return;

		if (running !== EXEC_STATE.STOPPED) {
			stopExecution();
			return;
		}
		shouldStop.current = false;

		const language = LANGUAGES.get(predefinedCode?.language ?? "");
		if (language) {
			setRunning(doChecks ? EXEC_STATE.CHECKING : EXEC_STATE.RUNNING);
			const editorCode = codeRef?.current?.getCode() || "";
			handleRun(xtermInterface(xterm, () => shouldStopExecution(true)), language, editorCode, predefinedCode.setup, predefinedCode.test, predefinedCode.wrapCodeInMain, printFeedback, shouldStopExecution, appendToSnapshotLog, sendCheckerResult, alertSetupCodeFail, doChecks)
				.then(() => setRunning(EXEC_STATE.STOPPED));
		} else {
			alertSetupCodeFail("Unknown programming language - unable to run code!");
		}
	}

	return <div ref={containerRef} className={classNames({"m-5": !IN_IFRAME})}>
		{!IN_IFRAME && <>
			<h2>
				Ada Code Editor Demo
			</h2>
			<p>
				Below is an implementation of the bubble sort algorithm! It is an example of <b>indefinite</b> and <b>nested</b> iteration. Interact with the code to understand how it works.
			</p>
			<p>
				If you modify the code, you can press the test button to see if it still sorts lists correctly.
			</p>
		</>}
		<Editor initCode={predefinedCode.code} language={predefinedCode.language} ref={codeRef} updateHeight={updateHeight} appendToChangeLog={appendToChangeLog} />
		<RunButtons running={running} loaded={loaded} onRun={callHandleRun(false)} onCheck={callHandleRun(true)} showCheckButton={!!(predefinedCode.test)}/>
		<OutputTerminal setXTerm={setXTerm} />
	</div>
}
