import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  role: 'admin' | 'reseller';
  balance: number;
  isBanned: boolean;
  resellerType: 'budget' | 'unlimited';
  allowedProducts: mongoose.Types.ObjectId[];
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    role: {
      type: String,
      enum: ['admin', 'reseller'],
      default: 'reseller',
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    resellerType: {
      type: String,
      enum: ['budget', 'unlimited'],
      default: 'budget',
    },
    allowedProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

if (mongoose.models.User) {
  delete mongoose.models.User;
}

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;
