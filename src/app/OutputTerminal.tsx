import React, {useEffect, useRef} from "react";
import {Terminal} from "xterm";
import {FitAddon} from "xterm-addon-fit";
import {WebglAddon} from "xterm-addon-webgl"

var baseTheme = {
	foreground: '#F8F8F8',
	background: '#000000',
	selection: '#FFB53F33',
	black: '#1E1E1D',
	brightBlack: '#262625',
	red: '#CE5C5C',
	brightRed: '#FF7272',
	green: '#5BCC5B',
	brightGreen: '#72FF72',
	yellow: '#CCCC5B',
	brightYellow: '#FFFF72',
	blue: '#e0a851',
	brightBlue: '#ffb53f',
	// blue: '#5D5DD3',
	// brightBlue: '#7279FF',
	magenta: '#BC5ED1',
	brightMagenta: '#E572FF',
	cyan: '#5DA5D5',
	brightCyan: '#72F0FF',
	white: '#F8F8F8',
	brightWhite: '#FFFFFF'
};

interface OutputTerminalProps {setXTerm: (t: Terminal) => void}

export const OutputTerminal = ({setXTerm}: OutputTerminalProps) => {

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
			console.warn("WebGL addon threw an exception during load", e);
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
		xtermDiv.current.addEventListener("wheel", stopScrollProp);
		xtermDiv.current.addEventListener("scroll", stopScrollProp);

		newTerm.attachCustomKeyEventHandler((e) => {
			// Don't process the key if it is ctrl-c (or cmd-c on Mac)
			// This means that the copy key event doesn't clear the terminal selection
			return !((e.ctrlKey || e.metaKey) && e.key === "c");
		});

		return () => {
			newTerm.dispose();
			window.removeEventListener("resize", fit);
			xtermDiv?.current?.removeEventListener("wheel", stopScrollProp);
			xtermDiv?.current?.removeEventListener("scroll", stopScrollProp);
		}
	}, []);

	return <div className={"output-terminal-container"}>
		<div id={"output-terminal"} className={"w-100 h-100"} ref={xtermDiv} />
	</div>;
};