import {EditorView} from "@codemirror/basic-setup";
import {HighlightStyle, tags} from "@codemirror/highlight";
import {CodeMirrorTheme} from "../types";
import {sql} from "@codemirror/lang-sql";
import sqlite3InitModule, {type Sqlite3Static, type DatabaseApi}  from "@sqlite.org/sqlite-wasm";

const log = console.log;
const error = console.error;

let sqlite3: Sqlite3Static;
let db: DatabaseApi;
let currentDbLink: string;

// system queries
const QUERIES = {
    version: "select sqlite_version() as version",
    tables: `select name as "table" from sqlite_schema
      where type = 'table'
        and name not like 'sqlite_%'
        and name not like 'sqlean_%'`,
};

const setupSqlite3 = async () => {
    //const {default: sqlite3InitModule} = await import("@sqlite.org/sqlite-wasm");
    return await sqlite3InitModule({
        print: log,
        printErr: error,
    }).then((sql3) => {
        try {
            log('Running SQLite3 version', sql3.version.libVersion);
            sqlite3 = sql3;
            return sqlite3;
        } catch (err) {
            // @ts-ignore
            error(err.name, err.message);
        }
    });
}

const downloadDatabase = (sqlite3: any, link: string): Promise<DatabaseApi> => {
    return fetch(link)
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => {
            const p = sqlite3.wasm.allocFromTypedArray(arrayBuffer);
            const db = new sqlite3.oo1.DB();
            const rc = sqlite3.capi.sqlite3_deserialize(
                db.pointer, 'main', p, arrayBuffer.byteLength, arrayBuffer.byteLength,
                sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE
            );
            db.checkRc(rc);
            return db;
        }).catch((err) => {
            console.error(err);
            return new sqlite3.oo1.DB('/mydb.sqlite3', 'ct');
        });
};

export const runQuery = async (query: string, link = "NO_DB") => {
    if (!sqlite3) {
        await setupSqlite3();
    }
    if (currentDbLink !== link) {
        if (link !== "NO_DB") {
            db = await downloadDatabase(sqlite3, link);
            db.exec(QUERIES.tables);
        } else {
            db = new sqlite3.oo1.DB('/mydb.sqlite3', 'ct') as DatabaseApi;
        }
        currentDbLink = link;
    }
    // console.log('SQLite3 database opened, executing query:', query);
    let rows: string[][] = [];
    let columnNames: string[] = [];
    // db.exec({
    //     sql: QUERIES.version,
    //     rowMode: "array",
    //     // @ts-ignore
    //     resultRows: rows,
    // });
    // console.log('Version:', rows);
    // rows = [];
    // db.exec({
    //     sql: QUERIES.tables,
    //     rowMode: "array",
    //     // @ts-ignore
    //     resultRows: rows,
    // });
    // console.log('Tables:', rows);
    // rows = [];
    db.exec({
        sql: query,
        rowMode: "array",
        // @ts-ignore
        resultRows: rows,
        columnNames: columnNames,
    });
    return {rows, columnNames};
};

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