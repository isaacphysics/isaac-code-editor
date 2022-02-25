import {CodeMirrorTheme, ILanguage, PredefinedCode} from "./types";
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

export const IN_IFRAME = (() => {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
})();

// Demo code to show if editor is accessed directly (i.e. not from within an iframe)
export const DEMO_CODE: PredefinedCode = {
    setup: "",
    code:
        "def bubble_sort(list_of_numbers):\n" +
        "  for end in range(len(list_of_numbers) - 1, 1, -1):\n" +
        "    for j in range(0, end):\n" +
        "      if (list_of_numbers[j] > list_of_numbers[j + 1]):\n" +
        "          temp = list_of_numbers[j]\n" +
        "          list_of_numbers[j] = list_of_numbers[j + 1]\n" +
        "          list_of_numbers[j + 1] = temp\n" +
        "  return list_of_numbers\n" +
        "\n" +
        "sorted_list = bubble_sort([5, 1, 8, 5, 9, 10, 2, 1])\n" +
        "print(\"Sorted list: \" + str(sorted_list))",
    wrapCodeInMain: false,
    test: "startTest()\nif not (bubble_sort([5, 1, 8, 5, 9, 10, 2, 1]) == [1, 1, 2, 5, 5, 8, 9, 10]):\n\traise TestError(\"The 'bubble_sort' function is broken!\")\nendTest()",
    language: "python",
}