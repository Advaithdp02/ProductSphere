import mongoose from "mongoose";
import fs from "fs";
import csv from "csv-parser";
import dotenv from "dotenv";
import Product from "./src/models/product.model.ts"

dotenv.config();

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    const results = [];

    fs.createReadStream("data.csv") // <-- your CSV filename
      .pipe(csv())
      .on("data", (row) => {
        try {
          const product = {
            uniqId: row["Uniq Id"],
            crawlTimestamp: new Date(row["Crawl Timestamp"]),
            category: row["Category"],
            title: row["Product Title"],
            description: row["Product Description"],
            brand: row["Brand"],
            packSizeOrQuantity: row["Pack Size Or Quantity"],
            mrp: parseFloat(row["Mrp"]) || 0,
            price: parseFloat(row["Price"]) || 0,
            siteName: row["Site Name"],
            offers: row["Offers"],
            comboOffers: row["Combo Offers"],
            inStock: row["Stock Availibility"] === "YES",
            asin: row["Product Asin"],
            imageUrls: row["Image Urls"]
              ? [...new Set(row["Image Urls"].split("|"))] // remove duplicates
              : []
          };

          results.push(product);
        } catch (err) {
          console.log("Row skipped:", err.message);
        }
      })
      .on("end", async () => {
        try {
          await Product.insertMany(results, { ordered: false });
          console.log("Data Migration Successful 🚀");
        } catch (err) {
          console.log("Some duplicates skipped");
        } finally {
          mongoose.connection.close();
        }
      });
  } catch (error) {
    console.error("Migration Failed:", error);
  }
}

migrate();