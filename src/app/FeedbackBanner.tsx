import {useDispatch, useSelector} from "react-redux";
import {dismissFeedback} from "./redux/ReduxStore";

export const FeedbackBanner = () => {
	const message = useSelector((state: any) => state.feedback?.message);
	const studentSucceeded = useSelector((state: any) => {
		return state.feedback?.studentSucceeded
	});

	const dispatch = useDispatch();
	const dismiss = () => dispatch(dismissFeedback());

	return <div className={"feedback-banner w-100 p-2 " + (studentSucceeded ? "feedback-success" : "feedback-error")}>
		<button className={"feedback-button"} onClick={dismiss}>&times;</button>
		{message}
	</div>
}