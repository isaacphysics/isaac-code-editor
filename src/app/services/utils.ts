import {RefObject, useCallback, useEffect, useRef, useState} from "react";
// import {EditorChange} from "../types";

/**
 * This provides a simple interface for post message passing in-between domains.
 *
 * @param uid               Unique identifier of this particular message conversation
 * @param iFrameRef         A React RefObject pointing to an iframe. If this is undefined, the hook
 *                          will wait for the first message that has data in the correct format, and
 *                          then send messages to that domain.
 * @param replyCallback     An optional callback which lets you reply to incoming messages via the
 *                          MessageEventSource. Should be a callback that takes the returned object.
 */
export function useIFrameMessages(uid: string, iFrameRef?: RefObject<HTMLIFrameElement>, replyCallback?: (data: Record<string, unknown>) => (Record<string, unknown> | void)): {receivedData: Record<string, unknown> | undefined, sendMessage: (obj: Record<string, unknown>) => void} {

    const uidRef = useRef(uid);

    const [receivedData, setReceivedData] = useState(undefined);

    const [targetDomainSource, setTargetDomainSource] = useState<MessageEventSource>();
    const [targetDomainOrigin, setTargetDomainOrigin] = useState<string>();

    const sendMessage = useCallback((obj: Record<string, unknown>) => {

        obj.uid = uidRef.current;

        if (typeof iFrameRef === 'object' && iFrameRef?.current) {
            iFrameRef.current.contentWindow?.postMessage(obj, iFrameRef.current.src);
        } else if (undefined !== targetDomainSource && undefined !== targetDomainOrigin) {
            // @ts-ignore
            targetDomainSource.postMessage(obj, targetDomainOrigin);
        } else {
            // This should only happen if undefined foreignDomain and no message is received yet
            console.log("If foreignDomain is undefined, useIFrameMessages can only reply to messages (i.e. can send only after the first message has been received)");
        }
    }, [targetDomainSource, targetDomainOrigin, uidRef, iFrameRef]);

    const handleReceive = useCallback((e: any) => {
        // Make sure we ignore messages from this domain
        if (e.origin === window.origin) return;

        // Make sure that the data is what we expect, and that it has a correct uid
        if (!(typeof e.data === 'object' && e.data !== null && !Array.isArray(e.data) && e.data.hasOwnProperty('uid')
            && e.data.uid === uidRef.current)) {
            return;
        }

        if (e.data.hasOwnProperty('type')) {
            if (!targetDomainSource) {
                setTargetDomainSource(e.source);
                setTargetDomainOrigin(e.origin);
            }
            setReceivedData(e.data);
            if (replyCallback && e.source) {
                e.source.postMessage(replyCallback(e.data));
            }
        }
    },[uidRef, replyCallback, setReceivedData, targetDomainSource, setTargetDomainSource, setTargetDomainOrigin]);

    useEffect(() => {
        window.addEventListener('message', handleReceive);
        return () => {
            window.removeEventListener('message', handleReceive);
        }
    }, [handleReceive]);

    return {receivedData, sendMessage};
}

// undefined|null checker and type guard all-in-wonder.
// Why is this not in Typescript?
export function isDefined<T>(value: T | undefined | null): value is T {
    return (value as T) !== undefined && (value as T) !== null;
}

export const useTick = (interval: number) => {
    const intervalRef = useRef(interval);
    const [clockOn, setClockOn] = useState<boolean>(false);

    useEffect(() => {
        const ticker = setTimeout(() => {
            setClockOn(current => !current);
        }, intervalRef.current);
        return () => clearTimeout(ticker);
    });
    return clockOn;
}

// Listens for multiple events with a generic event listener, and only execute the one that gets an event first,
// cleaning up the ones that don't get called
export const addMultipleEventListener = (el: HTMLElement, eventTypes: string[], f: (e: Event) => void, options?: AddEventListenerOptions) => {
    const handler = (e: Event) => {
        eventTypes.forEach((_e) => {
            if (e.type !== _e) {
                el.removeEventListener(_e, handler);
            }
        });
        f(e);
    }
    eventTypes.forEach((eventType) => {
        el.addEventListener(eventType, handler, options);
    });
}

export function tryCastString(value: unknown) {
    if (undefined === value || null === value || "" === value) {
        return undefined;
    } else {
        return value as string;
    }
}

export const noop = () => {};


// --- Utility functions for logging WIP ---
//
// const padChangeWithZeros = (change: (number | [number, string])[]): (number | [number, string])[] => {
//     let i = 0;
//     let paddedChange = Array.from(change);
//     while (i < paddedChange.length) {
//         if (typeof paddedChange[i] !== "number") {
//             if (i == 0) {
//                 paddedChange = [0, ...paddedChange];
//             } else if (typeof paddedChange[i - 1] !== "number") {
//                 const prev = paddedChange.slice(0, i);
//                 const after = paddedChange.slice(i, paddedChange.length);
//                 paddedChange = [...prev, 0, ...after];
//             }
//             if (i + 1 == paddedChange.length) {
//                 paddedChange = [...paddedChange, 0];
//             }
//         }
//         i++;
//     }
//     return paddedChange;
// };
//
// const combineTwo = (changeA: EditorChange, changeB: EditorChange): EditorChange | undefined => {
//     const annotationA = changeA.annotations[0];
//     const annotationB = changeB.annotations[0];
//
//     // Not going to merge two changes if the annotations don't match
//     if (annotationA !== annotationB) {
//         return;
//     }
//
//     const getChangeLength = (c : number | [number, string]) => {
//         if (typeof c === "number") return c;
//         return c[1].length;
//     };
//
//     // Otherwise, switch on annotation type and work out if we can merge
//     if (annotationA === "input.type") {
//         const changesA = padChangeWithZeros(changeA.changes);
//         const changesB = padChangeWithZeros(changeB.changes);
//     }
//
//     return;
// };
//
// export const squashLogs = (changeLog: EditorChange[]) => {
//
//     const changesWithAnnotations = changeLog.filter(c => isDefined(c.annotations?.[0]));
//
//     const resultArray: (EditorChange | undefined)[] = Array.from(Array(changesWithAnnotations.length).fill(undefined));
//     resultArray[0] = changesWithAnnotations[0];
//     let i = 1;
//     let j = 0;
//     while (i < changesWithAnnotations.length) {
//         const changeA = resultArray[j] as EditorChange;
//         const changeB = changesWithAnnotations[i];
//         const combined = combineTwo(changeA, changeB);
//         if (combined) {
//             resultArray[j] = combined;
//         } else {
//             resultArray[j + 1] = changeB;
//             j++;
//         }
//         i++;
//     }
//
//     return resultArray.slice(0, j + 1);
// };
