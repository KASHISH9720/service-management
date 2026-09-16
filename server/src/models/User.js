import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['household', 'helper', 'admin'], default: 'household' },
    phone: { type: String, default: '' },
    city: { type: String, default: '' }
  },
  { timestamps: true, versionKey: false }
);

export const User = mongoose.model('User', userSchema);
