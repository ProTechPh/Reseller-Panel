import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProductPrice {
  duration: string;
  price: number;
}

export interface IProduct extends Document {
  name: string;
  description: string;
  image?: string;
  prices: IProductPrice[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductPriceSchema = new Schema<IProductPrice>({
  duration: {
    type: String,
    required: [true, 'Duration is required'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
});

const ProductSchema: Schema<IProduct> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    image: {
      type: String,
      required: false,
    },
    prices: {
      type: [ProductPriceSchema],
      validate: {
        validator: function (v: IProductPrice[]) {
          return v && v.length > 0;
        },
        message: 'A product must have at least one pricing option.',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for active product lookups by resellers
ProductSchema.index({ isActive: 1 });

const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
