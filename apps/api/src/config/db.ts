import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

export async function connectDB(): Promise<string> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medcore_hms';

  try {
    // Try connecting to the configured MongoDB instance with a short timeout
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2500,
    });
    console.log(`[Database] Connected to external MongoDB at ${uri}`);
    return uri;
  } catch (error) {
    console.warn(`[Database] Could not connect to external MongoDB (${(error as Error).message}). Initializing embedded in-memory MongoDB...`);
    
    // Automatically launch embedded MongoDB Memory Server
    memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    
    await mongoose.connect(memoryUri);
    console.log(`[Database] Connected to embedded in-memory MongoDB at ${memoryUri}`);
    return memoryUri;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
  console.log('[Database] Disconnected from MongoDB');
}
