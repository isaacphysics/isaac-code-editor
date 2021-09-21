import {useEffect, useRef, useState} from "react";

import {EditorView, EditorState, basicSetup} from "@codemirror/basic-setup";
import {python as pythonHighlighting} from "@codemirror/lang-python";
import {keymap} from "@codemirror/view";
import {indentWithTab} from "@codemirror/commands";
import {useSelector} from "react-redux";

export const Editor = (props: {setGetCodeFunction: (getCode: () => string) => void}) => {
	const [editor, setEditor] = useState<EditorView | null>(null);
	const initCode = useSelector((state: any) => state?.initCode)

	// insert editor on render
	const editorContainer = useRef<HTMLPreElement>(null);
	useEffect(()  => {
		if(editor) // prevent two editors from appearing when rerendering
			editor.destroy();

		setEditor(new EditorView({
			state: EditorState.create({
				doc: initCode || "Loading...",
				extensions: [
					basicSetup,
					pythonHighlighting(),
					keymap.of([indentWithTab]) // about accessibility: https://codemirror.net/6/examples/tab/
				]
			}),
			parent: editorContainer.current as HTMLElement
		}));
	}, [initCode]);

	props.setGetCodeFunction(() => {
		return editor?.state.doc.toString() || "";
	});

	return <pre className="editor m-1" ref={editorContainer}/>
}