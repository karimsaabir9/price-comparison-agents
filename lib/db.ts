import { MongoClient, Db } from "mongodb";

let mongoClient: MongoClient;
let db: Db;

export async function connectMongoDB() {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const dbName = process.env.MONGODB_DB || "price_comparison_db";

  try {
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    db = mongoClient.db(dbName);
    console.log("✅ Connected to MongoDB");
    return db;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
}

export async function getDB() {
  if (!db) {
    await connectMongoDB();
  }
  return db;
}

export async function closeMongoDB() {
  if (mongoClient) {
    await mongoClient.close();
  }
}
