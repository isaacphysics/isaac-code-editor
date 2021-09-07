import {Editor} from "./Editor";
import {RunButton} from "./RunButton";
import {OutputTerminal} from "./OutputTerminal";
import React, {useState} from "react";
import {doChecks, runCode} from "./Python";
import {useDispatch} from "react-redux";
import {setFeedback, setRunning} from "./redux/FeedbackStore";

const terminalInitialText = "Program output:\n\n";

export const Sandbox = (props: {initialCode: string, test: {functionName: string, tests: any[]}, submitAnswer: (results: any[]) => void}) => {
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

	// feedback
	const dispatch = useDispatch();

	// handle clicking on run button
	const handleRunPython = () => {
		clearTerminalOutput();
		dispatch(setRunning());
		runCode(getCode(),
			handleTerminalOutput,
			() => {
				const testResult = doChecks(props.test.functionName, props.test.tests);
				if(!testResult.success) dispatch(setFeedback({success: false, message: testResult.message!}));
				else props.submitAnswer(testResult.results!);
			},
			(err: string) => dispatch(setFeedback({success: false, message: err}))
		)};

	return <>
		<Editor initialCode={props.initialCode} setGetCodeFunction={(getCodeFunction) => getCode = getCodeFunction} />
		<RunButton handleClick={handleRunPython} />
		<OutputTerminal output={terminalOutput} />
	</>
}
