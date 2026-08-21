import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'purchase' | 'balance_add' | 'balance_deduct';
  amount: number;
  description: string;
  createdAt: Date;
}

const TransactionSchema: Schema<ITransaction> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['purchase', 'balance_add', 'balance_deduct'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Transaction amount must be positive'],
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Index for reseller transaction history lookups
TransactionSchema.index({ userId: 1, createdAt: -1 });

const Transaction: Model<ITransaction> = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
