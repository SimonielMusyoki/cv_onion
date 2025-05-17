'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, UploadCloud, FileText, Briefcase, BarChartBig, Palette, AlertCircle } from 'lucide-react';

import { analyzeCvAction, analyzeJobDescriptionAction, matchCvToJobAction } from './actions';

import type { AnalyzeCvOutput } from '@/ai/flows/analyze-cv';
import type { AnalyzeJobDescriptionOutput } from '@/ai/flows/analyze-job-description';
import type { MatchCvToJobOutput } from '@/ai/flows/match-cv-to-job';

const formSchema = z.object({
  jobDescription: z.string().min(50, { message: "Job description must be at least 50 characters." }),
  cvFile: z.custom<FileList>()
    .refine(files => files && files.length === 1, "CV file is required.")
    .refine(files => files && files[0].size <= 5 * 1024 * 1024, "CV file size must be less than 5MB.")
    .refine(
      files => files && (files[0].type === "application/pdf" || files[0].type === "text/plain" || files[0].type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || files[0].type === "application/msword"),
      "CV must be a PDF, DOCX, DOC, or TXT file."
    ),
});

type FormValues = z.infer<typeof formSchema>;

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export default function CvOnionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [cvAnalysis, setCvAnalysis] = useState<AnalyzeCvOutput | null>(null);
  const [jobAnalysis, setJobAnalysis] = useState<AnalyzeJobDescriptionOutput | null>(null);
  const [matchResult, setMatchResult] = useState<MatchCvToJobOutput | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const cvFileWatcher = watch("cvFile");
  useState(() => {
    if (cvFileWatcher && cvFileWatcher.length > 0) {
      setFileName(cvFileWatcher[0].name);
    } else {
      setFileName(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvFileWatcher]);


  const onSubmitHandler: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    setError(null);
    setCvAnalysis(null);
    setJobAnalysis(null);
    setMatchResult(null);

    try {
      const cvFile = data.cvFile[0];
      const cvDataUri = await readFileAsDataURL(cvFile);
      
      // Attempt to read as text. This will be garbled for binary files like PDF/DOCX.
      // The `matchCvToJob` flow expects text. This is a known limitation for non-TXT files.
      // The `analyzeCv` flow using `cvDataUri` should handle PDF/DOCX correctly via the model.
      let cvTextContent = "";
      if (cvFile.type === "text/plain") {
        cvTextContent = await readFileAsText(cvFile);
      } else {
        // For non-TXT files, we pass an empty string or placeholder to matchCvToJob,
        // as client-side text extraction is unreliable for PDF/DOCX.
        // The AI flow itself might be able to extract text if it were designed for cvDataUri for content.
        // Since `matchCvToJob` strictly takes `cvContent: string`, we must acknowledge this.
        // An alternative is to call a specific text extraction AI flow if available, or just show a warning.
        // For now, let's pass what we can get (potentially garbled for non-TXT)
        // and rely on the user understanding the .txt recommendation for best matching.
        try {
          cvTextContent = await readFileAsText(cvFile); // This will be imperfect for PDF/DOCX
        } catch (textReadError) {
          console.warn("Could not read file as text:", textReadError);
          cvTextContent = "Could not extract text content from this file type for matching. Please use a .txt file for optimal matching analysis or copy/paste CV text.";
        }
      }


      const [cvAnalysisResult, jobAnalysisResult, matchResultData] = await Promise.all([
        analyzeCvAction({ cvDataUri }),
        analyzeJobDescriptionAction({ jobDescription: data.jobDescription }),
        matchCvToJobAction({ 
          jobDescription: data.jobDescription, 
          cvContent: cvTextContent 
        })
      ]);

      setCvAnalysis(cvAnalysisResult);
      setJobAnalysis(jobAnalysisResult);
      setMatchResult(matchResultData);

    } catch (e: any) {
      console.error("Processing error:", e);
      setError(e.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const getScoreBarColorClass = (colorCode: string | undefined): string => {
    if (!colorCode) return 'bg-muted';
    switch (colorCode) {
      case 'green': return 'bg-green-500';
      case 'orange': return 'bg-orange-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getScoreTextColorClass = (colorCode: string | undefined): string => {
    if (!colorCode) return 'text-muted-foreground';
    switch (colorCode) {
      case 'green': return 'text-green-600 dark:text-green-400';
      case 'orange': return 'text-orange-500 dark:text-orange-400';
      case 'red': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };
  
  const handleReset = () => {
    reset();
    setCvAnalysis(null);
    setJobAnalysis(null);
    setMatchResult(null);
    setError(null);
    setFileName(null);
    setIsLoading(false);
  };


  return (
    <div className="min-h-screen p-4 sm:p-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-primary">CV Onion</h1>
        <p className="text-md sm:text-lg text-muted-foreground mt-2">Peel back the layers of job matching with AI.</p>
      </header>

      <main className="max-w-3xl mx-auto space-y-8">
        <Card className="shadow-xl border-border">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2"><Briefcase className="h-6 w-6 text-primary" /> Provide Details</CardTitle>
            <CardDescription>Enter the job description and upload your CV to start the analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
              <div>
                <Label htmlFor="jobDescription" className="text-md font-medium">Job Description</Label>
                <Textarea
                  id="jobDescription"
                  {...register("jobDescription")}
                  placeholder="Paste the full job description here (min. 50 characters)..."
                  rows={8}
                  className="mt-1 text-sm"
                  aria-invalid={errors.jobDescription ? "true" : "false"}
                />
                {errors.jobDescription && <p className="text-xs text-destructive mt-1">{errors.jobDescription.message}</p>}
              </div>

              <div>
                <Label htmlFor="cvFile" className="text-md font-medium">Upload CV</Label>
                <div className="mt-1">
                    <label htmlFor="cvFile" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-accent/10 ${errors.cvFile ? 'border-destructive' : 'border-input hover:border-primary/50'}`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-2">
                            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                            {fileName ? (
                                <span className="text-sm font-semibold text-primary truncate max-w-full">{fileName}</span>
                            ): (
                                <p className="text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag & drop</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, DOC, TXT (MAX 5MB)</p>
                        </div>
                        <Input id="cvFile" type="file" className="hidden" {...register("cvFile")} accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" aria-invalid={errors.cvFile ? "true" : "false"} />
                    </label>
                </div>
                {errors.cvFile && <p className="text-xs text-destructive mt-1">{errors.cvFile.message as string}</p>}
                 <p className="text-xs text-muted-foreground mt-1">Note: For best matching results, using a .txt file or ensuring your document is text-selectable is recommended.</p>
              </div>
              
              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={handleReset} disabled={isLoading} className="w-1/3">
                    Reset
                </Button>
                <Button type="submit" disabled={isLoading} className="w-2/3 text-base py-3">
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Analyze & Match'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="text-center py-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="mt-3 text-md text-muted-foreground">Hold tight, the AI is working its magic...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="shadow-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Oops! Something went wrong.</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {matchResult && (
          <Card className="shadow-xl border-border">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2"><BarChartBig className="h-6 w-6 text-primary" />Match Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="text-center">
                <p className={`text-5xl font-bold ${getScoreTextColorClass(matchResult.colorCode)}`}>{matchResult.matchScore}%</p>
                <p className="text-md text-muted-foreground">Overall Match Score</p>
                <div className="w-full bg-muted rounded-full h-3 my-2 overflow-hidden mt-2">
                  <div 
                    className={`h-3 rounded-full ${getScoreBarColorClass(matchResult.colorCode)} transition-all duration-500 ease-out`}
                    style={{ width: `${matchResult.matchScore}%` }}
                    aria-valuenow={matchResult.matchScore}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    role="progressbar"
                  ></div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Palette className="h-5 w-5 text-accent"/> Highlighted CV Insights</h3>
                <div 
                  className="p-3 border rounded-md bg-background max-h-80 overflow-y-auto text-sm"
                  dangerouslySetInnerHTML={{ __html: matchResult.highlightedCv.replace(/\n/g, '<br />') }} 
                ></div>
                 <p className="text-xs text-muted-foreground mt-1">This is an AI-generated highlight of your CV against the job description.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {cvAnalysis && (
            <Card className="shadow-lg border-border">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/> CV Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <h4 className="font-semibold text-muted-foreground">Key Skills:</h4>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {cvAnalysis.skills.length > 0 ? cvAnalysis.skills.map((skill, i) => <Badge key={`${skill}-${i}`} variant="outline" className="bg-accent/10 border-accent/30 text-accent-foreground/80">{skill}</Badge>) : <p className="text-xs text-muted-foreground">No specific skills identified.</p>}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-muted-foreground mt-2">Experience Summary:</h4>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed">{cvAnalysis.experience || "N/A"}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-muted-foreground mt-2">Qualifications:</h4>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed">{cvAnalysis.qualifications || "N/A"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {jobAnalysis && (
            <Card className="shadow-lg border-border">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary"/> Job Description Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <h4 className="font-semibold text-muted-foreground">Required Skills:</h4>
                   <div className="flex flex-wrap gap-1.5 mt-1">
                    {jobAnalysis.requiredSkills.length > 0 ? jobAnalysis.requiredSkills.map((skill,i) => <Badge key={`${skill}-${i}`} variant="outline" className="bg-accent/10 border-accent/30 text-accent-foreground/80">{skill}</Badge>) : <p className="text-xs text-muted-foreground">No specific skills identified.</p>}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-muted-foreground mt-2">Required Experience:</h4>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed">{jobAnalysis.requiredExperience || "N/A"}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-muted-foreground mt-2">Required Qualifications:</h4>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed">{jobAnalysis.requiredQualifications || "N/A"}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
      {(!isLoading && !cvAnalysis && !jobAnalysis && !matchResult && !error) && (
        <Card className="shadow-md text-center py-10 bg-card border-border">
          <CardContent>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-muted-foreground mb-3"><path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"></path><path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8"></path><path d="M15 2v5h5"></path><path d="m10 16-2-2 2-2"></path><path d="m14 16 2-2-2-2"></path></svg>
            <p className="text-lg text-muted-foreground">Your analysis results will appear here.</p>
            <p className="text-xs text-muted-foreground mt-1">Fill out the form and click "Analyze & Match" to begin.</p>
          </CardContent>
        </Card>
      )}
      </main>
      <footer className="text-center mt-12 py-6 border-t border-border">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} CV Onion. AI-powered analysis for smarter career moves.</p>
      </footer>
    </div>
  );
}
