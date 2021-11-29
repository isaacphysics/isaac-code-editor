import React, {useEffect, useRef} from "react";
import {Terminal} from "xterm";
import {FitAddon} from "xterm-addon-fit";
import {WebglAddon} from "xterm-addon-webgl"

var baseTheme = {
	foreground: '#F8F8F8',
	background: '#2D2E2C',
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

interface OutputTerminalProps {setXTerm: (t: Terminal) => void, output?: string; feedbackMessage?: string, clearFeedback?: () => void, succeeded?: boolean}

export const OutputTerminal = ({setXTerm, output, feedbackMessage, clearFeedback, succeeded}: OutputTerminalProps) => {

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

		// Allow scroll inside
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
	{/*	<pre id={"output-terminal"} tabIndex={0} className={`bg-black text-white`}>*/}
	{/*	{feedbackMessage &&*/}
	{/*		// Feedback banner*/}
	{/*		<div className={"feedback-banner w-100 p-2 " + (succeeded ? "feedback-success" : "feedback-error")}>*/}
	{/*			<span className={"feedback-message"}>{feedbackMessage}<button className={"feedback-button"} onClick={clearFeedback}>&times;</button></span>*/}
	{/*		</div>*/}
	{/*	}*/}
	{/*	/!*<div ref={xtermDiv} className={"output-text p-2"}>*!/*/}
	{/*	/!*	{output}*!/*/}
	{/*	/!*</div>*!/*/}
	{/*</pre>*/}
		<div style={{height: "200px", backgroundColor: "#2D2E2C", borderRadius: "5px", padding: "10px 20px", paddingRight: "10px"}}>
			<div id={"output-terminal"} className={"w-100 h-100"} ref={xtermDiv} />
		</div>
	</>

};