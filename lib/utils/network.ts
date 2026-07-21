// -----------------------------------------------------------------------------
// Connectivity helpers built on @react-native-community/netinfo.
//
// Used to (a) skip or short-circuit network calls that cannot succeed offline
// (e.g. Firestore server-only aggregation queries, Mapbox requests), and
// (b) drive an offline banner in the UI so an expected offline state is not
// surfaced to riders as a red error.
//
// NetInfo is a NATIVE module: it only works once the app has been rebuilt with
// the native code linked (`npx expo run:android` / a new dev-client / EAS build).
// On a JS-only reload of an older build, `NativeModule.RNCNetInfo` is null and
// touching NetInfo throws a fatal error. To stay crash-safe we load it defensively
// and, when it is unavailable, simply assume the device is online. Connectivity
// detection then lights up automatically after the next native rebuild — no code
// change required.
// -----------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import type { NetInfoState } from '@react-native-community/netinfo';

type NetInfoModule = typeof import('@react-native-community/netinfo').default;

let netInfo: NetInfoModule | null = null;
try {
    // Guarded require: this throws if the native module isn't linked yet.
    netInfo = require('@react-native-community/netinfo').default as NetInfoModule;
} catch {
    netInfo = null;
    if (__DEV__) {
        console.warn(
            'NetInfo native module unavailable — assuming online. Rebuild the app ' +
                '(npx expo run:android) to enable offline detection.'
        );
    }
}

/**
 * True when the device has a network connection that is (as far as the OS knows)
 * able to reach the internet. `isInternetReachable` can be null while unknown, so
 * we only treat an explicit `false` as offline to avoid false negatives on boot.
 */
function stateIsOnline(state: NetInfoState | null): boolean {
    if (!state) return true; // assume online until proven otherwise
    if (state.isConnected === false) return false;
    if (state.isInternetReachable === false) return false;
    return true;
}

/** One-shot connectivity check. Resolves true when the device is likely online. */
export async function isOnline(): Promise<boolean> {
    if (!netInfo) return true;
    try {
        const state = await netInfo.fetch();
        return stateIsOnline(state);
    } catch {
        return true; // never block work just because the probe itself failed
    }
}

/**
 * React hook returning the current online/offline state, updated live as
 * connectivity changes. Defaults to `true` so first render never flashes an
 * offline banner before the first NetInfo event arrives. When the native module
 * is unavailable it stays `true` and never subscribes.
 */
export function useIsOnline(): boolean {
    const [online, setOnline] = useState(true);

    useEffect(() => {
        if (!netInfo) return;
        let unsubscribe: (() => void) | undefined;
        try {
            unsubscribe = netInfo.addEventListener(state => {
                setOnline(stateIsOnline(state));
            });
            // Prime the value immediately so we don't wait for the first change event.
            netInfo.fetch().then(state => setOnline(stateIsOnline(state))).catch(() => {});
        } catch {
            // Native module went missing mid-session; stay optimistic.
        }
        return () => {
            try {
                unsubscribe?.();
            } catch {
                // ignore teardown failures
            }
        };
    }, []);

    return online;
}
