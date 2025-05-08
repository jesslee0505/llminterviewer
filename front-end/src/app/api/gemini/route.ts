import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY environment variable.");
}

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const generationConfig = {
  // temperature: 1,
  // topK: 0,
  // topP: 0.95,
  // maxOutputTokens: 2048
};

const MODEL_NAME = "gemini-1.5-flash-latest";

export async function POST(req: Request) {
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key not configured correctly on the server.' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { prompt: originalClientPrompt } = body;

    if (!originalClientPrompt || typeof originalClientPrompt !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "prompt" in request body' },
        { status: 400 }
      );
    }

    const finalPrompt = `
      ${originalClientPrompt}
      
      Keep your response concise.
    `;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        safetySettings,
        generationConfig,
    });

    console.log("Sending final prompt to Gemini:", finalPrompt.substring(0, 100) + "...");
    const result = await model.generateContent(finalPrompt);

    const response = result.response;
    const text = response.text();

    if (!text) {
         console.warn("Gemini returned an empty response.");
         const finishReason = response.candidates?.[0]?.finishReason;
         if (finishReason === 'SAFETY') {
             throw new Error("The generated response was blocked due to safety settings.");
         } else if (finishReason) {
             throw new Error(`Generation finished unexpectedly: ${finishReason}`);
         }
         throw new Error("Received an empty response from the assistant.");
    }

    console.log("Received reply from Gemini:", text.substring(0, 100) + "...");
    return NextResponse.json({ reply: text });

  } catch (error: unknown) {
    console.error("Error calling Gemini API:", error);
    let errorMessage = 'Failed to fetch response from Gemini API';
    let statusCode = 500;

    if (error instanceof Error) {
        errorMessage = error.message;
    }

    // @ts-expect-error expect error for safety
     if (error?.response?.promptFeedback?.blockReason) {
      // @ts-expect-error expect error for safety
      errorMessage = `Request blocked due to safety settings: ${error.response.promptFeedback.blockReason}`;
      statusCode = 400;
      // @ts-expect-error expect error for safety
      console.error("Safety block details:", error.response.promptFeedback);
    }

    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.toString() : String(error) },
      { status: statusCode }
    );
  }
}