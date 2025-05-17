// use server'
'use server';

/**
 * @fileOverview Analyzes a CV to identify key skills, experiences, and qualifications.
 *
 * - analyzeCv - A function that handles the CV analysis process.
 * - AnalyzeCvInput - The input type for the analyzeCv function.
 * - AnalyzeCvOutput - The return type for the analyzeCv function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCvInputSchema = z.object({
  cvDataUri: z
    .string()
    .describe(
      "The CV file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeCvInput = z.infer<typeof AnalyzeCvInputSchema>;

const AnalyzeCvOutputSchema = z.object({
  skills: z
    .array(z.string())
    .describe('Key skills identified in the CV.'),
  experience: z
    .string()
    .describe('Summary of relevant experience in the CV.'),
  qualifications: z
    .string()
    .describe('Key qualifications listed in the CV.'),
});
export type AnalyzeCvOutput = z.infer<typeof AnalyzeCvOutputSchema>;

export async function analyzeCv(input: AnalyzeCvInput): Promise<AnalyzeCvOutput> {
  return analyzeCvFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCvPrompt',
  input: {schema: AnalyzeCvInputSchema},
  output: {schema: AnalyzeCvOutputSchema},
  prompt: `You are an expert resume analyzer. Analyze the provided CV to identify key skills, experience, and qualifications.

CV Content: {{media url=cvDataUri}}

Skills: List the key skills identified in the CV.

Experience: Summarize the relevant experience highlighted in the CV.

Qualifications: Extract the key qualifications mentioned in the CV.`,
});

const analyzeCvFlow = ai.defineFlow(
  {
    name: 'analyzeCvFlow',
    inputSchema: AnalyzeCvInputSchema,
    outputSchema: AnalyzeCvOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
