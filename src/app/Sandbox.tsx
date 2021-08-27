import {Editor} from "./Editor";
import {RunButton} from "./RunButton";
import {OutputTerminal} from "./OutputTerminal";
import React, {useRef, useState} from "react";
import { runCode } from "./Python";
import {Feedback} from "./FeedbackBanner";

const terminalInitialText = "Program output:\n\n";

export const Sandbox = (props: {initialCode: string}) => {
	// editor code
	let getCode: () => string;

	// terminal output
	const [terminalOutput, setTerminalOutput] = useState(terminalInitialText);

	const handleTerminalOutput = (output: string) => {
		setTerminalOutput((currentOutput: string) => currentOutput + output);
	}

	const clearTerminalOutput = () => {
		setTerminalOutput(() => terminalInitialText);
	}

	// feedback popup
	let handleFeedback = useRef((feedback: Feedback) => {});

	const handleRunPython = () => {
		clearTerminalOutput();
		runCode(getCode(),
			handleTerminalOutput,
			() => {},
			(err: string) => handleFeedback.current({feedback: err, error: true}));
	}

	return <>
		<Editor initialCode={props.initialCode} setGetCodeFunction={(getCodeFunction) => getCode = getCodeFunction} />
		<RunButton handleClick={handleRunPython} />
		<OutputTerminal output={terminalOutput} setHandleFeedback={(_handleFeedback: (feedback: Feedback) => void) => handleFeedback.current = _handleFeedback} />
	</>
}
