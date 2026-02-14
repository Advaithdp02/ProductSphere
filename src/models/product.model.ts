import mongoose, { Schema, Document, Model } from "mongoose";


export interface IProduct extends Document {
  uniqId: string;
  crawlTimestamp?: Date;
  category?: string;
  title?: string;
  description?: string;
  brand?: string;
  packSizeOrQuantity?: string;
  mrp?: number;
  price?: number;
  siteName?: string;
  offers?: string;
  comboOffers?: string;
  inStock?: boolean;
  asin?: string;
  imageUrls?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const productSchema: Schema<IProduct> = new Schema(
  {
    uniqId: { type: String, unique: true, index: true, required: true },
    crawlTimestamp: Date,
    category: String,
    title: String,
    description: String,
    brand: String,
    packSizeOrQuantity: String,
    mrp: Number,
    price: Number,
    siteName: String,
    offers: String,
    comboOffers: String,
    inStock: Boolean,
    asin: { type: String, index: true },
    imageUrls: [String]
  },
  { timestamps: true }
);


const Product: Model<IProduct> = mongoose.model<IProduct>(
  "Product",
  productSchema
);

export default Product;
