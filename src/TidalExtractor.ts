import {
  BaseExtractor,
  ExtractorInfo,
  ExtractorSearchContext,
  Playlist,
  SearchQueryType,
  Track,
  Util,
} from "discord-player";
import { getInfo, getURLType } from "tidal-music-api";
import { YouTube } from "youtube-sr";
import { Readable } from "stream";
import { stream } from "yt-stream";
import { default as SoundCloud } from "soundcloud.ts";

interface TidalOptions {
  bridgeFrom?: "YouTube" | "SoundCloud";
  soundcloud?: {
    clientId?: string;
    oauthToken?: string;
    proxy?: string;
  };
  onBeforeCreateStream?: (track: Track) => Promise<string | Readable>;
}

export default class TidalExtractor extends BaseExtractor<TidalOptions> {
  public static identifier: string = "com.discord-player.tidalextractor" as const;
  private _stream = stream;
  protocols = ["tidal", "tdsearch"];

  client = new SoundCloud({
    clientId: this.options.soundcloud?.clientId,
    oauthToken: this.options.soundcloud?.oauthToken,
    proxy: this.options.soundcloud?.proxy,
  });

  public async activate(): Promise<void> {
    /* tslint:disable-next-line */
    if (!this.options.bridgeFrom) this.options.bridgeFrom === "YouTube";
  }

  public async validate(query: string, _type?: SearchQueryType | null | undefined): Promise<boolean> {
    if (typeof query !== "string") return false;
    const type = getURLType(query);
    return Boolean(type) && type !== "ARTIST";
  }

  public async handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo> {
    const data: any = await getInfo(query);

    if (data?.type === "TRACK" || data?.type === "VIDEO") {
      const returnData = {
        playlist: null,
        tracks: [
          new Track(this.context.player, {
            title: data?.title as string,
            raw: data,
            description: "",
            author: data.artists.map((artist: any) => artist.name).join(" "),
            url: `https://tidal.com/browse/${data.type.toLowerCase()}/${data.id}`,
            source: "arbitrary",
            thumbnail: data.image.large,
            duration: Util.buildTimeCode(Util.parseMS(data.duration * 1000)),
            views: 0,
            requestedBy: context.requestedBy,
          }),
        ],
      };

      return returnData;
    }

    if (data?.type === "PLAYLIST" || data?.type === "ALBUM" || data?.type === "MIX") {
      const playlist = new Playlist(this.context.player, {
        title: data.title as string,
        thumbnail: data.image.large,
        author: {
          name: data.creator?.name || data.artists?.map((artist: any) => artist.name).join(" "),
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

      const tracks = data.tracks.map((track: any) => {
        return new Track(this.context.player, {
          title: track.title as string,
          raw: track,
          description: "",
          author: track.artists.map((artist: any) => artist.name).join(" "),
          url: `https://tidal.com/browse/track/${track.id}`,
          source: "arbitrary",
          thumbnail: track.image.large,
          duration: Util.buildTimeCode(Util.parseMS(track.duration * 1000)),
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

  public async brdgeProvider(track: Track) {
    const query = this.createBridgeQuery(track);

    if (this.options.bridgeFrom === "YouTube") {
      try {
        const serachResults = await YouTube.search(query, {
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

  public async stream(info: Track): Promise<string | Readable> {
    if (this.options.onBeforeCreateStream && typeof this.options.onBeforeCreateStream === "function") {
      return await this.options.onBeforeCreateStream(info);
    }

    return this.brdgeProvider(info);
  }
}
