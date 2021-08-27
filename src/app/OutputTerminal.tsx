import {Feedback, FeedbackBanner} from "./FeedbackBanner";
import {useState} from "react";

export const OutputTerminal = (props: {output: string, setHandleFeedback: (handleFeedback: (feedback: Feedback) => void) => void}) => {
	const [feedback, setFeedback] = useState<Feedback | null>(null);
	const [feedbackDismissed, setFeedbackDismissed] = useState(false);

	props.setHandleFeedback((feedback: Feedback) => {
		setFeedback(feedback);
		setFeedbackDismissed(false);
	});

	const handleDismissed = () => setFeedbackDismissed(true);

	return <pre className="output-terminal bg-black text-white">
		{(feedback && !feedbackDismissed) ? <FeedbackBanner feedback={feedback} handleDismissed={handleDismissed} /> : null}
		<div className={"output-text p-2"}>{props.output}</div>
	</pre>
}