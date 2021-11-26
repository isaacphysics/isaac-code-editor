import React, {RefObject} from "react";
import {useTick} from "./services/utils";

export interface Cursor {
	pos: number;
	show: boolean;
}

interface OutputTerminalProps {cursor: Cursor, output?: string; feedbackMessage?: string, clearFeedback?: () => void, succeeded?: boolean}

export const OutputTerminal = React.forwardRef(({cursor, output, feedbackMessage, clearFeedback, succeeded}: OutputTerminalProps, ref) => {

	// This is used to make the input cursor blink, 1 cycle every second
	const tick = useTick(500);

	// Each element of the output needs to be wrapped in a span with a unique id, so that we can work out which
	// character the user clicks on in the input handler
	const spannedOutput = (output || "").split('').map((s, index) => <span key={index} id={`${(output?.length as number) - index}`}>{s}</span>)

	// This places the cursor element in the correct place in the output string, by assuming the font width and
	// using negative margins
	const outputWithCursor = cursor?.show && cursor.pos !== 0
		? <>
			{spannedOutput.slice(0, -cursor.pos)}
			{tick && <span style={{fontStyle: "normal", marginLeft: "-0.2rem", marginRight: "-4.3px"}}>|</span>}
			{spannedOutput.slice(-cursor.pos)}
		</>
		: <>
			{spannedOutput.slice(0)}
			{cursor?.show && tick && <span style={{fontStyle: "normal", marginLeft: "-0.2rem", marginRight: "-4.3px"}}>|</span>}
		</>;

	// @ts-ignore Typescript can't work out that a ForwardedRef can be used like a normal ref
	return <pre ref={ref} id={"output-terminal"} tabIndex={0} className={`bg-black text-white`}>
		{feedbackMessage &&
			// Feedback banner
			<div className={"feedback-banner w-100 p-2 " + (succeeded ? "feedback-success" : "feedback-error")}>
				<span className={"feedback-message"}>{feedbackMessage}<button className={"feedback-button"} onClick={clearFeedback}>&times;</button></span>
			</div>
		}
		<div className={"output-text p-2"}>
			{outputWithCursor}
		</div>
	</pre>
});