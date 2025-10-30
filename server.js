require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
const History = require("./models/History");

const app = express();

app.use(cors());
app.use(express.json());

// CoinGecko API URL
const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1";

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

// =====================
// 1. GET /api/coins
// =====================
app.get("/api/coins", async (req, res) => {
  try {
    console.log("📊 Fetching live data from CoinGecko...");

    const response = await axios.get(COINGECKO_URL);
    const coins = response.data;

    // Format the response as required
    const formattedCoins = coins.map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      current_price: coin.current_price,
      market_cap: coin.market_cap,
      price_change_percentage_24h: coin.price_change_percentage_24h,
      last_updated: coin.last_updated,
    }));

    console.log(`✅ Returned ${formattedCoins.length} coins to frontend`);
    res.json(formattedCoins);
  } catch (error) {
    console.error("❌ Error fetching coins:", error.message);
    res.status(500).json({
      error: "Failed to fetch coins data from CoinGecko",
      details: error.message,
    });
  }
});

// =====================
// 2. POST /api/history
// =====================
app.post("/api/history", async (req, res) => {
  try {
    console.log("💾 Storing snapshot to database...");

    // Fetch current data from CoinGecko
    const response = await axios.get(COINGECKO_URL);
    const coins = response.data;
    const timestamp = new Date();

    // Store each coin in History collection
    const savedRecords = [];

    for (const coin of coins) {
      const historyRecord = await History.create({
        coinId: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        price: coin.current_price,
        marketCap: coin.market_cap,
        change24h: coin.price_change_percentage_24h,
        timestamp: timestamp,
      });
      savedRecords.push(historyRecord);
    }

    console.log(`✅ Saved ${savedRecords.length} records to history`);

    res.status(201).json({
      success: true,
      message: "Snapshot stored successfully",
      recordsCount: savedRecords.length,
      timestamp: timestamp,
    });
  } catch (error) {
    console.error("❌ Error storing history:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to store history snapshot",
      details: error.message,
    });
  }
});

// =====================
// 3. GET /api/history/:coinId
// =====================
app.get("/api/history/:coinId", async (req, res) => {
  try {
    const { coinId } = req.params;
    const { limit = 24 } = req.query;

    console.log(`📈 Fetching history for ${coinId}`);

    const history = await History.find({ coinId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .select("price timestamp change24h");

    // Check if data exists
    if (history.length === 0) {
      return res.status(404).json({
        error: "No historical data found",
        message: `No history found for ${coinId}. Run POST /api/history first.`,
        coinId: coinId,
      });
    }

    // Return oldest first for charts
    const reversedHistory = history.reverse();

    res.json({
      coinId: coinId,
      recordsCount: reversedHistory.length,
      data: reversedHistory,
    });
  } catch (error) {
    console.error(
      `❌ Error fetching history for ${req.params.coinId}:`,
      error.message
    );
    res.status(500).json({
      error: "Failed to fetch historical data",
      details: error.message,
    });
  }
});

// =====================
// Health Check (Optional but recommended)
// =====================
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    endpoints: {
      "GET /api/coins": "Fetch live data from CoinGecko",
      "POST /api/history": "Store snapshot in database",
      "GET /api/history/:coinId": "Get historical data for chart",
    },
  });
});

const PORT = process.env.PORT || 5000;

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`\n📋 Available Endpoints:`);
    console.log(`   GET  /api/coins           - Fetch live CoinGecko data`);
    console.log(`   POST /api/history         - Store snapshot to database`);
    console.log(
      `   GET  /api/history/:coinId - Get historical data for charts`
    );
  });
});
