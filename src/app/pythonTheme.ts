import {EditorView} from "@codemirror/basic-setup";
import {tags, HighlightStyle} from "@codemirror/highlight";

export const pythonTheme = EditorView.theme({
    ".cm-gutters": {
        backgroundColor: "#FFFFFF"
    },
    "&": {
        color: "#545454"
    },
});

export const pythonHighlightStyle = HighlightStyle.define([
    {tag: tags.docString, color: "#008000"},
    {tag: tags.comment, color: "#696969"},
    {tag: tags.definition, color: "#007faa"},
    {tag: tags.function(tags.definition(tags.variableName)), color: "#007faa"},
    {tag: tags.keyword, color: "#7928a1"},
    {tag: tags.number, color: "#aa5d00"},
    {tag: tags.bool, color: "#aa5d00"},
    {tag: tags.lineComment, color: "#696969"},
    {tag: tags.string, color: "#008000"},
]);