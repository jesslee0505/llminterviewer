import { NextResponse, NextRequest } from 'next/server';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';

interface S3Error extends Error {
    code?: string;
    requestId?: string;
    extendedRequestId?: string;
    cfId?: string;
    name: string;
}


const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

function getFileExtension(language: string): string {
  switch (language.toLowerCase()) {
    case 'python':
      return 'py';
    default:
      return 'txt';
  }
}

export async function POST(request: NextRequest) {
  if (!S3_BUCKET_NAME) {
    console.error("S3_BUCKET_NAME environment variable is not set.");
    return NextResponse.json({ success: false, error: "Server configuration error: S3 bucket name missing." }, { status: 500 });
  }
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
    console.error("AWS credentials or region environment variables are not set.");
    return NextResponse.json({ success: false, error: "Server configuration error: AWS configuration missing." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      userId,
      questionId,
      code,
      language
    } = body;

    if (!userId || !questionId || typeof code !== 'string' || !language) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: userId, questionId, code, or language.'
      }, { status: 400 });
    }

    const submissionId = uuidv4();
    const fileExtension = getFileExtension(language);

    const s3Key = `users/${userId}/submissions/${questionId}/${submissionId}.${fileExtension}`;

    const putObjectParams = {
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      Body: code,
      ContentType: `text/${language}`,
    };

    console.log(`Attempting to upload submission to S3: ${S3_BUCKET_NAME}/${s3Key}`);

    const command = new PutObjectCommand(putObjectParams);
    await s3Client.send(command);

    console.log(`Successfully uploaded submission to S3: ${S3_BUCKET_NAME}/${s3Key}`);

    return NextResponse.json({
      success: true,
      message: 'Code submitted successfully.',
      submissionId: submissionId,
      s3Path: s3Key
    }, { status: 201 });

  } catch (e: unknown) {
    const error = e as S3Error;
    console.error("Error processing submission:", error);
    let errorMessage = 'Failed to submit code.';
    if (error.name === 'CredentialsProviderError') {
        errorMessage = 'AWS credentials provider error. Check server configuration.';
    } else if (error.message) {
        errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage, details: error.toString() }, { status: 500 });
  }
}
