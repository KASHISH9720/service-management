import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const contactSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true }
  },
  { timestamps: true, versionKey: false }
);

export const Contact = mongoose.model('Contact', contactSchema);
