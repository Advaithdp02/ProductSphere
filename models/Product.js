import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    uniqId: { type: String, unique: true, index: true },
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

export default mongoose.model("Product", productSchema);
