import {Editor} from "./Editor";
import {RunButton} from "./RunButton";
import {OutputTerminal} from "./OutputTerminal";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {doChecks, runCode, runSetupCode} from "./Python";
import {useIFrameMessages} from "./services/utils";
import {IDisposable, Terminal} from "xterm";

const terminalInitialText = "Program output:\n";
const uid = window.location.hash.substring(1);

export interface Feedback {
	succeeded: boolean;
	message: string;
}

export interface PredefinedCode {
	setup: string;
	init: string;
	test: string;
}

function convertRemToPixels(rem: number) {
	return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
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
const feedbackHeight = 42;

export const Sandbox = () => {
	const [loaded, setLoaded] = useState<boolean>(false);
	const [running, setRunning] = useState<boolean>(false);

	const [feedback, setFeedback] = useState<Feedback>();
	const [predefinedCode, setPredefinedCode] = useState<PredefinedCode>({
		setup: "",
		init: "# Loading...",
		test: ""
	});

	const {receivedData, sendMessage} = useIFrameMessages(uid);

	const [lastNumberOfLines, setLastNumberOfLines] = useState<number>();

	const containerRef = useRef<HTMLDivElement>(null);

	const updateHeight = useCallback((editorLines?: number, forceFeedbackShow?: boolean) => {
		if (containerRef?.current && editorLines && editorLines <= 11) {
			setLastNumberOfLines(editorLines);
			sendMessage({
				type: "resize",
				height: heightOfEditorLine * editorLines + nonVariableHeight + ((forceFeedbackShow ?? feedback) ? feedbackHeight : 0)
			});
		}
	}, [containerRef, sendMessage, feedback, setLastNumberOfLines]);
	
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
		if (receivedData.type === "initialise") {
			setPredefinedCode({
				setup: (receivedData?.setup || "") as string,
				init: (receivedData?.code || "# Your code here") as string,
				test: (receivedData?.test || "checkerResult = ''") as string
			});
			const numberOfLines = receivedData?.code ? (receivedData?.code as string).split(/\r\n|\r|\n/).length : 1;
			updateHeight(numberOfLines);
			setLoaded(true);
		} else if(receivedData.type === "feedback") {
			setFeedback({
				succeeded: receivedData.succeeded as boolean,
				message: receivedData.message as string
			});
		}
	}, [receivedData]);

	useEffect(() => {
		updateHeight(lastNumberOfLines, !!feedback);
	}, [feedback]);

	const terminalWrite = (output: string) => {
		if (xterm) {
			// @ts-ignore
			xterm._core.buffer.x = 0;
			xterm.write(output.replaceAll("\n", "\r\n"));
		}

	}

	const clearTerminal = () => {
		setFeedback(undefined);
		xterm?.clear();
	}

	const handleSuccess = (finalOutput: string) => {
		doChecks(predefinedCode.test, editorRef?.current?.getCode() || "", finalOutput).then((result: string) => {
			sendMessage({type: "checker", result: result});
		}).catch((error: string) => {
			// This only happens if the checking code fails to compile/run correctly
			sendMessage({type: "checkerFail", message: error});
		});
	};

	const printError = (error: string) => {
		setFeedback({
			succeeded: false,
			message: error
		});
	}

	const editorRef = useRef<{getCode: () => string | undefined}>(null);

	const [xterm, setXTerm] = useState<Terminal>();

	const handleSingleInputChar = (input: string) => new Promise<string>((resolve, reject) => {
		if (undefined === xterm) {
			return resolve("");
		}

		let cleanUpListener: () => void;

		const onDataListener = xterm.onData((s: string) => {
			const cleanUpAndRecurse = (newInput: string) => {
				cleanUpListener();
				handleSingleInputChar(newInput).then(resolve).catch(reject);
			}

			switch (s) {
				case '\u0003': // Ctrl+C
					xterm.write('^C');
					cleanUpAndRecurse(input);
					return;
				case '\r': // Enter
					cleanUpListener();
					xterm.write("\r\n");
					resolve(input);
					return;
				case '\n': // Enter (don't handle second character generated)
					return;
				case '\u007F': // Backspace (DEL)
					// Do not delete the prompt
					// @ts-ignore
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

		cleanUpListener = () => {
			onDataListener.dispose();
		}

	});

	const handleInput = () => handleSingleInputChar("");

	const handleRunPython = () => {
		if (!loaded) return;

		clearTerminal();
		setRunning(true);

		runSetupCode(predefinedCode.setup, terminalWrite, handleInput).then(() => {
			return runCode(editorRef?.current?.getCode() || "",
				terminalWrite,
				handleInput,
				handleSuccess,
				printError,
				{retainGlobals: true}
			)
		}).then(() => setRunning(false));
	}

	return <div ref={containerRef}>
		<Editor initCode={predefinedCode.init} ref={editorRef} updateHeight={updateHeight} />
		<RunButton running={running} loaded={loaded} onClick={handleRunPython} />
		<OutputTerminal setXTerm={setXTerm} succeeded={feedback?.succeeded} feedbackMessage={feedback?.message} clearFeedback={() => setFeedback(undefined)} />
	</div>
}
