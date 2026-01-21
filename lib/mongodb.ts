import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    cached!.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,

      // 🔥 MOST IMPORTANT FOR ATLAS M0 / serverless production
      // In production (Vercel/Render/etc.) you can end up with many instances.
      // Keeping the pool tiny prevents Atlas "connections exceeded" and the resulting TLS/SSL errors.
      maxPoolSize: 1,
      minPoolSize: 0,
      maxIdleTimeMS: 60_000,          // close idle sockets faster

      serverSelectionTimeoutMS: 5000, // fail fast
      socketTimeoutMS: 45000,

      retryWrites: true,
      heartbeatFrequencyMS: 10000,
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (error) {
    cached!.promise = null;
    throw error;
  }

  return cached!.conn;
}

// ✅ Cleanup to avoid zombie connections
mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
  cached!.conn = null;
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB error:", err);
});

export default connectDB;