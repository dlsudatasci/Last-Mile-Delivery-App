export const Accuracy = {
    BestForNavigation: 6,
};

export const hasStartedLocationUpdatesAsync = jest.fn(() =>
    Promise.resolve(false)
);

export const stopLocationUpdatesAsync = jest.fn(() =>
    Promise.resolve()
);

export const startLocationUpdatesAsync = jest.fn(() =>
    Promise.resolve()
);

export const getCurrentPositionAsync = jest.fn(() =>
    Promise.resolve({
        coords: {
            latitude: 1,
            longitude: 2,
            altitude: 10,
        },
        timestamp: Date.now(),
    })
);