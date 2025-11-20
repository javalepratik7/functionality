// controllers/productController.js
import Product from "../models/Product.js";
import redis from "../config/redisClient.js";

// COMPANY-STYLE CACHING
export const getProducts = async (req, res) => {
  const cacheKey = "products:all";

  const cache = await redis.get(cacheKey);
  console.log("printing allt the cache ",cache)
  if (cache) {
    return res.json({ source: "cache", data: JSON.parse(cache) });
  }

  const products = await Product.find();
  await redis.set(cacheKey, JSON.stringify(products), "EX", 60);

  res.json({ source: "database", data: products });
};

export const createProduct = async (req, res) => {
  const product = await Product.create(req.body);

  await redis.del("products:all");

  res.status(201).json(product);
};
