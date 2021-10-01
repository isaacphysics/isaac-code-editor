import {Editor} from "./Editor";
import {RunButton} from "./RunButton";
import {OutputTerminal} from "./OutputTerminal";
import React, {useState} from "react";
import {doChecks, runCode, runSetupCode} from "./Python";
import {useDispatch, useSelector} from "react-redux";
import {setFeedback, setRunning} from "./redux/ReduxStore";

const terminalInitialText = "Program output:\n\n";

export const Sandbox = () => {
	// editor code
	let getCode: () => string;

	// terminal output
	const [terminalOutput, setTerminalOutput] = useState(terminalInitialText);
	let terminalOutputTemp = terminalOutput; // useState takes a while to update, this variable should always be up-to-date

	const handleTerminalOutput = (output: string) => {
		terminalOutputTemp += output;
		setTerminalOutput((currentOutput: string) => currentOutput + output);
	}

	const clearTerminalOutput = () => {
		terminalOutputTemp = terminalInitialText;
		setTerminalOutput(() => terminalInitialText);
	}

	// feedback
	const dispatch = useDispatch();

	// handle clicking on run button
	const loaded = useSelector((state: any) => state?.loaded);
	const setupCode = useSelector((state: any) => state?.setupCode);
	const testCode = useSelector((state: any) => state?.test);
	const submitAnswer = useSelector((state: any) => state?.submitAnswer);

	const handleSuccess = () => {
		doChecks(testCode, getCode(), terminalOutputTemp).then(result => {
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
		if (!loaded) return;
		clearTerminalOutput();
		dispatch(setRunning());

		runSetupCode(setupCode || "").then(() => {
			runCode(getCode(),
				handleTerminalOutput,
				handleSuccess,
				handleError,
				{retainGlobals: false}
			);
		});
	}

	return <>
		<Editor setGetCodeFunction={(getCodeFunction) => getCode = getCodeFunction} />
		<RunButton handleClick={handleRunPython} />
		<OutputTerminal output={terminalOutput} />
	</>
}
