import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Question, { IQuestion } from '@/models/Question';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash-latest";

const defaultSafetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const defaultGenerationConfig = {
  // temperature: 1,
  // topK: 0,
  // topP: 0.95,
  // maxOutputTokens: 2048
};

interface Solution {
  code: string;
  summary?: string;
}

interface GeneralError extends Error {
  code?: number;
  errors?: unknown;
  keyValue?: unknown;
}

if (!geminiApiKey) {
  console.warn("GEMINI_API_KEY environment variable is not set. Solution and summary generation will be skipped.");
}

export async function GET(request: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const listOnly = searchParams.get('list');
  const id = searchParams.get('id');
  const title = searchParams.get('title');

  try {
    if (listOnly === 'true') {
      const questions = await Question.find({}, '_id title difficulty')
                                      .sort({ title: 1 })
                                      .lean();
      return NextResponse.json({ success: true, data: questions });

    } else if (id) {
       if (!id.match(/^[0-9a-fA-F]{24}$/)) {
         return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 });
       }
      const question = await Question.findById(id).lean();
      if (!question) {
        return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: question });

    } else if (title) {
       const question = await Question.findOne({ title: decodeURIComponent(title) }).lean();
        if (!question) {
          return NextResponse.json({ success: false, error: 'Question with that title not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: question });

    } else {
      const questions = await Question.find({})
                                      .sort({ createdAt: -1 })
                                      .limit(50)
                                      .lean();
      return NextResponse.json({ success: true, data: questions });
    }
  } catch (e: unknown) {
    console.error("API Error fetching questions:", e);
    const error = e as Error;
    const errorMessage = error.message ? error.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: 'Server error fetching data', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const { title, description, difficulty, starting_code, examples, constraints, test_cases } = body;

    if (!title || !description || !starting_code) {
      return NextResponse.json({ success: false, error: 'Missing required fields: title, description, or starting_code' }, { status: 400 });
    }

    const generatedSolutions: Solution[] = [];
    let currentSolutionCode: string | undefined = undefined;
    let currentSolutionSummary: string | undefined = undefined;


    if (geminiApiKey) {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({
          model: MODEL_NAME,
          safetySettings: defaultSafetySettings,
          generationConfig: defaultGenerationConfig,
      });

      try {
        const solutionPrompt = `
          You are a coding assistant. Generate a concise and correct solution for the following coding question.
          Provide the solution code.

          Question Title: "${title}"
          Question Description:
          ${description}
          Starting Code (if provided):
          ${starting_code || "No starting code provided."}

          Please provide the solution:
        `;
        console.log("Sending solution generation prompt to Gemini for title:", title);
        const solutionResult = await model.generateContent(solutionPrompt);
        const solutionResponse = solutionResult.response;
        currentSolutionCode = solutionResponse.text();

        if (currentSolutionCode) {
          console.log("Received solution from Gemini for title:", title);
        } else {
          console.warn("Gemini returned an empty solution for title:", title);
          const finishReason = solutionResponse.candidates?.[0]?.finishReason;
          if (finishReason === 'SAFETY') {
             console.error("Solution generation for title '"+title+"' was blocked due to safety settings.");
          } else if (finishReason) {
             console.warn(`Solution generation for title '${title}' finished unexpectedly: ${finishReason}`);
          }
        }
      } catch (e: unknown) {
        const solutionError = e as Error;
        console.error(`Error generating solution with Gemini for title '${title}':`, solutionError.message);
      }

      if (currentSolutionCode) {
        try {
          const summaryPrompt = `
            Provide a concise one or two-sentence summary for the following coding solution.
            This summary will be used as a brief overview of the solution approach.

            Coding Solution:
            \`\`\`
            ${currentSolutionCode}
            \`\`\`

            Summary of the solution:
          `;
          console.log("Sending solution summary generation prompt to Gemini for title:", title);
          const summaryResult = await model.generateContent(summaryPrompt);
          const summaryResponse = summaryResult.response;
          currentSolutionSummary = summaryResponse.text();

          if (currentSolutionSummary) {
            console.log("Received solution summary from Gemini for title:", title);
          } else {
            console.warn("Gemini returned an empty solution summary for title:", title);
             const finishReason = summaryResponse.candidates?.[0]?.finishReason;
            if (finishReason === 'SAFETY') {
               console.error("Solution summary generation for title '"+title+"' was blocked due to safety settings.");
            } else if (finishReason) {
               console.warn(`Solution summary generation for title '${title}' finished unexpectedly: ${finishReason}`);
            }
          }
        } catch (e: unknown) {
          const summaryError = e as Error;
          console.error(`Error generating solution summary with Gemini for title '${title}':`, summaryError.message);
        }
      } else {
        console.warn("Skipping solution summary generation as no solution was generated for title:", title);
      }

      if (currentSolutionCode) {
        generatedSolutions.push({
          code: currentSolutionCode,
          summary: currentSolutionSummary
        });
      }

    } else {
      console.warn("GEMINI_API_KEY not configured. Skipping solution and summary generation for title:", title);
    }

    const lastQuestion = await Question.findOne().sort({ id: -1 });
    const nextId = lastQuestion && typeof lastQuestion.id === 'number' ? lastQuestion.id + 1 : 1;

    const newQuestionData: Partial<IQuestion> = {
      id: nextId,
      title,
      description,
      difficulty: difficulty,
      starting_code,
      examples: examples || [],
      constraints: constraints || [],
      test_cases: test_cases || [],
      solutions: generatedSolutions.length > 0 ? generatedSolutions : undefined,
    };

    const question = new Question(newQuestionData);
    await question.save();

    return NextResponse.json({ success: true, data: question }, { status: 201 });

  } catch (e: unknown) {
    const error = e as GeneralError;
    console.error("API Error creating question:", error);

    if (error.name === 'ValidationError') {
      return NextResponse.json({ success: false, error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    if (error.code === 11000) {
       return NextResponse.json({ success: false, error: 'Duplicate key error. A question with this title or ID might already exist.', details: error.keyValue }, { status: 409 });
    }
    const message = error.message || 'Server error creating question';
    return NextResponse.json({ success: false, error: message, details: error.message }, { status: 500 });
  }
}