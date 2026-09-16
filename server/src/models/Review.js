import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const reviewSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    helperId: { type: String, required: true },
    householdId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' }
  },
  { timestamps: true, versionKey: false }
);

export const Review = mongoose.model('Review', reviewSchema);
