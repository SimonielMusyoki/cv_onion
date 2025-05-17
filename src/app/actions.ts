'use server';

import { analyzeCv, type AnalyzeCvInput, type AnalyzeCvOutput } from '@/ai/flows/analyze-cv';
import { analyzeJobDescription, type AnalyzeJobDescriptionInput, type AnalyzeJobDescriptionOutput } from '@/ai/flows/analyze-job-description';
import { matchCvToJob, type MatchCvToJobInput, type MatchCvToJobOutput } from '@/ai/flows/match-cv-to-job';

export async function analyzeCvAction(input: AnalyzeCvInput): Promise<AnalyzeCvOutput> {
  try {
    const result = await analyzeCv(input);
    return result;
  } catch (error) {
    console.error('Error in analyzeCvAction:', error);
    // It's often better to throw a more specific error or a sanitized one
    if (error instanceof Error) {
      throw new Error(`Failed to analyze CV: ${error.message}`);
    }
    throw new Error('Failed to analyze CV due to an unknown error.');
  }
}

export async function analyzeJobDescriptionAction(input: AnalyzeJobDescriptionInput): Promise<AnalyzeJobDescriptionOutput> {
  try {
    const result = await analyzeJobDescription(input);
    return result;
  } catch (error) {
    console.error('Error in analyzeJobDescriptionAction:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to analyze job description: ${error.message}`);
    }
    throw new Error('Failed to analyze job description due to an unknown error.');
  }
}

export async function matchCvToJobAction(input: MatchCvToJobInput): Promise<MatchCvToJobOutput> {
  try {
    const result = await matchCvToJob(input);
    // Consider sanitizing result.highlightedCv if it's HTML and could contain XSS vulnerabilities
    // For this exercise, we trust the AI output.
    return result;
  } catch (error) {
    console.error('Error in matchCvToJobAction:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to match CV to job: ${error.message}`);
    }
    throw new Error('Failed to match CV to job due to an unknown error.');
  }
}
