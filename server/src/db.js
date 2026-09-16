import mongoose from 'mongoose';

// MongoDB connection layer (Mongoose).
// Connection string comes from server/.env (MONGODB_URI).
// Falls back to a local MongoDB instance if not set.

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/helper4u';

mongoose.set('strictQuery', true);

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`MongoDB connected successfully -> ${MONGODB_URI}`);
    return mongoose.connection;
  } catch (err) {
    console.error('MongoDB connection failed.');
    console.error(`Reason: ${err.message}`);
    console.error('Make sure MongoDB is running locally, or set a valid MONGODB_URI in server/.env (see MONGODB_SETUP.md).');
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected.');
});

export default mongoose;
