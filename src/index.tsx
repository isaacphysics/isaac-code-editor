import React from 'react';
import ReactDOM from 'react-dom';

import "./scss/cs/isaac.scss";
import { Sandbox } from './app/Sandbox';

import {Provider} from 'react-redux';
import {feedbackStore, setFeedback} from "./app/redux/FeedbackStore";

window.addEventListener("message", (event) => {
	// Do we trust the sender of this message?
	if (event.origin !== "https://isaaccomputerscience.org/") {
		// console.log("Event origin doesn't match isaac computer science!");
		// return; // commented for testing
	}

	if (event.data) {
		if(event.data.code) {
			const submitAnswer = (results: any[]) => {
				// @ts-ignore typescript doesn't believe me
				event.source.postMessage(results, event.origin);
			}

			ReactDOM.render(
				<Provider store={feedbackStore}>
					<Sandbox initialCode={event.data.code}
									 test={{functionName: event.data.functionName, tests: event.data.tests}}
											   submitAnswer={submitAnswer}/>
				</Provider>,
				document.getElementById("root")
			);
		} else if(event.data.message) {
			feedbackStore.dispatch(setFeedback({success: event.data.success, message: event.data.message}));
		}
	}
}, false);
