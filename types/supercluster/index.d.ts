declare module 'supercluster' {
    export default class Supercluster {
        constructor(options?: Record<string, unknown>);
        load(points: unknown[]): this;
        getClusters(bbox: number[], zoom: number): unknown[];
    }
}
