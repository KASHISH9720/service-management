import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const bookingSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    householdId: { type: String, required: true },
    householdName: { type: String, default: '' },
    helperId: { type: String, required: true },
    helperName: { type: String, default: '' },
    plan: { type: String, enum: ['hourly', 'monthly', 'yearly'], required: true },
    startDate: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' },
    notes: { type: String, default: '' }
  },
  { timestamps: true, versionKey: false }
);

export const Booking = mongoose.model('Booking', bookingSchema);
