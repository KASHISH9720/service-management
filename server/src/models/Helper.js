import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const helperSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: String, default: null },
    name: { type: String, required: true, trim: true },
    initials: { type: String, default: '' },
    serviceType: { type: String, enum: ['maid', 'babysitter', 'nanny'], default: 'maid' },
    experience: { type: String, default: 'New' },
    city: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    availability: { type: String, default: 'Flexible' },
    skills: { type: [String], default: [] },
    pricing: {
      hourly: { type: Number, default: 0 },
      monthly: { type: Number, default: 0 },
      yearly: { type: Number, default: 0 }
    },
    bio: { type: String, default: '' }
  },
  { timestamps: true, versionKey: false }
);

export const Helper = mongoose.model('Helper', helperSchema);
