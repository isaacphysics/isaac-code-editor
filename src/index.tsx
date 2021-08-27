import React from 'react';
import ReactDOM from 'react-dom';

import "./scss/cs/isaac.scss";
import { Sandbox } from './app/Sandbox';

window.addEventListener("message", (event) => {
	// Do we trust the sender of this message?
	if (event.origin !== "https://isaaccomputerscience.org/") {
		console.log("Event origin doesn't match isaac computer science!");
		// return; // commented for testing
	}

	if (event.data) {
		console.log("received data")
		console.log(event.data)

		ReactDOM.render(<Sandbox initialCode={event.data.code} />,
			document.getElementById("root")
		);
	}
}, false);
