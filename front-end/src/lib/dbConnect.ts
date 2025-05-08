import mongoose, { Mongoose } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache;

if (process.env.NODE_ENV === 'production') {
  cached = { conn: null, promise: null };
} else {
  if (!global.mongoose) {
    global.mongoose = { conn: null, promise: null };
  }
  cached = global.mongoose;
}


async function dbConnect(): Promise<Mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection error:', e);
    throw new Error(`Database connection failed: ${(e as Error).message}`);
  }

  if (!cached.conn) {
    throw new Error('MongoDB connection failed unexpectedly after promise resolution.');
  }

  return cached.conn;
}

export default dbConnect;
