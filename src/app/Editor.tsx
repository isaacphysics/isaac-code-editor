import {useEffect, useRef, useState} from "react";

import {EditorView, EditorState, basicSetup} from "@codemirror/basic-setup";
import {python as pythonHighlighting} from "@codemirror/lang-python";
import {keymap} from "@codemirror/view";
import {indentWithTab} from "@codemirror/commands";

export const Editor = (props: {initialCode: string, setGetCodeFunction: (getCode: () => string) => void}) => {
	const [editor, setEditor] = useState<EditorView | null>(null);

	// insert editor on render
	const editorContainer = useRef<HTMLPreElement>(null);
	useEffect(()  => {
		if(editor) editor.destroy(); // prevent two editors from appearing from when using hot reload
		setEditor(new EditorView({
			state: EditorState.create({
				doc: props.initialCode,
				extensions: [
					basicSetup,
					pythonHighlighting(),
					keymap.of([indentWithTab]) // about accessibility: https://codemirror.net/6/examples/tab/
				]
			}),
			parent: editorContainer.current as HTMLElement
		}));
	}, []);

	props.setGetCodeFunction(() => {
		return editor?.state.doc.toString() || "";
	});

	return <pre className="editor m-1" ref={editorContainer}/>
}