import {Editor} from "./Editor";
import {RunButton} from "./RunButton";
import {OutputTerminal} from "./OutputTerminal";
import React, {useEffect, useRef, useState} from "react";
import {doChecks, runCode, runSetupCode} from "./Python";
import {useIFrameMessages} from "./services/utils";

const appLocation = "http://localhost:8003";
const terminalInitialText = "Program output:\n";
const uid = window.location.hash.substring(1);

export interface Feedback {
	success: boolean;
	message: string;
}

export const Sandbox = () => {
	const [loaded, setLoaded] = useState<boolean>(false);
	const [setupCode, setSetupCode] = useState<string>();
	const [initCode, setInitCode] = useState<string>();
	const [testCode, setTestCode] = useState<string>();
	const [running, setRunning] = useState<boolean>(false);
	const [editorCode, setEditorCode] = useState<string>();

	const [succeeded, setSucceeded] = useState<boolean>(false);
	const [feedbackMessage, setFeedbackMessage] = useState<string | undefined>(undefined);

	const {receivedData, sendMessage} = useIFrameMessages(appLocation, uid);
	
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
			setInitCode(receivedData?.code as string | undefined);
			setSetupCode(receivedData?.setup as string | undefined);
			setTestCode(receivedData?.test as string | undefined);
			setLoaded(true);
		} else if(receivedData.type === "feedback") {
			setSucceeded(receivedData.succeeded as boolean);
			setFeedbackMessage(receivedData?.message as string | undefined);
		}
	}, [receivedData]);

	const [terminalOutput, setTerminalOutput] = useState(terminalInitialText);

	const appendToTerminalOutput = (output: string) => {
		setTerminalOutput((currentOutput: string) => currentOutput + output);
	}

	const clearTerminalOutput = () => {
		setTerminalOutput(terminalInitialText);
	}

	const handleSuccess = (finalOutput: string) => {
		// We know that editorCode must be populated at this point
		doChecks(testCode || "", editorCode as string, finalOutput).then((message: string) => {
			sendMessage({type: "feedback", succeeded: true, message});
		}).catch((error: string) => {
			sendMessage({type: "feedback", succeeded: false, message: error});
		});
	};

	const printError = (error: string) => {
		setSucceeded(false);
		setFeedbackMessage(error);
	}

	const editorRef = useRef<{getCode: () => string | undefined}>(null);

	const handleRunPython = () => {

		if (!loaded) return;

		clearTerminalOutput();
		setRunning(true);

		runSetupCode(setupCode || "", appendToTerminalOutput)
		.then(() => {
			return runCode(editorRef?.current?.getCode() || "",
				appendToTerminalOutput,
				handleSuccess,
				printError,
				{retainGlobals: false}
			)
		})
		.then(() => setRunning(false));
	}

	return <>
		<Editor initCode={initCode} setEditorCode={setEditorCode} ref={editorRef} />
		<RunButton running={running} loaded={loaded} onClick={handleRunPython} />
		<OutputTerminal output={terminalOutput} succeeded={succeeded} feedbackMessage={feedbackMessage} setFeedbackMessage={setFeedbackMessage} />
	</>
}
