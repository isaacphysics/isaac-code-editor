import React from 'react';
import ReactDOM from 'react-dom';

import "./scss/cs/isaac.scss";
import { Sandbox } from './app/Sandbox';

import {Provider} from 'react-redux';
import {initializeEditor, reduxStore, setFeedback} from "./app/redux/ReduxStore";

window.addEventListener("message", (event) => {
	// Do we trust the sender of this message?
	if (event.origin !== "https://isaaccomputerscience.org/") {
		// console.log("Event origin doesn't match isaac computer science!");
		// return; // commented for testing
	}

	if (event.data) {
		console.log("received data", event.data);

		/** The editor can receive two types of messages
		 * Initial messages, used to pass the initial code in the editor and the test to perform
		 * {
		 *     type: "INIT",
		 *     code: "# Your code here",
		 *     test: "checkerOutput = [1, 2, 3, 5]"
		 * }
		 *
		 * Feedback messages, to indicate whether the student was correct or not
		 * {
		 *     type: "FEEDBACK",
		 *     studentSucceeded: true,
		 *     message: "Congratulations, you passed the test!"
		 * }
		 */

		if(event.data.type === "INIT") {
			const submitAnswer = (checkerOutput: string) => {
				// @ts-ignore typescript doesn't believe me
				event.source.postMessage({checkerOutput}, event.origin);
			}
			reduxStore.dispatch(initializeEditor(event.data.code, event.data.test, submitAnswer));
		} else if(event.data.type === "FEEDBACK") {
			reduxStore.dispatch(setFeedback({studentSucceeded: event.data.studentSucceeded, message: event.data.message}));
		}
	}
}, false);

ReactDOM.render(
	<Provider store={reduxStore}>
		<Sandbox />
	</Provider>,
	document.getElementById("root")
);