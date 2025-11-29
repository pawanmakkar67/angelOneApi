const express = require("express");
const axios = require("axios");
const SmartApi = require("smartapi-javascript").SmartAPI;

const app = express();
app.use(express.json());

// ---- ANGEL ONE LOGIN ----
const smartApi = new SmartApi({
  api_key: "B2qYNYYB"
});

let jwtToken = "";

async function loginAngel() {
  const session = await smartApi.generateSession("j57865267", "1122", "DFHBCJGFZ3UPRHMSM3P5LWF6DQ");
  jwtToken = session.data.jwtToken;
  console.log("Angel JWT:", jwtToken);
}

loginAngel();

// ---- WEBHOOK ENDPOINT ----
app.post("/webhook", async (req, res) => {
  const data = req.body;
  console.log("TradingView Webhook:", data);

  const side = data.action.toUpperCase(); // BUY / SELL
  const symbol = data.symbol;
  const qty = data.qty;

  try {
    const order = await smartApi.placeOrder({
      variety: "NORMAL",
      tradingsymbol: symbol,
      symboltoken: "12345", // replace with correct token
      transactiontype: side,
      exchange: "MCX",
      ordertype: "MARKET",
      producttype: "INTRADAY",
      duration: "DAY",
      quantity: qty
    });

    console.log("Order Success:", order);
    res.json({ status: "ok", order });
  } catch (e) {
    console.log("Order Failed:", e);
    res.json({ status: "error", error: e });
  }
});

// ---- START SERVER ----
app.listen(3000, () => console.log("Server running on port 3000"));
