// -----------------------------------------------------------------------------
// Connectivity helpers built on @react-native-community/netinfo.
//
// Used to (a) skip or short-circuit network calls that cannot succeed offline
// (e.g. Firestore server-only aggregation queries, Mapbox requests), and
// (b) drive an offline banner in the UI so an expected offline state is not
// surfaced to riders as a red error.
// -----------------------------------------------------------------------------

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

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
    try {
        const state = await NetInfo.fetch();
        return stateIsOnline(state);
    } catch {
        return true; // never block work just because the probe itself failed
    }
}

/**
 * React hook returning the current online/offline state, updated live as
 * connectivity changes. Defaults to `true` so first render never flashes an
 * offline banner before the first NetInfo event arrives.
 */
export function useIsOnline(): boolean {
    const [online, setOnline] = useState(true);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setOnline(stateIsOnline(state));
        });
        // Prime the value immediately so we don't wait for the first change event.
        NetInfo.fetch().then(state => setOnline(stateIsOnline(state))).catch(() => {});
        return unsubscribe;
    }, []);

    return online;
}
