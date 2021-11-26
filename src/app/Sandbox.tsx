import {Editor} from "./Editor";
import {RunButton} from "./RunButton";
import {Cursor, OutputTerminal} from "./OutputTerminal";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {doChecks, runCode, runSetupCode} from "./Python";
import {addMultipleEventListener, isDefined, useIFrameMessages} from "./services/utils";

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
const terminalHeight = convertRemToPixels(12);
const nonVariableHeight = cmContentYPadding + editorYPaddingBorderAndMargin + buttonHeightAndYMargin + terminalHeight;

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

	const containerRef = useRef<HTMLDivElement>(null);

	const updateHeight = useCallback((editorLines?: number) => {
		if (containerRef?.current && editorLines && editorLines <= 11) {
			sendMessage({type: "resize", height: heightOfEditorLine * editorLines + nonVariableHeight});
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
		if (receivedData.type === "initialise") {
			setPredefinedCode({
				setup: (receivedData?.setup || "") as string,
				init: "print(input())\n" + (receivedData?.code || "# Your code here") as string,
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

	const [terminalOutput, setTerminalOutput] = useState(terminalInitialText);

	const removeNegativeIndex = (input: string, index: number) => {
		return input.slice(0, -(index + 1)) + (index === 0 ? "" : input.slice(-(index)));
	}

	const subtractFromTerminalOutput = (index: number) => {
		setTerminalOutput((currentOutput: string) => removeNegativeIndex(currentOutput, index));
	}

	const addToTerminalOutput = (output: string, index?: number) => {
		if (index === undefined || index === 0) {
			setTerminalOutput((currentOutput: string) => currentOutput + output);
		} else {
			setTerminalOutput((currentOutput: string) => currentOutput.slice(0, -index) + output + currentOutput.slice(-index));
		}
	}

	const clearTerminalOutput = () => {
		setFeedback(undefined);
		setTerminalOutput(terminalInitialText);
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

	const terminalRef = useRef<HTMLPreElement>(null);
	const [cursor, setCursor] = useState<Cursor>({
		pos: 0,
		show: false
	});

	const handleInputLine = (input: string, cursorPos: number) => {
		return new Promise<string>((resolve, reject) => {
			if (!isDefined(terminalRef) || !isDefined(terminalRef.current)) reject();

			function onKeyDown(e: Event) {

				if (e.type === "mousedown") {
					let me = e as MouseEvent;
					// @ts-ignore
					if (me.target && me.target.nodeName === "SPAN" && parseInt(me.target.id)) {
						// @ts-ignore
						const newCursorPos: number = Math.min(input.length, parseInt(me.target.id) - 1);
						handleInputLine(input, newCursorPos).then(resolve).catch(reject);
						setCursor((currentCursor: Cursor) => ({show: currentCursor.show, pos: newCursorPos}));
					} else {
						handleInputLine(input, cursorPos).then(resolve).catch(reject);
					}
					return;
				}

				if (e.type === "keydown") {

					if (terminalRef.current !== window.document.activeElement) {
						handleInputLine(input, cursorPos).then(resolve).catch(reject);
						return;
					}

					let ke = e as KeyboardEvent;

					if (ke.key) {
						let newCursorPos: number;
						switch (ke.key) {
							case "Enter":
								addToTerminalOutput("\n");
								resolve(input);
								break;
							case "Backspace":
								if (input.length > 0) {
									subtractFromTerminalOutput(cursorPos);
								}
								handleInputLine(removeNegativeIndex(input, cursorPos), cursorPos).then(resolve).catch(reject);
								break;
							case "ArrowLeft":
								if (ke.ctrlKey) {
									newCursorPos = input.length;
								} else {
									newCursorPos = Math.min(input.length, cursorPos + 1);
								}
								setCursor((currentCursor: Cursor) => ({show: currentCursor.show, pos: newCursorPos}));
								handleInputLine(input, newCursorPos).then(resolve).catch(reject);
								break;
							case "ArrowRight":
								if (ke.ctrlKey) {
									newCursorPos = 0;
								} else {
									newCursorPos = Math.max(0, cursorPos - 1);
								}
								setCursor((currentCursor: Cursor) => ({
									show: currentCursor.show,
									pos: Math.max(0, newCursorPos)
								}));
								handleInputLine(input, newCursorPos).then(resolve).catch(reject);
								break;
							default:
								if (ke.key.length === 1) {
									addToTerminalOutput(ke.key, cursorPos);
									if (cursorPos === 0) {
										handleInputLine(input + ke.key, cursorPos).then(resolve).catch(reject);
									} else {
										handleInputLine(input.slice(0, -cursorPos) + ke.key + input.slice(-cursorPos), cursorPos).then(resolve).catch(reject);
									}
								} else {
									handleInputLine(input, cursorPos).then(resolve).catch(reject);
								}
						}
					}
					return;
				}
			}
			terminalRef?.current && addMultipleEventListener(terminalRef?.current, ['keydown', 'mousedown'], onKeyDown, {once: true});

			// TODO Event listener for clicking and setting cursor position
		});
	};

	const handleInput = () => new Promise<string>((resolve, reject) => {
		setCursor({show: true, pos: 0});
		return handleInputLine("", 0).then((input) => {
			setCursor((currentCursor) => ({show: false, pos: currentCursor.pos}));
			resolve(input);
		}).catch(reject);
	});

	const handleRunPython = () => {
		if (!loaded) return;

		clearTerminalOutput();
		setRunning(true);

		runSetupCode(predefinedCode.setup, addToTerminalOutput, handleInput).then(() => {
			return runCode(editorRef?.current?.getCode() || "",
				addToTerminalOutput,
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
		<OutputTerminal ref={terminalRef} cursor={cursor} output={terminalOutput} succeeded={feedback?.succeeded} feedbackMessage={feedback?.message} clearFeedback={() => setFeedback(undefined)} />
	</div>
}
