import React, {ForwardedRef, useEffect, useImperativeHandle, useRef, useState} from "react";

import {EditorView, EditorState, basicSetup} from "@codemirror/basic-setup";
import {python as pythonHighlighting} from "@codemirror/lang-python";
import {keymap, ViewUpdate} from "@codemirror/view";
import {indentWithTab} from "@codemirror/commands";

interface EditorProps {initCode?: string, setEditorCode: (newCode?: string) => void}

export const Editor = React.forwardRef(({initCode, setEditorCode}: EditorProps, ref: ForwardedRef<{getCode: () => string | undefined}>) => {

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

		setEditorCode(initCode);

		setEditor(new EditorView({
			state: EditorState.create({
				doc: initCode || "Loading...",
				extensions: [
					basicSetup,
					pythonHighlighting(),
					keymap.of([indentWithTab]), // about accessibility: https://codemirror.net/6/examples/tab/
					EditorView.updateListener.of((v: ViewUpdate) => {
						if (v.docChanged) {
							setEditorCode(v.state.doc.toString());
						}
					})
				]
			}),
			parent: editorRef.current as HTMLElement
		}));
	}, [initCode]);

	return <pre className="editor m-1" ref={editorRef}/>
});