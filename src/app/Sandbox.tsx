import {Editor} from "./Editor";
import {RunButton} from "./RunButton";
import {OutputTerminal} from "./OutputTerminal";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {doChecks, runCode, runSetupCode} from "./Python";
import {useIFrameMessages} from "./services/utils";

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

	const updateHeight = useCallback(() => {
		if (containerRef?.current && containerRef?.current?.scrollHeight !== 0) {
			sendMessage({type: "resize", height: containerRef?.current?.scrollHeight});
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
				init: (receivedData?.code || "# Your code here") as string,
				test: (receivedData?.test || "checkerResult = ''") as string
			});
			setLoaded(true);
			updateHeight();
		} else if(receivedData.type === "feedback") {
			setFeedback({
				succeeded: receivedData.succeeded as boolean,
				message: receivedData.message as string
			});
		}
	}, [receivedData]);

	const [terminalOutput, setTerminalOutput] = useState(terminalInitialText);

	const appendToTerminalOutput = (output: string) => {
		setTerminalOutput((currentOutput: string) => currentOutput + output);
	}

	const clearTerminalOutput = () => {
		setFeedback(undefined);
		setTerminalOutput(terminalInitialText);
	}

	const handleSuccess = (finalOutput: string) => {
		doChecks(predefinedCode.test, editorRef?.current?.getCode() || "", finalOutput).then((result: string) => {
			updateHeight();
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

	const handleRunPython = () => {
		if (!loaded) return;

		clearTerminalOutput();
		setRunning(true);

		runSetupCode(predefinedCode.setup, appendToTerminalOutput).then(() => {
			return runCode(editorRef?.current?.getCode() || "",
				appendToTerminalOutput,
				handleSuccess,
				printError,
				{retainGlobals: false}
			)
		}).then(() => setRunning(false));
	}

	return <div ref={containerRef}>
		<Editor initCode={predefinedCode.init} ref={editorRef} updateHeight={updateHeight} />
		<RunButton running={running} loaded={loaded} onClick={handleRunPython} />
		<OutputTerminal output={terminalOutput} succeeded={feedback?.succeeded} feedbackMessage={feedback?.message} clearFeedback={() => setFeedback(undefined)} />
	</div>
}
