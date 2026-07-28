import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    clearRecentDestinations,
    getRecentDestinations,
    saveRecentDestination,
} from "../lib/local-db/recentDestinations";

describe("recent destinations local storage", () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        await clearRecentDestinations();
        jest.useRealTimers();
    });

    test("stores and returns recent destinations newest first for a user", async () => {
        await saveRecentDestination(
            {
                name: "Zinnia Towers",
                fullAddress: "Zinnia Towers, North Avenue, Quezon City",
                coordinates: [121.02, 14.04],
            },
            "user-a"
        );
        await saveRecentDestination(
            {
                name: "2 Torre Lorenzo",
                fullAddress: "2 Torre Lorenzo, Taft Avenue, Manila",
                coordinates: [120.99, 14.56],
            },
            "user-a"
        );

        const recents = await getRecentDestinations("user-a");

        expect(recents).toHaveLength(2);
        expect(recents[0].name).toBe("2 Torre Lorenzo");
        expect(recents[1].name).toBe("Zinnia Towers");
    });

    test("deduplicates a destination and keeps it at the top", async () => {
        const destination = {
            name: "Zinnia Towers",
            fullAddress: "Zinnia Towers, North Avenue, Quezon City",
            coordinates: [121.02, 14.04] as [number, number],
        };

        await saveRecentDestination(destination, "user-a");
        await saveRecentDestination(destination, "user-a");

        const recents = await getRecentDestinations("user-a");

        expect(recents).toHaveLength(1);
        expect(recents[0].name).toBe("Zinnia Towers");
    });

    test("keeps destinations account-aware", async () => {
        await saveRecentDestination(
            {
                name: "User A Place",
                fullAddress: "A Address",
                coordinates: [121.0, 14.0],
            },
            "user-a"
        );
        await saveRecentDestination(
            {
                name: "User B Place",
                fullAddress: "B Address",
                coordinates: [121.1, 14.1],
            },
            "user-b"
        );

        expect((await getRecentDestinations("user-a"))[0].name).toBe("User A Place");
        expect((await getRecentDestinations("user-b"))[0].name).toBe("User B Place");
    });

    test("clears one user's destinations without touching another user", async () => {
        await saveRecentDestination(
            {
                name: "User A Place",
                fullAddress: "A Address",
                coordinates: [121.0, 14.0],
            },
            "user-a"
        );
        await saveRecentDestination(
            {
                name: "User B Place",
                fullAddress: "B Address",
                coordinates: [121.1, 14.1],
            },
            "user-b"
        );

        await clearRecentDestinations("user-a");

        expect(await getRecentDestinations("user-a")).toEqual([]);
        expect((await getRecentDestinations("user-b"))[0].name).toBe("User B Place");
    });
});
