import React, {useEffect, useRef} from "react";
import {Terminal} from "@xterm/xterm";
import {FitAddon} from "@xterm/addon-fit";
import {WebglAddon} from "@xterm/addon-webgl"
import {ITerminal} from "./types";
import {ERRORS} from "./constants";

/**
 * Handling a single input character to the xterm terminal - will recurse, building up a string
 * output, until CRLF is input.
 */
const handleSingleInputChar = (xterm: Terminal, input: string, checkExecutionStopped: () => boolean) => new Promise<string>((resolve, reject) => {
	if (undefined === xterm || checkExecutionStopped()) {
		return reject(ERRORS.EXEC_STOP_ERROR);
	}
	const onDataListener = xterm.onData((s: string) => {
		if (checkExecutionStopped()) {
			onDataListener.dispose();
			reject(ERRORS.EXEC_STOP_ERROR);
			return;
		}
		// This does the recursive call by cleaning up the old listener and handling the next input
		const cleanUpAndRecurse = (newInput: string) => {
			onDataListener.dispose();
			handleSingleInputChar(xterm, newInput, checkExecutionStopped).then(resolve).catch(reject);
		}
		switch (s) {
			case '\u0003': // Ctrl+C
				const xtermSelection = xterm.getSelection();
				navigator.clipboard.writeText(xtermSelection).then(() => {
					console.log(`Copied: ${xtermSelection} to clipboard!`);
				}).catch(() => {
					console.log("Failed to copy selection to clipboard");
				}); // Could make this show a "copied to clipboard" popup?
				cleanUpAndRecurse(input);
				return;
			case '\u0016': // Ctrl+V
				navigator.clipboard.readText().then((s) => {
					cleanUpAndRecurse(input + s);
					xterm.write(s);
				}).catch(() => {
					cleanUpAndRecurse(input);
				});
				onDataListener.dispose();
				return;
			case '\r': // Enter
				onDataListener.dispose();
				xterm.write("\r\n");
				resolve(input);
				return;
			case '\n': // Enter (don't handle second character generated)
				return;
			case '\u007F': // Backspace (DEL)
				// Do not delete the prompt
				if (input.length > 0) {
					xterm.write('\b \b');
					cleanUpAndRecurse(input.slice(0, -1));
					return;
				}
				break;
			default: // Print all other characters for demo
				if (s >= String.fromCharCode(0x20) && s <= String.fromCharCode(0x7B) || s >= '\u00a0') {
					xterm.write(s);
					cleanUpAndRecurse(input + s);
					return;
				}
		}
		cleanUpAndRecurse(input);
		return;
	});
});

export const xtermInterface: (xterm: Terminal, checkExecutionStopped: () => boolean) => ITerminal = (xterm, checkExecutionStopped) => ({
	input: () => handleSingleInputChar(xterm,"", checkExecutionStopped),
	output: (output: string) => xterm.write(output.replace(/\n/g, "\r\n")),
	clear: () => {
		xterm.write('\x1bc');
		xterm.clear();
	}
});

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

interface OutputTerminalProps {setXTerm: (t: Terminal) => void; hidden: boolean}

export const OutputTerminal = ({setXTerm, hidden}: OutputTerminalProps) => {

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

	return <div hidden={hidden} className={"output-terminal-container"}>
		<div id={"output-terminal"} className={"w-100 h-100"} ref={xtermDiv} />
	</div>;
};
