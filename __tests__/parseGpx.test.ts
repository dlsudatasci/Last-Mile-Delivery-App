import * as FileSystem from "expo-file-system";
import { parseGpx } from "../lib/utils/parseGpx";

// Mock expo-file-system
jest.mock("expo-file-system", () => ({
    readAsStringAsync: jest.fn(),
}));

// MockGPX #1
const sampleGpx = `
<gpx>
  <trk>
    <name>Morning Ride</name>
    <trkseg>

      <trkpt lat="14.5995" lon="120.9842">
        <ele>10</ele>
        <time>2025-01-01T08:00:00Z</time>
      </trkpt>

      <trkpt lat="14.6000" lon="120.9850">
        <ele>20</ele>
        <time>2025-01-01T08:01:00Z</time>
      </trkpt>

    </trkseg>
  </trk>
</gpx>
`;

// MockGPX #2
const emptyTrackGpx = `
<gpx>
  <trk>
    <name>Empty Ride</name>
    <trkseg>
    </trkseg>
  </trk>
</gpx>
`;

// MockGPX #3
const unnamedRideGpx = `
<gpx>
  <trk>
    <trkseg>

      <trkpt lat="14.5995" lon="120.9842">
        <ele>10</ele>
        <time>2025-01-01T08:00:00Z</time>
      </trkpt>

      <trkpt lat="14.6000" lon="120.9850">
        <ele>20</ele>
        <time>2025-01-01T08:01:00Z</time>
      </trkpt>

    </trkseg>
  </trk>
</gpx>
`;

// MockGPX #4
const noElevationGpx = `
<gpx>
  <trk>
    <name>No Elevation Ride</name>
    <trkseg>

      <trkpt lat="14.5995" lon="120.9842">
        <time>2025-01-01T08:00:00Z</time>
      </trkpt>

      <trkpt lat="14.6000" lon="120.9850">
        <time>2025-01-01T08:01:00Z</time>
      </trkpt>

    </trkseg>
  </trk>
</gpx>
`;

// MockGPX #5
const singlePointGpx = `
<gpx>
  <trk>
    <name>Single Point Ride</name>
    <trkseg>

      <trkpt lat="14.5995" lon="120.9842">
        <ele>15</ele>
        <time>2025-01-01T08:00:00Z</time>
      </trkpt>

    </trkseg>
  </trk>
</gpx>
`;

// MockGPX #6
const longGapGpx = `
<gpx>
  <trk>
    <name>Long Gap Ride</name>
    <trkseg>

      <trkpt lat="14.5995" lon="120.9842">
        <ele>10</ele>
        <time>2025-01-01T08:00:00Z</time>
      </trkpt>

      <trkpt lat="14.6000" lon="120.9850">
        <ele>20</ele>
        <time>2025-01-01T08:11:00Z</time>
      </trkpt>

    </trkseg>
  </trk>
</gpx>
`;

// MockGPX #7
const flatRideGpx = `
<gpx>
  <trk>
    <name>Flat Ride</name>
    <trkseg>

      <trkpt lat="14.5995" lon="120.9842">
        <ele>50</ele>
        <time>2025-01-01T08:00:00Z</time>
      </trkpt>

      <trkpt lat="14.6000" lon="120.9850">
        <ele>50</ele>
        <time>2025-01-01T08:01:00Z</time>
      </trkpt>

    </trkseg>
  </trk>
</gpx>
`;

// MockGPX #8
const downhillRideGpx = `
<gpx>
  <trk>
    <name>Downhill Ride</name>
    <trkseg>

      <trkpt lat="14.5995" lon="120.9842">
        <ele>100</ele>
        <time>2025-01-01T08:00:00Z</time>
      </trkpt>

      <trkpt lat="14.6000" lon="120.9850">
        <ele>80</ele>
        <time>2025-01-01T08:01:00Z</time>
      </trkpt>

    </trkseg>
  </trk>
</gpx>
`;

// MockGPX #9
const invalidXml = `<gpx><trk>`;
//============================================================

// parseGpx() testing
describe("parseGpx()", () => {

    let result: Awaited<ReturnType<typeof parseGpx>>;
    beforeEach(async () => {
        jest.clearAllMocks();

        (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(sampleGpx);

        result = await parseGpx("fake-file.gpx");
    });

    test("parses ride name", async () => {
        expect(result.rideName).toBe("Morning Ride");
    });

    test("parses start time", async () => {
        expect(result.startTime).toBe(
            new Date("2025-01-01T08:00:00Z").getTime()
        );
    });

    test("parses end time", async () => {
        expect(result.endTime).toBe(
            new Date("2025-01-01T08:01:00Z").getTime()
        );
    });

    test("extracts all ride points", async () => {
        expect(result.points).toHaveLength(2);
    });

    test("extracts 1st coordinate correctly", async () => {
        expect(result.points[0]).toEqual({
            coordinate: {
                latitude: 14.5995,
                longitude: 120.9842,
            },
            timestamp: new Date("2025-01-01T08:00:00Z").getTime(),
            elevation: 10,
        });
    });

    test("extracts 2nd coordinate correctly", async () => {
        expect(result.points[1]).toEqual({
            coordinate: {
                latitude: 14.6000,
                longitude: 120.9850,
            },
            timestamp: new Date("2025-01-01T08:01:00Z").getTime(),
            elevation: 20,
        });
    });

    test("stores coordinates in the correct order", async () => {
        expect(result.points[0].timestamp).toBeLessThan(result.points[1].timestamp);
    });

    test("stores elevation values correctly", async () => {
        expect(result.points[0].elevation).toBe(10);
        expect(result.points[1].elevation).toBe(20);
    });

    test("calculates ride duration", () => {
        expect(result.duration).toBe(60);
    });

    test("calculates total distance", () => {
        expect(result.distance).toBeGreaterThan(0);
    });

    test("calculates total distance", () => {
        expect(result.distance).toBeCloseTo(102.4766, 3);
    });

    test("calculates average speed", () => {
        expect(result.averageSpeed).toBeGreaterThan(0);
    });

    // Average Speed #2
    test("calculates average speed", () => {
        expect(result.averageSpeed).toBeCloseTo(6.1486, 3);
    });

    test("calculates maximum speed", () => {
        expect(result.maxSpeed).toBeGreaterThan(0);
    });

    // Maximum Speed #2
    test("calculates maximum speed", () => {
        expect(result.maxSpeed).toBeCloseTo(6.1486, 3);
    });

    test("calculates elevation gain", () => {
        expect(result.elevationGain).toBe(10);
    });

    test("sets ride visibility to private", () => {
        expect(result.isPublic).toBe(false);
    });

    test("creates an empty annotations array", () => {
        expect(result.annotations).toEqual([]);
    });

    test("throws an error when no track points exist", async () => {
        (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
            emptyTrackGpx
        );

        await expect(parseGpx("fake-file.gpx"))
            .rejects
            .toThrow("Failed to parse GPX file");
    });

    test("throws an error when the GPX file cannot be read", async () => {
        (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(
            new Error("File not found")
        );

        await expect(parseGpx("missing-file.gpx"))
            .rejects
            .toThrow("Failed to parse GPX file");
    });

    test("uses 'Unnamed Track' when the ride name is missing", async () => {
        (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
            unnamedRideGpx
        );
        const result = await parseGpx("fake-file.gpx");
        expect(result.rideName).toBe("Unnamed Track");
    });

    test("handles missing elevation values", async () => {
        (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(noElevationGpx);

        const result = await parseGpx("fake-file.gpx");

        expect(result.points[0].elevation).toBeUndefined();
        expect(result.points[1].elevation).toBeUndefined();
        expect(result.elevationGain).toBe(0);
    });

    test("ignores time gaps greater than ten minutes when calculating duration", async () => {
        (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(longGapGpx);

        const result = await parseGpx("fake-file.gpx");

        expect(result.duration).toBe(0);
    });

    test("calculates zero elevation gain on flat terrain", async () => {
        (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(flatRideGpx);

        const result = await parseGpx("fake-file.gpx");

        expect(result.elevationGain).toBe(0);
    });

    test("does not count downhill movement as elevation gain", async () => {
        (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(downhillRideGpx);

        const result = await parseGpx("fake-file.gpx");

        expect(result.elevationGain).toBe(0);
    });

    test("throws an error for malformed GPX XML", async () => {
        (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(invalidXml);

        await expect(parseGpx("fake-file.gpx"))
            .rejects
            .toThrow("Failed to parse GPX file");
    });

    test("throws an error when the GPX file is empty", async () => {
        (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue("");

        await expect(parseGpx("fake-file.gpx"))
            .rejects
            .toThrow("Failed to parse GPX file");
    });
});