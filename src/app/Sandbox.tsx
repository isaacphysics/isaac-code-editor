import {Editor} from "./Editor";
import {RunButton} from "./RunButton";
import {Cursor, OutputTerminal} from "./OutputTerminal";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {doChecks, runCode, runSetupCode} from "./Python";
import {isDefined, useIFrameMessages} from "./services/utils";

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
		if (containerRef?.current && editorLines) {
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
	const cursor = useRef<Cursor>({
		pos: 0,
		show: false
	});

	const handleInputLine = useCallback(function handleLine(input: string) {
		return new Promise<string>((resolve, reject) => {
			if (!isDefined(terminalRef) || !isDefined(terminalRef.current)) reject();

			function onKeyDown(e: KeyboardEvent) {
				if (terminalRef.current !== window.document.activeElement) {
					console.log("Not focused yet");
					handleInputLine(input).then(resolve).catch(reject);
				}

				if (e.key) {
					switch (e.key) {
						case "Enter":
							addToTerminalOutput("\n");
							resolve(input);
							break;
 						case "Backspace":
							if (input.length > 0) {
								subtractFromTerminalOutput(cursor?.current?.pos);
							}
							handleInputLine(removeNegativeIndex(input, cursor?.current?.pos)).then(resolve).catch(reject);
							break;
						case "ArrowLeft":
							cursor.current = {show: cursor.current.show, pos: Math.min(input.length, cursor.current.pos + 1)};
							handleInputLine(input).then(resolve).catch(reject);
							break;
						case "ArrowRight":
							cursor.current = {show: cursor.current.show, pos: Math.max(0, cursor.current.pos - 1)};
							handleInputLine(input).then(resolve).catch(reject);
							break;
						default:
							if (e.key.length === 1) {
								addToTerminalOutput(e.key, cursor?.current?.pos);
								handleInputLine(input + e.key).then(resolve).catch(reject);
							} else {
								handleInputLine(input).then(resolve).catch(reject);
							}
					}
				}
			}
			terminalRef?.current?.addEventListener('keydown', onKeyDown, {once: true});
		});
	}, [terminalRef, cursor]);

	const handleInput = () => new Promise<string>((resolve, reject) => {
		cursor.current = {show: true, pos: 0};
		return handleInputLine("").then((input) => {
			cursor.current = {show: false, pos: cursor.current.pos};
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
