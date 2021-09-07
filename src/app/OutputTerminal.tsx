import {FeedbackBanner} from "./FeedbackBanner";
import {useSelector} from "react-redux";

export const OutputTerminal = (props: {output: string}) => {
	const feedbackMessage = useSelector((state: any) => state?.feedback.message);

	return <pre className="output-terminal bg-black text-white">
		{feedbackMessage && <FeedbackBanner />}
		<div className={"output-text p-2"}>{props.output}</div>
	</pre>
}