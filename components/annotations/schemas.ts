import z from 'zod';

export const AddAnnotationSchema = z.object({
    sentiment: z.string().optional(),
    type: z.enum(['point', 'segment']),
});
