const fetch = require('node-fetch');

function headers(portalUrl, mac, token) {
  return {
    'User-Agent': 'Mozilla/5.0',
    'X-User-Agent': 'Model: MAG250; Link: Ethernet',
    'Referer': portalUrl,
    'Accept': 'application/json',
    'Cookie': `mac=${mac}; stb_lang=en; timezone=GMT`,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function handshake(portalUrl, mac) {
  const res = await fetch(
    `${portalUrl}/server/load.php?type=stb&action=handshake`,
    { headers: headers(portalUrl, mac) }
  );
  const json = await res.json();
  return json.js.token;
}

async function get(portalUrl, mac, token, type, action, extra = '') {
  const res = await fetch(
    `${portalUrl}/server/load.php?type=${type}&action=${action}${extra}`,
    { headers: headers(portalUrl, mac, token) }
  );
  const json = await res.json();
  return json.js.data || [];
}

async function createLink(portalUrl, mac, token, cmd) {
  const res = await fetch(
    `${portalUrl}/server/load.php?type=itv&action=create_link&cmd=${encodeURIComponent(cmd)}`,
    { headers: headers(portalUrl, mac, token) }
  );
  const json = await res.json();
  return json.js.cmd;
}

module.exports = { handshake, get, createLink };
