import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required.' }, { status: 400 });
    }

    const user = await User.findOne({ username: username }).select('+password');

    if (!user) {
      return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password!);

    if (!isPasswordMatch) {
      return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
    }

    const userObject = user.toObject();
    delete userObject.password;

    return NextResponse.json({
      message: 'Login successful!',
      user: userObject,
    }, { status: 200 });

  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}