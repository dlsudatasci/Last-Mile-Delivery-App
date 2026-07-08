// Cleans console from logs while running tests (For testing)
beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => { });
    jest.spyOn(console, "warn").mockImplementation(() => { });
});

afterAll(() => {
    jest.restoreAllMocks();
});