import {useDispatch, useSelector} from "react-redux";
import {dismissFeedback} from "./redux/FeedbackStore";

export interface Feedback {
	success: boolean;
	message: string;
}

export const FeedbackBanner = () => {
	const message = useSelector((state: any) => state.feedback.message);
	const success = useSelector((state: any) => state.feedback.success);

	const dispatch = useDispatch();
	const dismiss = () => dispatch(dismissFeedback());

	return <div className={"feedback-banner w-100 p-2 " + (success ? "feedback-success" : "feedback-error")}>
		<button className={"feedback-button"} onClick={dismiss}>&times;</button>
		{message}
	</div>
}