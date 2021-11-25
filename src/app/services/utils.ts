import {RefObject, useCallback, useEffect, useRef, useState} from "react";

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

    const handleReceive = useCallback(e => {
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

// export const useFocused = (refObject?: RefObject<HTMLElement>) => {
//
//     const [isFocused, setIsFocused] = useState<boolean>(false);
//
//     useEffect(() => {
//         if (!isDefined(refObject) || !isDefined(refObject.current)) return;
//
//         const refObjectCopy = refObject?.current;
//
//         const onFocusIn = () => {
//             console.log("Focusing");
//             setIsFocused(true);
//         }
//
//         const onFocusOut = () => { setIsFocused(false); }
//
//         refObject.current.addEventListener("focusin", onFocusIn);
//         refObject.current.addEventListener("focusout", onFocusOut);
//
//         return () => {
//             refObjectCopy.removeEventListener("focusin", onFocusIn);
//             refObjectCopy.removeEventListener("focusout", onFocusOut);
//         }
//     }, [refObject]);
//
//     return isFocused;
// }

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

export const noop = () => undefined;