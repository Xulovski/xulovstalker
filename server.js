import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* arquivos estáticos */
app.use(express.static(path.join(__dirname, "public")));

/* página de configuração */
app.get("/configure", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "configure.html"));
});

/* manifest SIMPLES (sem loop no Stremio) */
app.get("/manifest.json", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  res.json({
    id: "org.stremio.stalker",
    version: "1.0.5",
    name: "Stalker IPTV",
    description: "Addon IPTV Stalker (MAG / STB Emu)",
    resources: ["catalog", "stream"],
    types: ["tv", "movie", "series"],
    catalogs: [
      { type: "tv", id: "stalker_tv", name: "Stalker TV" },
      { type: "movie", id: "stalker_movies", name: "Stalker Filmes" },
      { type: "series", id: "stalker_series", name: "Stalker Séries" }
    ],
    behaviorHints: {
      configurable: false,
      configurationRequired: false
    }
  });
});
/* rotas vazias (evita crash do Stremio) */
app.get("/catalog/:type/:id", (req, res) => {
  res.json({ metas: [] });
});

app.get("/stream/:type/:id", (req, res) => {
  res.json({ streams: [] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Stalker Addon running on port " + PORT);
});
