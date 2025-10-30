const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  coinId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  symbol: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  marketCap: {
    type: Number,
    required: true,
  },
  change24h: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index for better query performance
historySchema.index({ coinId: 1, timestamp: -1 });

module.exports = mongoose.model("History", historySchema);
