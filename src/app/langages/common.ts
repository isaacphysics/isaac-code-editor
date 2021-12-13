import {TestCallbacks} from "../types";

export function startTestTemplate(inputs: any, regex: any, args: number, validateInputs: (inputs: any) => string[] | undefined, validateRegex: (regex: any) => string | undefined, throwNameError: () => void, throwArgError: () => void, testCallbacks?: TestCallbacks) {
    if (undefined === testCallbacks) {
        throwNameError();
        return; // to appease TS - the above function will throw an error everytime however
    }
    if (args !== 2 && args !== 0) {
        throwArgError();
        return;
    }
    if (args === 0) {
        testCallbacks.setTestInputs(undefined);
        testCallbacks.setTestRegex(undefined);
        return;
    }
    testCallbacks.setTestInputs(validateInputs(inputs));
    testCallbacks.setTestRegex(validateRegex(regex));
}

export function endTestTemplate(testSuccess: any, testFail: any, allInputsMustBeUsed: any, args: number, validateSuccessMessage: (message: any) => string | undefined, validateFailMessage: (message: any) => string | undefined, validateUseAllInputs: (bool: any) => boolean | undefined, throwNameError: () => void, throwArgError: () => void, outputSinceLastTest: string, testCallbacks?: TestCallbacks) {
    if (undefined === testCallbacks) {
        throwNameError();
        return; // to appease TS - the above function will throw an error everytime however
    }

    if (args !== 3 && args !== 2 && args !== 0) {
        throwArgError();
        return;
    }

    let successMessage = validateSuccessMessage(testSuccess);
    let failMessage = validateFailMessage(testFail);
    let useAllInputs = validateUseAllInputs(allInputsMustBeUsed) ?? true;

    // Run test
    const error = testCallbacks.runCurrentTest(outputSinceLastTest, useAllInputs, successMessage, failMessage);
    if (error) {
        throw error;
    }
}