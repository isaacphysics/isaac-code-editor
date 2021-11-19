interface OutputTerminalProps {output?: string; feedbackMessage?: string, setFeedbackMessage?: (fm?: string) => void, succeeded?: boolean}

export const OutputTerminal = ({output, feedbackMessage, setFeedbackMessage, succeeded}: OutputTerminalProps) => {
	return <pre className="output-terminal bg-black text-white">

		{feedbackMessage &&
		// Feedback banner
		<div className={"feedback-banner w-100 p-2 " + (succeeded ? "feedback-success" : "feedback-error")}>
			<button className={"feedback-button"} onClick={() => setFeedbackMessage && setFeedbackMessage(undefined)}>&times;</button>
			{feedbackMessage}
		</div>}
		<div className={"output-text p-2"}>{output}</div>
	</pre>
}