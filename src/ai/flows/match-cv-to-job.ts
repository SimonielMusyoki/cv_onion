'use server';

/**
 * @fileOverview Compares a CV to a job description and provides a matching score with highlighting.
 *
 * - matchCvToJob - A function that handles the CV to job description matching process.
 * - MatchCvToJobInput - The input type for the matchCvToJob function.
 * - MatchCvToJobOutput - The return type for the matchCvToJob function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MatchCvToJobInputSchema = z.object({
  jobDescription: z.string().describe('The job description.'),
  cvContent: z.string().describe('The content of the CV.'),
});
export type MatchCvToJobInput = z.infer<typeof MatchCvToJobInputSchema>;

const MatchCvToJobOutputSchema = z.object({
  matchScore: z.number().describe('The matching score between the CV and the job description (0-100).'),
  highlightedCv: z.string().describe('The CV content with highlighted sections based on the matching score.'),
  colorCode: z
    .enum(['green', 'orange', 'red'])
    .describe(
      'Color code indicating the match score: green for scores above 75%, orange for scores above 50%, and red for scores below 50%.'
    ),
});
export type MatchCvToJobOutput = z.infer<typeof MatchCvToJobOutputSchema>;

export async function matchCvToJob(input: MatchCvToJobInput): Promise<MatchCvToJobOutput> {
  return matchCvToJobFlow(input);
}

const prompt = ai.definePrompt({
  name: 'matchCvToJobPrompt',
  input: {schema: MatchCvToJobInputSchema},
  output: {schema: MatchCvToJobOutputSchema},
  prompt: `You are an AI expert in CV analysis and job matching.

You will receive a job description and the content of a CV.
Your task is to analyze both and provide a matching score (0-100) indicating how well the CV aligns with the job requirements.
Additionally, highlight the CV content, showing the sections that match the job requirements. Finally, assign a color code based on the match score:
- Green: Score above 75%
- Orange: Score above 50% and below 75%
- Red: Score below 50%

Job Description: {{{jobDescription}}}
CV Content: {{{cvContent}}}`,
});

const matchCvToJobFlow = ai.defineFlow(
  {
    name: 'matchCvToJobFlow',
    inputSchema: MatchCvToJobInputSchema,
    outputSchema: MatchCvToJobOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
