const axios = require("axios");
const crypto = require("crypto");

const addon = {
    // 1. ESTA É A PARTE NOVA: Transforma o link do Stremio em dados reais
    parseConfig(configBase64) {
        try {
            if (!configBase64) return null;
            const decoded = Buffer.from(configBase64, 'base64').toString();
            return JSON.parse(decoded);
        } catch (e) {
            console.error("Erro ao decifrar configuração:", e);
            return null;
        }
    },

    // 2. FUNÇÃO DE AUTENTICAÇÃO (Usa os dados que o user inseriu)
    async authenticate(config) {
        if (!config || !config.url || !config.mac) return null;
        
        const mac = config.mac.toUpperCase();
        const seed = mac.replace(/:/g, "");
        const id1 = crypto.createHash('md5').update(seed + "id1").digest('hex').toUpperCase();
        const sig = crypto.createHash('md5').update(seed + "sig").digest('hex').toUpperCase();
        
        const headers = {
            "User-Agent": "Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3",
            "X-User-Agent": `Model: ${config.model || 'MAG254'}; SW: 2.18-r14; Device ID: ${id1}; Signature: ${sig};`,
            "Cookie": `mac=${encodeURIComponent(mac)}; stb_lang=en; timezone=Europe/Lisbon;`
        };

        const baseUrl = config.url.trim().replace(/\/portal\.php\/?$/, "");
        const apiUrl = baseUrl + (baseUrl.endsWith('/') ? "" : "/") + "portal.php?";

        try {
            const hRes = await axios.get(`${apiUrl}type=stb&action=handshake&device_id=${id1}&JsHttpRequest=1-0`, { headers });
            const token = hRes.data?.js?.token || hRes.data?.token;
            return { token, apiUrl, headers, id1, authData: { sn: "XULOVSN", headers } };
        } catch (e) { return null; }
    },

    // 3. MANIFESTO (Muda o nome do addon conforme o user)
    async getManifest(configBase64) {
        const config = this.parseConfig(configBase64);
        return {
            id: "org.xulov.stalker",
            version: "1.0.0",
            name: "XuloV Stalker" + (config ? " (Ativo)" : ""),
            description: "IPTV Stalker Portal para Samsung, Android e PC",
            resources: ["catalog", "stream"],
            types: ["tv"],
            idPrefixes: ["stalker:"],
            catalogs: config ? [{
                type: "tv",
                id: "stalker_live",
                name: "Canais em Direto",
                extra: [{ name: "genre", isRequired: false }]
            }] : []
        };
    },

    // 4. CATÁLOGO (Usa o configBase64 para saber a quem pedir os canais)
    async getCatalog(type, id, extra, configBase64) {
        const config = this.parseConfig(configBase64);
        const auth = await this.authenticate(config);
        if (!auth) return { metas: [] };

        try {
            // Aqui vai a tua lógica de pedir os canais ao portal...
            // Exemplo simplificado:
            const url = `${auth.apiUrl}type=itv&action=get_all_channels&JsHttpRequest=1-0&token=${auth.token}`;
            const res = await axios.get(url, { headers: auth.headers });
            const channels = res.data?.js?.data || [];

            const metas = channels.map(ch => ({
                id: `stalker:live:${ch.id}:${encodeURIComponent(ch.name)}`,
                name: ch.name,
                type: "tv",
                poster: ch.logo || ""
            }));

            return { metas };
        } catch (e) { return { metas: [] }; }
    },

    // 5. STREAMS (Onde gera o link para a TV)
    async getStreams(type, id, configBase64) {
        const config = this.parseConfig(configBase64);
        const channelId = id.split(":")[2];
        
        // No Beamup/Samsung, vamos enviar o link do PROXY que está no server.cjs
        // Nota: Substitui 'teu-addon.beamup.tv' pelo teu link real do Beamup depois do deploy
        const proxyUrl = `https://teu-addon.beamup.tv/proxy/${configBase64}/${channelId}`;

        return {
            streams: [{
                url: proxyUrl,
                title: "▶️ Reproduzir na TV",
                behaviorHints: { notWeb: false, isLive: true }
            }]
        };
    }
};

module.exports = addon;

