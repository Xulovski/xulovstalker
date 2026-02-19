const express = require("express");
const app = express();

app.get("/manifest.json", (req, res) => {
  res.json({
    id: "org.stremio.stalker",
    version: "1.0.0",
    name: "Stalker IPTV TEST",
    description: "Addon teste simples",
    resources: ["catalog", "stream"],
    types: ["tv", "movie", "series"],
    catalogs: [
      { type: "tv", id: "tv", name: "TV" },
      { type: "movie", id: "movie", name: "Filmes" },
      { type: "series", id: "series", name: "Series" }
    ]
  });
});

app.get("/catalog/:type/:id", (req, res) => {
  res.json({ metas: [] });
});

app.get("/stream/:id", (req, res) => {
  res.json({ streams: [] });
});

app.listen(3000, () => console.log("Server running on port 3000"));
