import { useSyncExternalStore } from 'react';

export type DeviceOS = 'iOS' | 'Android' | 'Desktop' | 'Unknown';

function detectOS(): DeviceOS {
    const ua = window.navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
    if (/android/i.test(ua)) return 'Android';
    return 'Desktop';
}

// da device doesn't magically become an iphone halfway thru a session, so
// there's genuinely nothing to subscribe to. no-op unsubscribe on purpose.
const neverChanges = () => () => {};

// server has no `navigator`, so it renders 'Unknown' and React swaps in the
// real value on hydration. keeps server + client html identical = no mismatch.
const onServer = (): DeviceOS => 'Unknown';

export function useDeviceOS() {
    // used to be useState + useEffect, but that fires a 2nd render on every
    // single mount just to learn something the browser already knew.
    const os = useSyncExternalStore(neverChanges, detectOS, onServer);
    return { os };
}
