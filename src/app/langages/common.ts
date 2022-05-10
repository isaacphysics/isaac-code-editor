import {TestCallbacks} from "../types";

export function startTestTemplate(inputs: any, regex: any, args: number, validateInputs: (inputs: any) => string[] | undefined, validateRegex: (regex: any) => string | undefined, throwNameError: () => void, throwArgError: () => void, testCallbacks?: TestCallbacks) {
    if (undefined === testCallbacks) {
        throwNameError();
        return; // to appease TS - the above function will throw an error everytime however
    }
    if (0 > args || args > 2) {
        throwArgError();
        return;
    }
    testCallbacks.setTestInputs(args < 1 ? undefined : validateInputs(inputs));
    testCallbacks.setTestRegex(args < 2 ? undefined : validateRegex(regex));
}

export function endTestTemplate(testSuccess: any, testFail: any, allInputsMustBeUsed: any, args: number, validateSuccessMessage: (message: any) => string | undefined, validateFailMessage: (message: any) => string | undefined, validateUseAllInputs: (bool: any) => boolean | undefined, throwNameError: () => void, throwArgError: () => void, outputSinceLastTest: string, testCallbacks?: TestCallbacks) {
    if (undefined === testCallbacks) {
        throwNameError();
        return; // to appease TS - the above function will throw an error everytime however
    }
    if (0 > args || args > 3) {
        throwArgError();
        return;
    }
    let successMessage = args < 1 ? undefined : validateSuccessMessage(testSuccess);
    let failMessage = args < 2 ? undefined : validateFailMessage(testFail);
    let useAllInputs = args < 3 ? undefined : validateUseAllInputs(allInputsMustBeUsed);

    // Run test
    const error = testCallbacks.runCurrentTest(outputSinceLastTest, useAllInputs, successMessage, failMessage);
    if (error) {
        throw error;
    }
}