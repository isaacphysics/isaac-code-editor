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
    input: () => Promise<string>,
    output: (s: string) => void,
    clear: () => void
}

export interface TestCallbacks {
    setTestInputs: (inputs?: string[]) => void;
    setTestRegex: (re?: string) => void;
    runCurrentTest: (currentOutput: string, allInputsMustBeUsed: boolean, successMessage?: string, failMessage?: string) => Promise<void>;
}

export interface ILanguage {
    runSetupCode: (printOutput: (output: string) => void, handleInput: () => Promise<string>, setupCode?: string, testCallbacks?: TestCallbacks) => Promise<string>,
    runTests: (output: string, handleInput: () => Promise<string>, testCode?: string, testCallbacks?: TestCallbacks) => Promise<string>,
    runCode: (code: string, printOutput: (output: string) => void, handleInput: () => Promise<string>, options: object, testCallbacks?: TestCallbacks) => Promise<string>,
    wrapInMain: (code: string, doChecks?: boolean) => string,
    testErrorSubclass: string
}


export interface ICodeMirrorTheme {
    languageSupport: LanguageSupport,
    theme: Extension,
    highlightStyle: HighlightStyle
}