import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-cv.ts';
import '@/ai/flows/analyze-job-description.ts';
import '@/ai/flows/match-cv-to-job.ts';