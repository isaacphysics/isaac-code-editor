import React, {ForwardedRef, useEffect, useImperativeHandle, useRef, useState} from "react";

import {EditorView, EditorState, basicSetup} from "@codemirror/basic-setup";
import {keymap, ViewUpdate} from "@codemirror/view";
import {indentWithTab} from "@codemirror/commands";
import {ICodeMirrorTheme} from "./types";
import {THEMES} from "./constants";
import {pythonCodeMirrorTheme} from "./langages/Python";

interface EditorProps {initCode?: string; language?: string; updateHeight: (editorLines: number) => void}

export const Editor = React.forwardRef(({initCode, language, updateHeight}: EditorProps, ref: ForwardedRef<{getCode: () => string | undefined}>) => {

	const [editor, setEditor] = useState<EditorView | null>(null);

	const editorRef = useRef<HTMLPreElement>(null);

	// Expose editor.state.doc.toString() to the parent component
	useImperativeHandle<{getCode: () => string | undefined}, {getCode: () => string | undefined}>(ref, () => ({
		getCode: () => editor ? editor.state.doc.toString() : undefined
	}), [editor]);

	// Insert editor on initCode change
	useEffect(()  => {
		// Make sure the forwarded ref is actually a ref object (to appease TS)
		if (editorRef === null || typeof editorRef === "function") return;

		// Prevent two editors from appearing when re-rendering
		if (editor) {
			editor.destroy();
		}

		const codeMirrorTheme: ICodeMirrorTheme = (language ? THEMES.get(language) : undefined) ?? pythonCodeMirrorTheme;

		setEditor(new EditorView({
			state: EditorState.create({
				doc: initCode,
				extensions: [
					basicSetup,
					codeMirrorTheme.languageSupport,
					codeMirrorTheme.theme,
					codeMirrorTheme.highlightStyle,
					keymap.of([indentWithTab]), // about accessibility: https://codemirror.net/6/examples/tab/
					EditorView.updateListener.of((v: ViewUpdate) => {
						if (v.startState.doc.lines !== v.state.doc.lines) {
							// Send a height update if the number of lines change
							updateHeight(v.state.doc.lines);
						}
					})
				]
			}),
			parent: editorRef.current as HTMLElement
		}));
	}, [initCode]);

	return <pre className="editor" ref={editorRef} />
});