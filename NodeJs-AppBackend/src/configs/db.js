import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully!", conn.connection.host);
  } catch (error) {
    console.log("error occured while connecting to db", error.message);
    process.exit(1);
  }
};
