import { NextResponse, NextRequest } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

async function connectToDb() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/llm-interviewer');
}

interface ITestCase {
    input: unknown;
    expected_output: unknown;
}

interface IQuestion extends Document {
    _id: Types.ObjectId;
    title: string;
    test_cases?: ITestCase[];
}

const QuestionSchema = new Schema<IQuestion>({
    title: String,
    test_cases: [{
        input: Schema.Types.Mixed,
        expected_output: Schema.Types.Mixed
    }]
});

const Question: Model<IQuestion> = mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);


interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    error?: string;
}

const runPythonCode = (code: string, input: unknown, timeoutMs: number = 5000): Promise<ExecutionResult> => {
    return new Promise(async (resolve) => {
        let stdout = '';
        let stderr = '';
        let tempFilePath: string | null = null;
        let pythonProcess: ChildProcess | null = null;
        let processTimeout: NodeJS.Timeout | null = null;
        let resolved = false;

        const cleanupAndResolve = (result: ExecutionResult) => {
            if (resolved) return;
            resolved = true;
            if (processTimeout) clearTimeout(processTimeout);
            if (tempFilePath) {
                fs.unlink(tempFilePath)
                  .catch(err => console.error(`[Cleanup Warning] Failed to delete temp file ${tempFilePath}:`, err));
                tempFilePath = null;
            }
            resolve(result);
        };

        try {
            const tempDir = path.join(os.tmpdir(), 'code-execution');
            await fs.mkdir(tempDir, { recursive: true });
            tempFilePath = path.join(tempDir, `script_${Date.now()}_${Math.random().toString(36).substring(2)}.py`);

            const pythonImports = `
from typing import List, Dict, Tuple, Optional, Any, Union
import sys
import json
`;
            const driverCode = `
${pythonImports}

# --- User's Code Start ---
${code}
# --- User's Code End ---

try:
    input_data_str = sys.stdin.readline()
    try:
        input_data = json.loads(input_data_str)
    except json.JSONDecodeError:
         input_data = input_data_str.rstrip('\\n')

    result = None
    solution = Solution()

    if isinstance(input_data, list) and len(input_data) == 2 and isinstance(input_data[0], list) and isinstance(input_data[1], (int, float)):
        nums_list = input_data[0]
        target_num = input_data[1]
        result = solution.twoSum(nums=nums_list, target=target_num)
    else:
        raise ValueError(f"Input data structure ({type(input_data)}) received from stdin was not the expected list format [[nums_list], target_num].")


    try:
        print(json.dumps(result))
    except TypeError:
        print(str(result))

except NameError as e:
    print(f"Name Error: {e}. Did you define the required class/function?", file=sys.stderr)
    import traceback
    traceback.print_exc(file=sys.stderr)
except Exception as e:
    print(f"Runtime Error: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc(file=sys.stderr)

`;

            await fs.writeFile(tempFilePath, driverCode, 'utf-8');

            pythonProcess = spawn('python3', [tempFilePath], { stdio: ['pipe', 'pipe', 'pipe'] });

            if (!pythonProcess) {
                cleanupAndResolve({ stdout, stderr, exitCode: null, error: 'Failed to spawn Python process.' });
                return;
            }

            processTimeout = setTimeout(() => {
                if (!pythonProcess || pythonProcess.killed) return;
                console.warn(`[Timeout] Process timed out after ${timeoutMs}ms. Killing ${tempFilePath}`);
                pythonProcess.kill('SIGKILL');
                cleanupAndResolve({ stdout, stderr, exitCode: null, error: `Execution timed out after ${timeoutMs}ms` });
            }, timeoutMs);

            if (pythonProcess.stdout) {
                pythonProcess.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
            } else {
                 console.warn(`[Warning] pythonProcess.stdout is null for ${tempFilePath}. Cannot listen for stdout data.`);
            }

            if (pythonProcess.stderr) {
                pythonProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            } else {
                console.warn(`[Warning] pythonProcess.stderr is null for ${tempFilePath}. Cannot listen for stderr data.`);
            }


            pythonProcess.on('error', (err) => {
                 console.error(`[Error] Failed to start subprocess for ${tempFilePath}.`, err);
                cleanupAndResolve({ stdout, stderr, exitCode: null, error: `Failed to start Python process: ${err.message}` });
            });

            pythonProcess.on('close', (code) => {
                 cleanupAndResolve({ stdout, stderr, exitCode: code });
            });

            try {
                 const inputString = JSON.stringify(input) + '\n';
                 if (pythonProcess.stdin) {
                    pythonProcess.stdin.write(inputString);
                    pythonProcess.stdin.end();
                 } else {
                    throw new Error('Python process stdin is not available.');
                 }
             } catch (e: unknown) {
                 const err = e as Error;
                 console.error(`[Error] Error writing input to stdin for ${tempFilePath}:`, err);
                 if (pythonProcess && !pythonProcess.killed) pythonProcess.kill('SIGKILL');
                 cleanupAndResolve({ stdout, stderr, exitCode: null, error: `Failed to write input to Python script: ${err.message}` });
             }

        } catch (e: unknown) {
            const error = e as Error;
            console.error("[Error] Error during Python execution setup:", error);
            cleanupAndResolve({ stdout: '', stderr: '', exitCode: null, error: `Setup error: ${error.message}` });
        }
    });
};


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { code, questionId } = body;

        if (!code || !questionId) {
            return NextResponse.json({ success: false, error: 'Missing code or questionId' }, { status: 400 });
        }

        await connectToDb();

        const question = await Question.findById(questionId).select('test_cases').lean();

        if (!question) {
            return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
        }

        if (!question.test_cases || question.test_cases.length === 0) {
            return NextResponse.json({ success: false, error: 'No test cases found for this question' }, { status: 400 });
        }

        const results = [];
        const executionPromises = [];

        for (const testCase of question.test_cases) {
            executionPromises.push(
                runPythonCode(code, testCase.input)
                    .then(execResult => ({ ...execResult, testCase }))
            );
        }

        const executionResults = await Promise.all(executionPromises);

         for (const result of executionResults) {
             const { stdout, stderr, exitCode, error: executionError, testCase } = result;

             let status: 'Passed' | 'Failed' | 'Error' = 'Error';
             let actualOutput: unknown = null;
             let errorMessage = executionError;

             const inputString = JSON.stringify(testCase.input);
             const expectedOutputString = JSON.stringify(testCase.expected_output);

             if (!errorMessage && exitCode === 0 && stderr === '') {
                 try {
                     actualOutput = JSON.parse(stdout.trim());
                     const actualOutputString = JSON.stringify(actualOutput);

                     if (actualOutputString === expectedOutputString) {
                         status = 'Passed';
                     } else {
                         status = 'Failed';
                     }
                 } catch {
                     actualOutput = stdout.trim();
                     if (actualOutput === expectedOutputString) {
                         status = 'Passed';
                     } else {
                         status = 'Failed';
                     }
                     console.warn(`Test Case Input: ${inputString} - Output was not valid JSON: ${stdout}`);
                 }
             } else {
                  status = 'Error';
                  if (errorMessage) {
                    // Keep existing error
                  } else if (stderr) {
                      errorMessage = stderr.trim();
                      actualOutput = stderr.trim();
                  } else if (exitCode !== 0) {
                      errorMessage = `Execution Error: Process exited with code ${exitCode}`;
                      actualOutput = stdout.trim() || stderr.trim();
                  } else {
                      errorMessage = 'Unknown execution error';
                      actualOutput = stdout.trim() || stderr.trim();
                  }
             }

             results.push({
                 input: inputString,
                 expectedOutput: expectedOutputString,
                 actualOutput: status === 'Error' ? errorMessage : JSON.stringify(actualOutput),
                 status: status,
                 stdout: stdout.trim(),
                 stderr: stderr.trim(),
                 errorMessage: status === 'Error' ? errorMessage : undefined,
             });
        }

        return NextResponse.json({ success: true, results });

    } catch (e: unknown) {
        const error = e as Error;
        console.error("API Error in /api/runCode:", error);
        return NextResponse.json({ success: false, error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}