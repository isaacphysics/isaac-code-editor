interface OutputTerminalProps {output?: string; feedbackMessage?: string, clearFeedback?: () => void, succeeded?: boolean}

export const OutputTerminal = ({output, feedbackMessage, clearFeedback, succeeded}: OutputTerminalProps) => {
	return <pre className="output-terminal bg-black text-white">
		{feedbackMessage &&
			// Feedback banner
			<div className={"feedback-banner w-100 p-2 " + (succeeded ? "feedback-success" : "feedback-error")}>
				<span className={"feedback-message"}>{feedbackMessage}<button className={"feedback-button"} onClick={clearFeedback}>&times;</button></span>
			</div>
		}
		<div className={"output-text p-2"}>
			{output}
		</div>
	</pre>
}