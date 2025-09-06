const express = require("express");
const axios = require("axios");
const cors = require("cors");
const Redis = require("redis");

const DEFAULT_EXPIRATION = 30;

const app = express();
app.use(cors());

const redisClient = Redis.createClient();

redisClient.on("error", (err) => console.error("Redis Client Error", err));

(async () => {
  await redisClient.connect();
})();

app.get("/photos", async (req, res) => {
  const albumId = req.query.albumId;
  const photos = await getOrSetCache(`photos?albumId=${albumId}`, async () => {
    const { data } = await axios.get(
      "https://jsonplaceholder.typicode.com/photos",
      { params: { albumId } }
    );
    return data;
  });

  res.json(photos);
});

app.get("/photos/:id", async (req, res) => {
  const photo = await getOrSetCache(`photo:${req.params.id}`, async () => {
    const { data } = await axios.get(
      `https://jsonplaceholder.typicode.com/photos/${req.params.id}`
    );
    return data;
  });

  res.json(photo);
});

async function getOrSetCache(key, cb) {
  const data = await redisClient.get(key);
  if (data != null) {
    console.log("Cache hit");
    return JSON.parse(data);
  }

  console.log("Cache miss");
  const freshData = await cb();
  await redisClient.setEx(key, DEFAULT_EXPIRATION, JSON.stringify(freshData));
  console.log("Cache set");
  return freshData;
}

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
