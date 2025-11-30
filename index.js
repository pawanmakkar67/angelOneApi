import express from "express";
import axios from "axios";
import { SmartAPI } from "smartapi-javascript";
import { totp } from "otplib";

const app = express();
app.use(express.json());
totp.options = { digits: 6, step: 30, window: 1 };

// ---- ANGEL ONE LOGIN ----
const smartApi = new SmartAPI({
  api_key: process.env.API_KEY || "B2qYNYYB"
});

let jwtToken = "";
let refreshToken = "";

// ---- TOTP GENERATOR ----
function getTOTP() {
  return totp.generate("DFHBCJGFZ3UPRHMSM3P5LWF6DQ");
}

// ---- LOGIN FUNCTION ----
async function loginAngel() {
  try {
    console.log("Attempting Angel One Login...");
    const code = getTOTP();
    console.log("Generated TOTP:", code);

    const session = await smartApi.generateSession(
      process.env.CLIENT_CODE || "J57865267",
      process.env.PASSWORD || "1122",
      code
    );

    console.log("Login Response:", session);

    if (!session || !session.data) {
      console.error("❌ Login failed: No session.data returned");
      return;
    }

    jwtToken = session.data.jwtToken;
    refreshToken = session.data.refreshToken;

    console.log("✅ Angel One Login Successful");
    console.log("JWT:", jwtToken);
    console.log("REFRESH:", refreshToken);

    // Set token so placeOrder works
    smartApi.setSession(jwtToken, refreshToken);

  } catch (err) {
    console.error("❌ Login Error:", err.message || err);
  }
}

// First login
loginAngel();

// Auto-refresh session every 12 hours
setInterval(async () => {
  console.log("🔁 Refreshing Angel One Token...");
  try {
    const refreshData = await smartApi.renewAccessToken(refreshToken);
    if (refreshData && refreshData.data) {
      jwtToken = refreshData.data.jwtToken;
      refreshToken = refreshData.data.refreshToken;

      smartApi.setSession(jwtToken, refreshToken);
      console.log("🔄 Token Refreshed Successfully");
    } else {
      console.log("⚠️ Refresh token invalid. Logging in again…");
      await loginAngel();
    }
  } catch (error) {
    console.log("⚠️ Refresh failed. Re-login required.");
    await loginAngel();
  }
}, 12 * 60 * 60 * 1000);

// ---- WEBHOOK ENDPOINT ----
app.post("/webhook", async (req, res) => {
  const data = req.body;
  console.log("📩 TradingView Webhook:", data);

  const side = data.action.toUpperCase();
  const symbol = data.symbol;
  const qty = data.qty;

  if (!jwtToken) {
    return res.json({ status: "error", message: "No valid session. Login failed." });
  }

  try {
    const order = await smartApi.placeOrder({
      variety: "NORMAL",
      tradingsymbol: symbol,
      symboltoken: "12345",
      transactiontype: side,
      exchange: "MCX",
      ordertype: "MARKET",
      producttype: "INTRADAY",
      duration: "DAY",
      quantity: qty
    });

    console.log("✅ Order Placed:", order);
    res.json({ status: "ok", order });

  } catch (e) {
    console.log("❌ Order Failed:", e);
    res.json({ status: "error", error: e });
  }
});

// ---- START SERVER ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
