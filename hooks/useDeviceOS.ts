import { useState, useEffect } from 'react';

export type DeviceOS = 'iOS' | 'Android' | 'Desktop' | 'Unknown';

export function useDeviceOS() {
    const [os, setOs] = useState<DeviceOS>('Unknown');

    useEffect(() => {
        //runs strictly in browser to safely read device type
        const ua = window.navigator.userAgent;
        if(/iPad|iPhone|iPod/.test(ua)) {
            setOs('iOS');
        } else if (/android/i.test(ua)) {
            setOs('Android');
        } else {
            setOs('Desktop');
        }
    }, []);
    return { os };
}