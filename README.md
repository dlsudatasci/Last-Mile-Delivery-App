# Devia

Devia is a mobile app for last-mile delivery route deviation research. Riders record a delivery trip, compare their actual GPS path against an optimized route, and answer post-trip questions when they deviate.

## Core Flow

- Create a delivery with pickup, drop-off, platform, and optimized-route screenshot.
- Record the rider's actual delivery path with GPS.
- Review trip stats after completion.
- Confirm whether the rider followed the suggested route.
- Queue deviation-reason questions for each detected deviation.
- Capture checklist reasons and custom rider explanations for research analysis.
- Register riders for the study inside the app.
- Notify the research team when a rider reaches 10 recorded submissions.
- Let eligible riders submit a ₱250 compensation claim through GCash, Maya, or GoTyme.

## Development

```bash
npm install
npx tsc --noEmit
npx eslint .
npx expo start
```

If Expo fails under Node 24 with `ERR_SOCKET_BAD_PORT`, switch to Node 20:

```bash
nvm install 20
nvm use 20
npm install
npx expo start
```
