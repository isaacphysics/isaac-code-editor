import React, {ForwardedRef, useEffect, useImperativeHandle, useRef, useState} from "react";

import {EditorView, EditorState, basicSetup} from "@codemirror/basic-setup";
import {keymap, ViewUpdate} from "@codemirror/view";
import {Transaction} from "@codemirror/state";
import {indentWithTab} from "@codemirror/commands";
import {history} from "@codemirror/history";
import {CodeMirrorTheme, EditorChange} from "./types";
import {THEMES} from "./constants";
import {pythonCodeMirrorTheme} from "./langages/python";
import {isDefined} from "./services/utils";
import {type} from "os";

interface EditorProps {initCode?: string; language?: string; updateHeight: (editorLines: number) => void; appendToChangeLog: (change: EditorChange) => void}

export const Editor = React.forwardRef(({initCode, language, updateHeight, appendToChangeLog}: EditorProps, ref: ForwardedRef<{getCode: () => string | undefined}>) => {

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

		const codeMirrorTheme: CodeMirrorTheme = (language ? THEMES.get(language) : undefined) ?? pythonCodeMirrorTheme;

		setEditor(new EditorView({
			state: EditorState.create({
				doc: initCode,
				extensions: [
					basicSetup,
					codeMirrorTheme.languageSupport,
					codeMirrorTheme.theme,
					codeMirrorTheme.highlightStyle,
					keymap.of([indentWithTab]), // about accessibility: https://codemirror.net/6/examples/tab/
					history(),
					EditorView.updateListener.of((v: ViewUpdate) => {
						const annotations = v.transactions?.map(t => t.annotation(Transaction.userEvent)).filter(isDefined);
						// A change JSON representation consists of a list of numbers and pairs. The numbers represent
						// unchanged portions of the document, and the pairs represent additions/deletions within the
						// document. Each value represents a section of the document, for example:
						//
						//  [456, [0, "egg"], 45] - characters 0-455 were unchanged, "egg" was added at index 456,
						//  the next 45 characters after "egg" were unchanged.
						//
						//  [[6, "ham"], 60, [6, "ham"], 10] - first 6 characters were deleted and replaced with "ham",
						//  the next 60 characters were unchanged, 6 characters after that were deleted and replaced with
						//  "ham", and the next 10 characters were unchanged
						const changes = v.changes?.toJSON();

						// Only keep changes that give us non-trivial information
						if (changes && annotations && (annotations.length > 0 || changes.length > 1 || typeof changes[0] !== "number")) {
							appendToChangeLog({
								changes,
								timestamp: Date.now(),
								annotations,
								selections: v.state.selection.toJSON().ranges
							});
						}
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