import mongoose, { Schema, Document, Model } from 'mongoose';

interface IExample {
  input: unknown;
  output: unknown;
  explanation?: string;
}

interface ISolution {
  code: string;
  summary?: string;
  language?: string;
  title?: string;
}

interface ITestCase {
  input: unknown;
  expected_output: unknown;
}

export interface IQuestion extends Document {
  id?: number;
  title: string;
  description: string;
  difficulty?: string;
  examples?: IExample[];
  constraints?: string[];
  starting_code?: string;
  solutions: ISolution[];
  test_cases?: ITestCase[];
  createdAt?: Date;
}

const QuestionSchema: Schema<IQuestion> = new Schema({
  id: {
    type: Number,
    unique: true,
    sparse: true,
  },
  title: {
    type: String,
    required: [true, 'Please provide a title for this question.'],
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    required: [true, 'Please provide a description.'],
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
  },
  examples: {
    type: [{
        input: Schema.Types.Mixed,
        output: Schema.Types.Mixed,
        explanation: String
    }],
    default: [],
  },
  constraints: {
    type: [String],
    default: [],
  },
  starting_code: {
    type: String,
  },
  solutions: {
    type: [{
        code: { type: String, required: true },
        summary: String,
        language: String,
        title: String
    }],
    required: [true, 'Please provide at least one solution.'],
    validate: {
        validator: function(v: unknown[]) { return Array.isArray(v) && v.length > 0; },
        message: 'Solutions array cannot be empty and must contain at least one solution.'
    }
  },
  test_cases: {
    type: [{
        input: Schema.Types.Mixed,
        expected_output: Schema.Types.Mixed
    }],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  collection: 'coding_questions',
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

const Question: Model<IQuestion> = mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);

export default Question;
