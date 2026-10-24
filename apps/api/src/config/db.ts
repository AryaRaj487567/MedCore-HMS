
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

export async function connectDB(): Promise<string> {
  mongoose.set('strictQuery', false);

  const uri = process.env.MONGODB_URI;

  if (process.env.NODE_ENV === 'production' && !uri) {
    throw new Error('MONGODB_URI is required in production');
  }

  if (uri) {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log('[Database] Connected successfully');
    return uri;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('MongoDB Atlas connection is required in production');
  }

  console.warn('[Database] No MongoDB URI configured. Starting in-memory database...');

  memoryServer = await MongoMemoryServer.create();
  const memoryUri = memoryServer.getUri();

  await mongoose.connect(memoryUri);

  console.log('[Database] Connected to in-memory MongoDB');
  return memoryUri;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }

  console.log('[Database] Disconnected from MongoDB');
}

