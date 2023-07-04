import {EditorView} from "@codemirror/basic-setup";
import {HighlightStyle, tags} from "@codemirror/highlight";
import {CodeMirrorTheme} from "../types";
import {sql} from "@codemirror/lang-sql";
import sqlite3InitModule, {Sqlite3Static, DatabaseApi, Database}  from "@sqlite.org/sqlite-wasm";

const log = console.log;
const error = console.error;

let sqlite3: Sqlite3Static;

const downloadDatabase = (sqlite3: any, link: string): Promise<DatabaseApi> => {
    // Fetch with strict CORS mode.
    return fetch(link, {mode: 'no-cors'})
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => {
            const p = sqlite3.wasm.allocFromTypedArray(arrayBuffer);
            const db = new sqlite3.oo1.DB();
            const rc = sqlite3.capi.sqlite3_deserialize(
                db.pointer, 'main', p, arrayBuffer.byteLength, arrayBuffer.byteLength,
                sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE
                // Optionally:
                // | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
            );
            db.checkRc(rc);
            return db;
        });
};

export const runQuery = async (query: string, link?: string) => {
    log('Running SQLite3 version', sqlite3.version.libVersion);
    let db: DatabaseApi;
    if (link) {
        db = await downloadDatabase(sqlite3, link);
    } else {
        db = new sqlite3.oo1.DB('/mydb.sqlite3', 'ct') as DatabaseApi;
    }
    console.log('SQLite3 database opened, executing query:', query);
    // Your SQLite code here.
    db.exec(query);
};

sqlite3InitModule({
    print: log,
    printErr: error,
}).then((sqli3) => {
    try {
        sqlite3 = sqli3;
    } catch (err) {
        // @ts-ignore
        error(err.name, err.message);
    }
});

export const sqlTheme = EditorView.theme({
    ".cm-gutters": {
        backgroundColor: "#FFFFFF"
    },
    ".cm-line": {
        paddingLeft: "7px"
    },
    "&": {
        color: "#545454"
    },
});

export const sqlHighlightStyle = HighlightStyle.define([
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

export const sqlCodeMirrorTheme: CodeMirrorTheme = {
    languageSupport: sql(),
    theme: sqlTheme,
    highlightStyle: sqlHighlightStyle
}