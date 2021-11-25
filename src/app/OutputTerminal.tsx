import React, {RefObject} from "react";
import {useTick} from "./services/utils";

export interface Cursor {
	pos: number;
	show: boolean;
}

interface OutputTerminalProps {cursor: Cursor, output?: string; feedbackMessage?: string, clearFeedback?: () => void, succeeded?: boolean}

export const OutputTerminal = React.forwardRef(({cursor, output, feedbackMessage, clearFeedback, succeeded}: OutputTerminalProps, ref) => {

	const tick = useTick(500);

	// @ts-ignore Typescript can't work out that a ForwardedRef can be used like a normal ref
	return <pre ref={ref} id={"output-terminal"} tabIndex={0} className={`bg-black text-white`}>
		{feedbackMessage &&
			// Feedback banner
			<div className={"feedback-banner w-100 p-2 " + (succeeded ? "feedback-success" : "feedback-error")}>
				<span className={"feedback-message"}>{feedbackMessage}<button className={"feedback-button"} onClick={clearFeedback}>&times;</button></span>
			</div>
		}
		<div className={"output-text p-2"}>
			{cursor?.show && cursor.pos !== 0 ?
				<>{(output || "").slice(0, -cursor.pos)}{tick && <span style={{fontStyle: "normal", marginLeft: "-0.2rem", marginRight: "-4.3px"}}>|</span>}{(output || "").slice(-cursor.pos)}</>
				:
				<>{output}{(cursor?.show && tick) && <span style={{fontStyle: "normal", marginLeft: "-0.2rem", marginRight: "-1rem"}}>|</span>}</>
			}
		</div>
	</pre>
});