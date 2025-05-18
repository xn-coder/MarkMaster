'use server';
/**
 * @fileOverview Generates personalized feedback for students based on their marks.
 *
 * - generateFeedback - A function that generates feedback for a student.
 * - GenerateFeedbackInput - The input type for the generateFeedback function.
 * - GenerateFeedbackOutput - The return type for the generateFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFeedbackInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  subject: z.string().describe('The subject for which feedback is being generated.'),
  marks: z.number().describe('The marks obtained by the student in the subject.'),
  maxMarks: z.number().describe('The maximum possible marks for the subject.'),
});
export type GenerateFeedbackInput = z.infer<typeof GenerateFeedbackInputSchema>;

const GenerateFeedbackOutputSchema = z.object({
  feedback: z.string().describe('Personalized feedback for the student in the subject.'),
});
export type GenerateFeedbackOutput = z.infer<typeof GenerateFeedbackOutputSchema>;

export async function generateFeedback(input: GenerateFeedbackInput): Promise<GenerateFeedbackOutput> {
  return generateFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFeedbackPrompt',
  input: {schema: GenerateFeedbackInputSchema},
  output: {schema: GenerateFeedbackOutputSchema},
  prompt: `You are a teacher providing feedback to students.

  Generate personalized feedback for {{studentName}} in {{subject}} based on their marks ({{marks}} out of {{maxMarks}}).

  - If the marks are low (less than 50%), provide encouraging messages and suggestions for improvement.
  - If the marks are average (50-75%), provide positive feedback and areas for further development.
  - If the marks are high (above 75%), provide praise and encourage continued excellence.
  - Dynamically adjust the content length based on the need.
  `,
});

const generateFeedbackFlow = ai.defineFlow(
  {
    name: 'generateFeedbackFlow',
    inputSchema: GenerateFeedbackInputSchema,
    outputSchema: GenerateFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
