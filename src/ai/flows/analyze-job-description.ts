'use server';

/**
 * @fileOverview Analyzes a job description to extract required skills, experience, and qualifications.
 *
 * - analyzeJobDescription - A function that handles the job description analysis process.
 * - AnalyzeJobDescriptionInput - The input type for the analyzeJobDescription function.
 * - AnalyzeJobDescriptionOutput - The return type for the analyzeJobDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeJobDescriptionInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The job description to be analyzed.'),
});
export type AnalyzeJobDescriptionInput = z.infer<typeof AnalyzeJobDescriptionInputSchema>;

const AnalyzeJobDescriptionOutputSchema = z.object({
  requiredSkills: z.array(z.string()).describe('The skills required for the job.'),
  requiredExperience: z.string().describe('The experience required for the job.'),
  requiredQualifications: z.string().describe('The qualifications required for the job.'),
});
export type AnalyzeJobDescriptionOutput = z.infer<typeof AnalyzeJobDescriptionOutputSchema>;

export async function analyzeJobDescription(input: AnalyzeJobDescriptionInput): Promise<AnalyzeJobDescriptionOutput> {
  return analyzeJobDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeJobDescriptionPrompt',
  input: {schema: AnalyzeJobDescriptionInputSchema},
  output: {schema: AnalyzeJobDescriptionOutputSchema},
  prompt: `You are an expert recruiter. Analyze the job description provided and extract the required skills, experience, and qualifications. Respond in a structured JSON format.

Job Description: {{{jobDescription}}}`,
});

const analyzeJobDescriptionFlow = ai.defineFlow(
  {
    name: 'analyzeJobDescriptionFlow',
    inputSchema: AnalyzeJobDescriptionInputSchema,
    outputSchema: AnalyzeJobDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
