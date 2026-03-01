const express = require("express");
const cors = require("cors");
const axios = require("axios");
const addon = require("./addon.cjs");

const app = express();

// 1. Permissões de Segurança (Obrigatório para TVs)
app.use(cors());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    next();
});

// 2. Redirecionamento Inicial para a Página de Configuração
app.get("/", (req, res) => res.redirect("/configure"));

// 3. A Página de Configuração (O formulário onde metes o URL e o MAC)
app.get("/configure", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>XuloV Stalker Config</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: Arial, sans-serif; background: #0c0d19; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .box { background: #1b1d30; padding: 30px; border-radius: 10px; width: 90%; max-width: 400px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
                input { width: 100%; padding: 12px; margin: 10px 0; border-radius: 5px; border: 1px solid #444; background: #222; color: white; box-sizing: border-box; }
                button { width: 100%; padding: 15px; background: #8e44ad; color: white; border: none; border-radius: 5px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 15px; }
                button:hover { background: #9b59b6; }
            </style>
        </head>
        <body>
            <div class="box">
                <h2>Portal Stalker</h2>
                <input type="text" id="url" placeholder="URL (ex: http://exemplo.com/c/)">
                <input type="text" id="mac" placeholder="MAC (ex: 00:1A:79:...)">
                <button onclick="instalar()">INSTALAR NO STREMIO</button>
            </div>
            <script>
                function instalar() {
                    const url = document.getElementById('url').value.trim();
                    const mac = document.getElementById('mac').value.trim();
                    if(!url || !mac) return alert("Por favor, preenche o URL e o MAC!");
                    
                    const config = { url: url, mac: mac, model: 'MAG254' };
                    // Transforma os dados em Base64
                    const b64 = btoa(JSON.stringify(config));
                    // Cria o link de instalação do Stremio
                    const installLink = "stremio://" + window.location.host + "/" + b64 + "/manifest.json";
                    window.location.href = installLink;
                }
            </script>
        </body>
        </html>
    `);
});

// ==========================================
// ROTAS DINÂMICAS DO STREMIO (Lêem o :config)
// ==========================================

// Manifest
app.get("/:config/manifest.json", async (req, res) => {
    const manifest = await addon.getManifest(req.params.config);
    res.json(manifest);
});

// Catálogo (Passa o config para o addon.cjs)
app.get("/:config/catalog/:type/:id/:extra?.json", async (req, res) => {
    const { type, id, extra, config } = req.params;
    
    let extraObj = {};
    if (extra) {
        extra.replace(".json", "").split("&").forEach(p => {
            const [k, v] = p.split("=");
            if (k && v) extraObj[k] = decodeURIComponent(v);
        });
    }
    
    const catalog = await addon.getCatalog(type, id, extraObj, config);
    res.json(catalog);
});

// Streams (Passa o config para gerar o link do vídeo)
app.get("/:config/stream/:type/:id.json", async (req, res) => {
    const { type, id, config } = req.params;
    const streams = await addon.getStreams(type, id, config);
    
    // TRUQUE DINÂMICO: Garante que o link do Proxy usa o endereço atual do servidor (Beamup ou Localhost)
    if (streams.streams && streams.streams.length > 0) {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers.host;
        const channelId = id.split(":")[2];
        // Substitui o link do vídeo pelo proxy correto dinamicamente
        streams.streams[0].url = \`\${protocol}://\${host}/proxy/\${config}/\${channelId}\`;
    }
    
    res.json(streams);
});

// ==========================================
// O PROXY DE VÍDEO (Vital para a Samsung TV)
// ==========================================
app.get("/proxy/:config/:channelId", async (req, res) => {
    const { config, channelId } = req.params;
    
    // Decifra o config e faz login no portal do utilizador
    const configData = addon.parseConfig(config);
    if (!configData) return res.status(400).send("Configuração inválida");

    const auth = await addon.authenticate(configData);
    if (!auth) return res.status(500).send("Falha na autenticação do portal");

    try {
        // Pede ao portal o link real de streaming (.m3u8 ou .ts)
        const linkUrl = \`\${auth.apiUrl}type=itv&action=create_link&cmd=ffrt%20http://localhost/ch/\${channelId}&JsHttpRequest=1-0&token=\${auth.token}\`;
        const linkRes = await axios.get(linkUrl, { headers: auth.headers });
        
        const realStreamUrl = linkRes.data?.js?.cmd || linkRes.data?.cmd;

        if (realStreamUrl) {
            console.log(\`[PROXY] A redirecionar TV para: \${realStreamUrl.substring(0,40)}...\`);
            res.redirect(realStreamUrl); // Envia o vídeo final para a TV
        } else {
            res.status(404).send("Sinal do canal offline");
        }
    } catch (err) {
        console.error("Erro no proxy:", err.message);
        res.status(500).send("Erro ao obter o vídeo");
    }
});

// Inicia o servidor na porta do Beamup ou 3000
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(\`✅ Servidor Stalker Universal Online na porta \${port}!\`);
});

