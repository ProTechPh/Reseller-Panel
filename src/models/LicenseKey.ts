import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILicenseKey extends Document {
  key: string;
  productId: mongoose.Types.ObjectId;
  resellerId?: mongoose.Types.ObjectId;
  duration: string;
  price?: number;
  isSold: boolean;
  soldAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LicenseKeySchema: Schema<ILicenseKey> = new Schema(
  {
    key: {
      type: String,
      required: [true, 'License key is required'],
      unique: true,
      trim: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    resellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    duration: {
      type: String,
      required: [true, 'Duration is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: false,
      min: 0,
    },
    isSold: {
      type: Boolean,
      default: false,
      required: true,
    },
    soldAt: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

// Compound indexes for query performance
LicenseKeySchema.index({ isSold: 1, productId: 1, duration: 1 }); // Buy endpoint: find unsold key by product+duration
LicenseKeySchema.index({ resellerId: 1, createdAt: -1 }); // Reseller keys lookup sorted by date

const LicenseKey: Model<ILicenseKey> = mongoose.models.LicenseKey || mongoose.model<ILicenseKey>('LicenseKey', LicenseKeySchema);

export default LicenseKey;
