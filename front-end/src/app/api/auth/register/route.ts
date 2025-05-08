import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

interface MongooseValidationError {
  name: 'ValidationError';
  errors: {
    [path: string]: {
      message: string;
      name: string;
      properties: {
        message: string;
        type: string;
        path: string;
        value?: unknown;
        reason?: unknown;
      };
      kind: string;
      path: string;
      value?: unknown;
      reason?: unknown;
    };
  };
  message: string;
}

interface MongoError {
  name: string;
  code?: number;
  message: string;
  errors?: unknown;
}


export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required.' }, { status: 400 });
    }

    if (password.length < 6) {
        return NextResponse.json({ message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const existingUser = await User.findOne({ username: username });
    if (existingUser) {
      return NextResponse.json({ message: 'Username already exists. Please choose a different one.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      password: hashedPassword,
    });

    const userObject = newUser.toObject();
    delete userObject.password;

    return NextResponse.json({ message: 'Account created successfully!', user: userObject }, { status: 201 });

  } catch (e: unknown) {
    const error = e as MongoError;
    console.error('Register API Error:', error.message);

    if (error.name === 'ValidationError' && error.errors && typeof error.errors === 'object') {
        const errors: { [key: string]: string } = {};
        const validationError = e as MongooseValidationError;
        for (const field in validationError.errors) {
            if (Object.prototype.hasOwnProperty.call(validationError.errors, field)) {
                 errors[field] = validationError.errors[field].message;
            }
        }
        return NextResponse.json({ message: 'Validation Error', errors }, { status: 400 });
    }

    if (error.code === 11000) {
        return NextResponse.json({ message: 'Username already exists.' }, { status: 409 });
    }

    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}