import {LanguageSupport} from "@codemirror/language"
import {Extension} from '@codemirror/state';
import {HighlightStyle} from "@codemirror/highlight";

export interface Feedback {
    succeeded: boolean;
    message: string;
    isTest?: boolean;
}

export interface PredefinedCode {
    setup?: string;
    code?: string;
    wrapCodeInMain?: boolean;
    test?: string;
    language?: string;
}

export interface ITerminal {
    input: () => Promise<string>;
    output: (s: string) => void;
    clear: () => void;
}

export interface TestCallbacks {
    setTestInputs: (inputs?: string[]) => void;
    setTestRegex: (re?: string) => void;
    runCurrentTest: (currentOutput: string, allInputsMustBeUsed?: boolean, successMessage?: string, failMessage?: string) => {error: string, isTestError: boolean} | undefined;
}

export interface ILanguage {
    runSetupCode: (printOutput: (output: string) => void, handleInput: () => (Promise<string> | string), setupCode?: string, testCallbacks?: TestCallbacks) => Promise<string>;
    runTests: (output: string, handleInput: () => (Promise<string> | string), shouldStopExecution: (stop: boolean) => boolean, testCode?: string, testCallbacks?: TestCallbacks) => Promise<string>;
    runCode: (code: string, printOutput: (output: string) => void, handleInput: () => (Promise<string> | string), shouldStopExecution: (stop: boolean) => boolean, options: object, testCallbacks?: TestCallbacks) => Promise<string>;
    wrapInMain: (code: string, doChecks?: boolean) => string;
    testingLibrary: string;
    requiresBundledCode: boolean;
    syncTestInputHander: boolean;
}

export interface IFileSystem {
    read: (s: string) => string;
    write: (s: string, append: boolean) => void;
    clear: () => void;
}

export interface CodeMirrorTheme {
    languageSupport: LanguageSupport;
    theme: Extension;
    highlightStyle: HighlightStyle;
}

export interface EditorChange {
    // Each change is either:
    // - a number representing a consecutive list of unchanged characters
    // - a [number, string], where the number represents the characters removed, and the string is the new characters added
    // A list of these gives a modification to the whole document at a point in "time"
    changes: (number | [number, string])[];
    timestamp: number;
    annotations: string[];
    selections: {anchor: number; head: number}[];
}

export interface EditorSnapshot {
    snapshot: string;
    timestamp: number;
    compiled: boolean;
    error?: string;
}
