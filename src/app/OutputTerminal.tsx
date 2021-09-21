import {FeedbackBanner} from "./FeedbackBanner";
import {useSelector} from "react-redux";

export const OutputTerminal = (props: {output: string}) => {
	const feedback = useSelector((state: any) => state?.feedback);

	return <pre className="output-terminal bg-black text-white">
		{feedback && <FeedbackBanner />}
		<div className={"output-text p-2"}>{props.output}</div>
	</pre>
}