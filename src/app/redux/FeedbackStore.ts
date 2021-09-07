import {configureStore} from '@reduxjs/toolkit'
import {Feedback} from "../FeedbackBanner";

export const feedbackStore = configureStore({
	reducer: (state, action) => {
		switch (action.type) {
			case "SET_FEEDBACK":
				return {
					running: false,
					feedback: action.payload
				};
			case "DISMISS_FEEDBACK":
				return {
					running: false,
					feedback: {success: false, message: ""}
				}
			case "SET_RUNNING":
				return {
					running: true,
					feedback: {success: false, message: ""}
				}
			default:
				return state;
		}
	},
});

export const setFeedback = (feedback: Feedback) => {
	return {
		type: "SET_FEEDBACK",
		payload: feedback
	}
}

export const dismissFeedback = () => {
	return {
		type: "DISMISS_FEEDBACK"
	}
}

export const setRunning = () => {
	return {
		type: "SET_RUNNING"
	}
}