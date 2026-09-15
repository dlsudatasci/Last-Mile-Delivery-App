export interface PredefinedAnnotation {
    id: string;
    name: string;
    description: string;
    shortDescription: string;
    icon: string;
    color: string;
    type: 'point' | 'segment';
}

export const getPredefinedAnnotation = (id: string): Omit<PredefinedAnnotation, 'type'> | undefined => {
    if (id === 'media-annotation') {
        return {
            id: 'media-annotation',
            name: 'Media Annotation',
            description: 'An annotation made with mainly images or videos',
            shortDescription: 'Media Annotations',
            icon: 'image-outline',
            color: '#4CAF50',
            // type: 'both',
        };
    }

    return predefinedAnnotations.find(annotation => annotation.id === id);
};

export const predefinedAnnotations: PredefinedAnnotation[] = [
    {
        id: 'delivery-corridor-positive',
        name: 'Clear Delivery Corridor',
        description:
            'A clear and predictable road segment that is practical for delivery riders.',
        shortDescription: 'Clear delivery path.',
        icon: 'map-check',
        color: '#2E7D32', // Darker green
        type: 'segment',
    },
    {
        id: 'shared-road-neutral',
        name: 'Shared Road',
        description: 'A road shared with vehicle traffic, requiring caution but generally usable for delivery riders.',
        shortDescription: 'Shared with cars; caution needed.',
        icon: 'car-multiple',
        color: '#F57C00', // Darker orange
        type: 'segment',
    },
    {
        id: 'unsafe-road-access-negative',
        name: 'Unsafe Road Access',
        shortDescription: 'Unsafe or limited access.',
        description:
            'A section of road with limited space, poor access, or conditions that may force a route change.',
        icon: 'road',
        color: '#D32F2F', // Darker red
        type: 'segment',
    },
    {
        id: 'barrier-bollard-positive',
        name: 'Barrier/Bollard',
        shortDescription: 'Separates road users.',
        description: 'Physical barriers or bollards that affect route access or turning decisions.',
        icon: 'block-helper',
        color: '#4E342E', // Darker brown
        type: 'segment',
    },
    {
        id: 'obstruction-negative',
        name: 'Obstruction',
        description: 'An unexpected obstruction in the delivery path (e.g., debris, parked car, construction).',
        shortDescription: 'Unexpected obstruction on path.',
        icon: 'alert-circle-outline',
        color: '#455A64', // Darker blue-grey
        type: 'point',
    },
    {
        id: 'pothole-negative',
        name: 'Pothole',
        description: 'A significant pothole in the road, posing a risk to delivery riders.',
        shortDescription: 'Deep road damage; avoid.',
        icon: 'road-variant',
        color: '#37474F', // Very dark blue-grey
        type: 'point',
    },
    {
        id: 'rough-surface-negative',
        name: 'Rough Surface',
        description: 'A section of road with an uneven or rough surface, leading to a less comfortable ride.',
        shortDescription: 'Uneven road surface.',
        icon: 'texture-box',
        color: '#424242', // Darker grey
        type: 'segment',
    },
    {
        id: 'smooth-surface-positive',
        name: 'Smooth Surface',
        description: 'A well-maintained section of road with a smooth surface, providing a comfortable ride.',
        shortDescription: 'Comfortable, smooth road.',
        icon: 'layers-triple',
        color: '#33691E', // Darker lime
        type: 'segment',
    },
    {
        id: 'steep-incline-neutral',
        name: 'Steep Incline',
        description: 'A significant uphill climb that may slow delivery movement.',
        shortDescription: 'Significant uphill climb.',
        icon: 'arrow-up-bold',
        color: '#827717', // Darker lime
        type: 'segment',
    },
    {
        id: 'steep-decline-neutral',
        name: 'Steep Decline',
        description: 'A significant downhill slope, potentially requiring careful braking.',
        shortDescription: 'Significant downhill slope.',
        icon: 'arrow-down-bold',
        color: '#33691E', // Darker lime
        type: 'segment',
    },
    {
        id: 'rest-stop-positive',
        name: 'Rider Stop',
        description: 'A practical stop area for riders, including waiting, parking, water, or rest access.',
        shortDescription: 'Place to wait or rest.',
        icon: 'seat',
        color: '#F57F17', // Darker yellow
        type: 'point',
    },
    {
        id: 'construction-negative',
        name: 'Construction Zone',
        description: 'An area with active construction that may impact the delivery route, requiring caution or detours.',
        shortDescription: 'Active construction.',
        icon: 'tools',
        color: '#424242', // Darker grey
        type: 'segment',
    },
    {
        id: 'intersection-warning',
        name: 'Busy Intersection',
        description: 'A complex or high-traffic intersection that requires extra vigilance from delivery riders.',
        shortDescription: 'Complex or high-traffic crossing.',
        icon: 'traffic-light',
        color: '#E65100', // Darker orange
        type: 'point',
    },
    {
        id: 'bike-shop-positive',
        name: 'Rider Support',
        description: 'A nearby support location for repairs, supplies, or rider needs.',
        shortDescription: 'Support stop nearby.',
        icon: 'wrench',
        color: '#0277BD', // Darker blue
        type: 'point',
    },
    {
        id: 'traffic-high',
        name: 'High Traffic',
        description: 'A high traffic segment makes delivery movement difficult.',
        shortDescription: 'High traffic.',
        icon: 'car-multiple',
        color: '#E65100', // Darker orange
        type: 'segment',
    },
    {
        id: 'traffic-low',
        name: 'Low-to-No Traffic',
        description: 'A low traffic segment makes delivery movement easier.',
        shortDescription: 'Low traffic.',
        icon: 'car',
        color: '#9E9E9E', // Lighter green
        type: 'segment',
    },
];
