export interface Feedback {
	feedback: string;
	error: boolean;
}

export const FeedbackBanner = (props: {feedback: Feedback, handleDismissed: () => void}) => {
	console.log("updated feedback")
	return <div className={"feedback-banner w-100 p-2 " + (props.feedback.error ? "feedback-error" : "feedback-success")}>
		<button className={"feedback-button"} onClick={props.handleDismissed}>&times;</button>
		{props.feedback.feedback}
	</div>
}