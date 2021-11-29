import React, {useEffect, useRef} from "react";
import {Terminal} from "xterm";
import {FitAddon} from "xterm-addon-fit";
import {WebglAddon} from "xterm-addon-webgl"

var baseTheme = {
	foreground: '#F8F8F8',
	background: '#000000',
	selection: '#5DA5D533',
	black: '#1E1E1D',
	brightBlack: '#262625',
	red: '#CE5C5C',
	brightRed: '#FF7272',
	green: '#5BCC5B',
	brightGreen: '#72FF72',
	yellow: '#CCCC5B',
	brightYellow: '#FFFF72',
	blue: '#5D5DD3',
	brightBlue: '#7279FF',
	magenta: '#BC5ED1',
	brightMagenta: '#E572FF',
	cyan: '#5DA5D5',
	brightCyan: '#72F0FF',
	white: '#F8F8F8',
	brightWhite: '#FFFFFF'
};

interface OutputTerminalProps {setXTerm: (t: Terminal) => void, feedbackMessage?: string, clearFeedback?: () => void, succeeded?: boolean}

export const OutputTerminal = ({setXTerm, feedbackMessage, clearFeedback, succeeded}: OutputTerminalProps) => {

	const xtermDiv = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (null === xtermDiv.current) return;
		const newTerm = new Terminal({
			fontFamily: "Consolas, monospace",
			theme: baseTheme,
			cursorBlink: true
		});
		setXTerm(newTerm);
		newTerm.open(xtermDiv.current);

		let isWebglEnabled = false;
		try {
			newTerm.loadAddon(new WebglAddon());
			isWebglEnabled = true;
		} catch (e) {
			console.warn('WebGL addon threw an exception during load', e);
		}

		const fitAddon = new FitAddon();
		newTerm.loadAddon(fitAddon);
		fitAddon.fit();
		const fit = () => {
			fitAddon.fit();
		}
		window.addEventListener("resize", fit);

		// Allow scrolling inside the terminal to not scroll the outer window
		const stopScrollProp = (e: Event) => {
			e.preventDefault();
		}
		xtermDiv.current.addEventListener('wheel', stopScrollProp);
		xtermDiv.current.addEventListener('scroll', stopScrollProp);

		return () => {
			newTerm.dispose();
			window.removeEventListener("resize", fit);
			xtermDiv?.current?.removeEventListener('wheel', stopScrollProp);
			xtermDiv?.current?.removeEventListener('scroll', stopScrollProp);
		}
	}, []);

	return <>
		{feedbackMessage &&
		// Feedback banner
		<div className={"feedback-banner w-100 p-2 " + (succeeded ? "feedback-success" : "feedback-error")} style={{borderTopLeftRadius: "5px", borderTopRightRadius: "5px"}}>
			<span className={"feedback-message"}>{feedbackMessage}<button className={"feedback-button"} onClick={clearFeedback}>&times;</button></span>
		</div>}
		<div style={{height: "200px", backgroundColor: "#000000", borderBottomLeftRadius: "5px", borderBottomRightRadius: "5px", borderTopLeftRadius: feedbackMessage ? 0 : "5px", borderTopRightRadius: feedbackMessage ? 0 : "5px", padding: "10px 20px", paddingRight: "10px"}}>
			<div id={"output-terminal"} className={"w-100 h-100"} ref={xtermDiv} />
		</div>
	</>;
};