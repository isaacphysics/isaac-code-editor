import {CodeMirrorTheme, ILanguage} from "./types";
import {pythonCodeMirrorTheme, pythonLanguage} from "./langages/python";
import {javaScriptCodeMirrorTheme, javaScriptLanguage} from "./langages/javascript";

export const UNDEFINED_CHECKER_RESULT = "UNDEFINED_CHECKER_RESULT";

export const ERRORS = {
    TIME_LIMIT_ERROR: "TimeLimitError",
    EXTERNAL_ERROR: "ExternalError",
    TEST_ERROR: "TestError"
}

export const MESSAGE_TYPES = {
    INITIALISE: "initialise",
    FEEDBACK: "feedback",
    RESIZE: "resize",
    CHECKER: "checker",
    SETUP_FAIL: "setupFail"
}

export const EXEC_STATE = {
    RUNNING: "RUNNING",
    CHECKING: "CHECKING",
    STOPPED: "STOPPED"
}

export const LANGUAGES = new Map<string, ILanguage>([
    ["python", pythonLanguage],
    ["javascript", javaScriptLanguage]
]);

export const THEMES = new Map<string, CodeMirrorTheme>([
    ["python", pythonCodeMirrorTheme],
    ["javascript", javaScriptCodeMirrorTheme]
]);