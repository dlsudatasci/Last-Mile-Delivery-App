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

// MockGPX #10
const exactTenMinuteGapGpx = `
<gpx>
  <trk>
    <name>Exactly Ten Minute Gap Ride</name>
    <trkseg>

      <trkpt lat="14.5995" lon="120.9842">
        <ele>10</ele>
        <time>2025-01-01T08:00:00Z</time>
      </trkpt>

      <trkpt lat="14.6000" lon="120.9850">
        <ele>20</ele>
        <time>2025-01-01T08:10:00Z</time>
      </trkpt>

    </trkseg>
  </trk>
</gpx>
`;

// MockGPX #11
const unreasonableSpeedGpx = `
<gpx>
  <trk>
    <name>Unreasonable Speed Ride</name>
    <trkseg>

      <trkpt lat="14.5995" lon="120.9842">
        <time>2025-01-01T08:00:00Z</time>
      </trkpt>

      <trkpt lat="15.0000" lon="121.0000">
        <time>2025-01-01T08:01:00Z</time>
      </trkpt>

    </trkseg>
  </trk>
</gpx>
`;
//============================================================

// parseGpx() testing
describe("parseGpx()", () => {

	beforeEach(() => {
		jest.clearAllMocks();
	});
	
  	const parseFixture = async (gpx: string) => {
		(FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(gpx);

		return parseGpx("fake-file.gpx");
	};

    test("parses ride name", async () => {
      	const result = await parseFixture(sampleGpx);
    	expect(result.rideName).toBe("Morning Ride");
    });

    test("parses start time", async () => {
		const result = await parseFixture(sampleGpx);
        expect(result.startTime).toBe(
            new Date("2025-01-01T08:00:00Z").getTime()
        );
    });

    test("parses end time", async () => {
		const result = await parseFixture(sampleGpx);
        expect(result.endTime).toBe(
            new Date("2025-01-01T08:01:00Z").getTime()
        );
    });

    test("extracts all ride points", async () => {
		const result = await parseFixture(sampleGpx);
        expect(result.points).toHaveLength(2);
    });

    test("extracts 1st coordinate correctly", async () => {
		const result = await parseFixture(sampleGpx);
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
		const result = await parseFixture(sampleGpx);
        expect(result.points[1]).toEqual({
            coordinate: {
                latitude: 14.6000,
                longitude: 120.9850,
            },
            timestamp: new Date("2025-01-01T08:01:00Z").getTime(),
            elevation: 20,
        });
    });

    test("stores ride points in timestamp order", async () => {
        const result = await parseFixture(sampleGpx);
        expect(result.points[0].timestamp).toBeLessThan(result.points[1].timestamp);
    });

    test("stores elevation values correctly", async () => {
		const result = await parseFixture(sampleGpx);
        expect(result.points[0].elevation).toBe(10);
        expect(result.points[1].elevation).toBe(20);
    });

    test("calculates ride duration", async () => {
		const result = await parseFixture(sampleGpx);
        expect(result.duration).toBe(60);
    });

    test("calculates total distance", async () => {
		const result = await parseFixture(sampleGpx);
        expect(result.distance).toBeGreaterThan(0);
    });

	// Total Distance #2
    test("calculates total distance #2", async () => {
		const result = await parseFixture(sampleGpx);
        expect(result.distance).toBeCloseTo(102.4766, 3);
    });

    test("calculates average speed", async () => {
		const result = await parseFixture(sampleGpx);
        expect(result.averageSpeed).toBeGreaterThan(0);
    });

    // Average Speed #2
    test("calculates average speed #2", async () => {
        const result = await parseFixture(sampleGpx);
        expect(result.averageSpeed).toBeCloseTo(6.1486, 3);
    });

    test("calculates maximum speed", async () => {
        const result = await parseFixture(sampleGpx);
        expect(result.maxSpeed).toBeGreaterThan(0);
    });

    // Maximum Speed #2
    test("calculates maximum speed #2", async () => {
        const result = await parseFixture(sampleGpx);
        expect(result.maxSpeed).toBeCloseTo(6.1486, 3);
    });

    test("calculates elevation gain", async () => {
        const result = await parseFixture(sampleGpx);
        expect(result.elevationGain).toBe(10);
    });

    test("sets ride visibility to private", async () => {
		const result = await parseFixture(sampleGpx);
        expect(result.isPublic).toBe(false);
    });

    test("creates an empty annotations array", async () => {
        const result = await parseFixture(sampleGpx);
        expect(result.annotations).toEqual([]);
    });

    test("throws an error when no track points exist", async () => {
    	await expect(parseFixture(emptyTrackGpx))
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
        const result = await parseFixture(unnamedRideGpx);
        expect(result.rideName).toBe("Unnamed Track");
    });

    test("handles missing elevation values", async () => {
		const result = await parseFixture(noElevationGpx);
        expect(result.points[0].elevation).toBeUndefined();
        expect(result.points[1].elevation).toBeUndefined();
        expect(result.elevationGain).toBe(0);
    });

    test("ignores time gaps greater than ten minutes when calculating duration", async () => {
		const result = await parseFixture(longGapGpx);
		expect(result.duration).toBe(0);
		expect(result.distance).toBe(0);
		expect(result.averageSpeed).toBe(0);
    });

    test("calculates zero elevation gain on flat terrain", async () => {
        const result = await parseFixture(flatRideGpx);
        expect(result.elevationGain).toBe(0);
    });

    test("does not count downhill movement as elevation gain", async () => {
        const result = await parseFixture(downhillRideGpx);
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

	test("includes a time gap of exactly ten minutes", async () => {
		const result = await parseFixture(exactTenMinuteGapGpx);

		expect(result.duration).toBe(600);
		expect(result.distance).toBeGreaterThan(0);
	});

	test("handles a single track point", async () => {
		const result = await parseFixture(singlePointGpx);

		expect(result.points).toHaveLength(1);
		expect(result.duration).toBe(0);
		expect(result.distance).toBe(0);
		expect(result.averageSpeed).toBe(0);
		expect(result.maxSpeed).toBe(0);
		expect(result.elevationGain).toBe(0);
		expect(result.startTime).toBe(result.endTime);
	});

	test("ignores speeds above 70 km/h when calculating maximum speed", async () => {
		const result = await parseFixture(unreasonableSpeedGpx);

		expect(result.maxSpeed).toBe(0);
	});

	test("reads the GPX file from the provided URL", async () => {
		await parseFixture(sampleGpx);

		expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
			"fake-file.gpx"
		);
	});
});