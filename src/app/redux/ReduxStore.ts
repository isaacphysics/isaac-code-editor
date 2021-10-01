import {configureStore} from '@reduxjs/toolkit'

export interface Feedback {
	studentSucceeded: boolean;
	message: string;
}

export const reduxStore = configureStore({
	reducer: (state, action) => {
		switch (action.type) {
			case "INITIAL_SETUP":
				return {
					...state,
					loaded: true,
					initCode: action.payload.initCode,
					setupCode: action.payload.setupCode,
					test: action.payload.test,
					submitAnswer: action.payload.submitAnswer
				}
			case "SET_FEEDBACK":
				return {
					...state,
					running: false,
					feedback: action.payload
				};
			case "DISMISS_FEEDBACK":
				return {
					...state,
					feedback: undefined
				}
			case "SET_RUNNING":
				return {
					...state,
					running: true,
					feedback: undefined
				}
			default:
				return state;
		}
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredPaths: ['payload.submitAnswer', 'submitAnswer'],
			},
		}),
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

export const initializeEditor = (initCode: string, setupCode: string, test: string, submitAnswer: (checkerOutput: string) => void) => {
	return {
		type: "INITIAL_SETUP",
		payload: {
			initCode,
			setupCode,
			test,
			submitAnswer
		}
	}
}