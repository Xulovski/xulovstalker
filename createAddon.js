const { addonBuilder } = require('stremio-addon-sdk');
const stalker = require('./stalkerClient');
const { v4: uuid } = require('uuid');

module.exports = async function createAddon(query) {
  const config = query.config ? JSON.parse(query.config) : { lists: [] };

  const manifest = {
    id: 'org.stremio.stalker.addon',
    version: '2.0.0',
    name: 'Stalker IPTV',
    description: 'IPTV Stalker (MAG) Live, VOD e Séries',
    types: ['tv', 'movie', 'series'],
    catalogs: [
      { type: 'tv', id: 'stalker_tv', name: 'Live TV' },
      { type: 'movie', id: 'stalker_movies', name: 'Filmes' },
      { type: 'series', id: 'stalker_series', name: 'Séries' }
    ],
    resources: ['catalog', 'stream'],
    behaviorHints: { configurable: true }
  };

  const builder = new addonBuilder(manifest);

  const state = { tv: [], movies: [], series: [] };

  for (const list of config.lists || []) {
    const token = await stalker.handshake(list.portalUrl, list.mac);

    const channels = await stalker.get(list.portalUrl, list.mac, token, 'itv', 'get_all_channels');
    channels.forEach(ch => state.tv.push({
      id: uuid(),
      type: 'tv',
      name: `[${list.name}] ${ch.name}`,
      cmd: ch.cmd,
      list
    }));

    const vod = await stalker.get(list.portalUrl, list.mac, token, 'vod', 'get_all_vod');
    vod.forEach(v => state.movies.push({
      id: uuid(),
      type: 'movie',
      name: `[${list.name}] ${v.name}`,
      cmd: v.cmd,
      list
    }));

    const series = await stalker.get(list.portalUrl, list.mac, token, 'series', 'get_all_series');
    series.forEach(s => state.series.push({
      id: uuid(),
      type: 'series',
      name: `[${list.name}] ${s.name}`,
      cmd: s.cmd,
      list
    }));
  }

  builder.defineCatalogHandler(({ type }) => ({
    metas: state[type] || []
  }));

  builder.defineStreamHandler(async ({ id }) => {
    const item = [...state.tv, ...state.movies, ...state.series].find(i => i.id === id);
    if (!item) return { streams: [] };

    const token = await stalker.handshake(item.list.portalUrl, item.list.mac);
    const url = await stalker.createLink(item.list.portalUrl, item.list.mac, token, item.cmd);

    return { streams: [{ url, behaviorHints: { notWebReady: true } }] };
  });

  return builder.getInterface();
};
