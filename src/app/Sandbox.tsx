import {Editor} from "./Editor";
import {RunButton} from "./RunButton";
import {OutputTerminal} from "./OutputTerminal";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {doChecks, runCode, runSetupCode} from "./Python";
import {tryCastString, useIFrameMessages} from "./services/utils";
import {Terminal} from "xterm";
import {MESSAGE_TYPES} from "./constants";

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
	const [running, setRunning] = useState<boolean>(false);

	const [feedback, setFeedback] = useState<Feedback>();
	const [predefinedCode, setPredefinedCode] = useState<PredefinedCode>({
		code: "# Loading..."
	});

	const {receivedData, sendMessage} = useIFrameMessages(uid);

	const containerRef = useRef<HTMLDivElement>(null);

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
				//code: tryCastString(receivedData?.code),
				code: "age = int(input(\"Please enter an accepted age \"))\n" +
					"while age <= 18:\n" +
					"    age = int(input(\"Please enter an accepted age \"))\n",
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
			setFeedback({
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
		setFeedback(undefined);
		xterm?.clear();
	}

	const handleSuccess = (finalOutput: string) => {
		return doChecks(editorRef?.current?.getCode() || "", finalOutput, predefinedCode.test, predefinedCode.testInputs, predefinedCode.outputRegex, predefinedCode.useAllTestInputs).then((result: string) => {
			sendMessage({type: MESSAGE_TYPES.CHECKER, result: result});
		});
	};

	const printError = ({error}: {error: string}) => {
		setFeedback({
			succeeded: false,
			message: error.replace(/ on line \d+/, "")
		});
	}

	const editorRef = useRef<{getCode: () => string | undefined}>(null);

	const [xterm, setXTerm] = useState<Terminal>();

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

	const handleInput = () => handleSingleInputChar("");

	const handleRunPython = () => {
		if (!loaded) return;

		clearTerminal();
		setRunning(true);

		runSetupCode(terminalWrite, handleInput, predefinedCode.setup)
			.catch(({error}) => sendMessage({type: MESSAGE_TYPES.SETUP_FAIL, message: error}))
			.then(() => {
				let code = editorRef?.current?.getCode() || "";
				if (predefinedCode.wrapCodeInMain) {
					code = "def main():\n" + code.split("\n").map(s => "\t" + s).join("\n");
				}
				return runCode(code, terminalWrite, handleInput, {retainGlobals: true})
			})
			.then(handleSuccess)
			.catch(printError)
			.then(() => setRunning(false));
	}

	return <div ref={containerRef}>
		<Editor initCode={predefinedCode.code} ref={editorRef} updateHeight={updateHeight} />
		<RunButton running={running} loaded={loaded} onClick={handleRunPython} />
		<OutputTerminal setXTerm={setXTerm} succeeded={feedback?.succeeded} feedbackMessage={feedback?.message} clearFeedback={() => setFeedback(undefined)} />
	</div>
}
