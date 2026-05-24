import { z } from 'zod';

const PREDEFINED_REASONS = [
  'defect',
  'wrongSize',
  'wrongColor',
  'wrongProduct',
  'other',
];

const submitReturnSchema = z.object({
  reason: z.enum(PREDEFINED_REASONS, { 
    errorMap: () => ({ message: 'reasonRequired' })
  }),
  notes: z.string().max(500, 'notesTooLong').optional(),
});

const result = submitReturnSchema.safeParse({ reason: undefined, notes: '' });
console.log('safeParse undefined:', JSON.stringify(result, null, 2));

const result2 = submitReturnSchema.safeParse({ reason: '', notes: '' });
console.log('safeParse empty string:', JSON.stringify(result2, null, 2));
