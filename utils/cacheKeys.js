// utils/cacheKeys.js (BIG COMPANIES USE CENTRALIZED KEYS)
export const CACHE_KEYS = {
  ALL_PRODUCTS: "products:all",
  USER_SESSION: (userId) => `session:${userId}`,
};