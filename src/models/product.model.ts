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
    uniqId: { type: String, unique: true, required: true },
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

// Text index for search (replaces $regex full scans)
productSchema.index({ title: "text", description: "text", brand: "text" });

// Filter indexes
productSchema.index({ category: 1, brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ siteName: 1 });


const Product: Model<IProduct> = mongoose.model<IProduct>(
  "Product",
  productSchema
);

export default Product;
