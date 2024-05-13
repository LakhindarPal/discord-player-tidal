"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const discord_player_1 = require("discord-player");
const tidal_music_api_1 = require("tidal-music-api");
const youtube_sr_1 = require("youtube-sr");
const yt_stream_1 = require("yt-stream");
const soundcloud_ts_1 = __importDefault(require("soundcloud.ts"));
class TidalExtractor extends discord_player_1.BaseExtractor {
  constructor() {
    super(...arguments);
    this._stream = yt_stream_1.stream;
    this.protocols = ["tidal", "tdsearch"];
    this.client = new soundcloud_ts_1.default({
      clientId: this.options.soundcloud?.clientId,
      oauthToken: this.options.soundcloud?.oauthToken,
      proxy: this.options.soundcloud?.proxy,
    });
  }
  async activate() {
    /* tslint:disable-next-line */
    if (!this.options.bridgeFrom) this.options.bridgeFrom === "YouTube";
  }
  async validate(query, _type) {
    if (typeof query !== "string") return false;
    const type = (0, tidal_music_api_1.getURLType)(query);
    return Boolean(type) && type !== "ARTIST";
  }
  async handle(query, context) {
    const data = await (0, tidal_music_api_1.getInfo)(query);
    if (data?.type === "TRACK" || data?.type === "VIDEO") {
      const returnData = {
        playlist: null,
        tracks: [
          new discord_player_1.Track(this.context.player, {
            title: data?.title,
            raw: data,
            description: "",
            author: data.artists.map((artist) => artist.name).join(" "),
            url: `https://tidal.com/browse/${data.type.toLowerCase()}/${data.id}`,
            source: "arbitrary",
            thumbnail: data.image.large,
            duration: discord_player_1.Util.buildTimeCode(discord_player_1.Util.parseMS(data.duration * 1000)),
            views: 0,
            requestedBy: context.requestedBy,
          }),
        ],
      };
      return returnData;
    }
    if (data?.type === "PLAYLIST" || data?.type === "ALBUM" || data?.type === "MIX") {
      const playlist = new discord_player_1.Playlist(this.context.player, {
        title: data.title,
        thumbnail: data.image.large,
        author: {
          name: data.creator?.name || data.artists?.map((artist) => artist.name).join(" "),
          url: "",
        },
        type: data.type.toLowerCase(),
        rawPlaylist: data,
        tracks: [],
        description: "",
        source: "arbitrary",
        id: data.id.toString(),
        url: `https://tidal.com/browse/${data.type.toLowerCase()}/${data.id}`,
      });
      const tracks = data.tracks.map((track) => {
        return new discord_player_1.Track(this.context.player, {
          title: track.title,
          raw: track,
          description: "",
          author: track.artists.map((artist) => artist.name).join(" "),
          url: `https://tidal.com/browse/track/${track.id}`,
          source: "arbitrary",
          thumbnail: track.image.large,
          duration: discord_player_1.Util.buildTimeCode(discord_player_1.Util.parseMS(track.duration * 1000)),
          views: 0,
          requestedBy: context.requestedBy,
        });
      });
      playlist.tracks = tracks;
      return {
        playlist,
        tracks,
      };
    }
    return { playlist: null, tracks: [] };
  }
  async brdgeProvider(track) {
    const query = this.createBridgeQuery(track);
    if (this.options.bridgeFrom === "YouTube") {
      try {
        const serachResults = await youtube_sr_1.YouTube.search(query, {
          limit: 1,
          type: "video",
        });
        const ytStream = await this._stream(serachResults[0].url, {
          quality: "high",
          type: "audio",
          highWaterMark: 1048576 * 32,
          download: false,
        });
        return ytStream.url;
      } catch (error) {
        throw new Error(`Could not find a source to bridge from. The error is as follows.\n\n${error}`);
      }
    }
    const res = await this.client.tracks.searchV2({
      q: query,
    });
    if (res.collection.length === 0) throw new Error("Could not find a suitable source to stream from.");
    const str = this.client.util.streamLink(res.collection[0].permalink_url);
    return str;
  }
  async stream(info) {
    if (this.options.onBeforeCreateStream && typeof this.options.onBeforeCreateStream === "function") {
      return await this.options.onBeforeCreateStream(info);
    }
    return this.brdgeProvider(info);
  }
}
exports.default = TidalExtractor;
TidalExtractor.identifier = "com.discord-player.tidalextractor";
