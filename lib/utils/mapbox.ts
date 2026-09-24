export const MAPBOX_PUBLIC_TOKEN =
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
    process.env.EXPO_PUBLIC_MAPBOX_KEY ||
    'pk.eyJ1IjoidmluY2VyeWFud2FuZyIsImEiOiJjbXJkNnR6YWYwY2xsMnhvdDI1MDhvOG00In0.RsoMcGG7xAGpY9vFn9e-qQ';

export function configureMapboxAccessToken(mapbox: { setAccessToken: (token: string) => void }) {
    mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
}
