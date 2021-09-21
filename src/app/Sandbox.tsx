import {Editor} from "./Editor";
import {RunButton} from "./RunButton";
import {OutputTerminal} from "./OutputTerminal";
import React, {useState} from "react";
import {doChecks, runCode} from "./Python";
import {useDispatch, useSelector} from "react-redux";
import {setFeedback, setRunning} from "./redux/ReduxStore";

const terminalInitialText = "Program output:\n\n";

export const Sandbox = () => {
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
	const loaded = useSelector((state: any) => state?.loaded);
	const testCode = useSelector((state: any) => state?.test);
	const submitAnswer = useSelector((state: any) => state?.submitAnswer);

	const handleSuccess = () => {
		doChecks(testCode).then(result => {
			if (result.checkerSucceeded) {
				// dispatch(setFeedback({studentSucceeded: true, message: feedback.message}))
				submitAnswer(result.checkerOutput);
			} else {
				dispatch(setFeedback({studentSucceeded: false, message: result.checkerOutput}));
			}
		});
	}

	const handleError = (err: string) => dispatch(setFeedback({studentSucceeded: false, message: err}))

	const handleRunPython = () => {
		if(!loaded) return;
		clearTerminalOutput();
		dispatch(setRunning());
		runCode(getCode(),
			handleTerminalOutput,
			handleSuccess,
			handleError,
			{retainGlobals: false}
		)};

	return <>
		<Editor setGetCodeFunction={(getCodeFunction) => getCode = getCodeFunction} />
		<RunButton handleClick={handleRunPython} />
		<OutputTerminal output={terminalOutput} />
	</>
}
