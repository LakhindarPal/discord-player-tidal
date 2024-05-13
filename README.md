# Discord Player Tidal Extractor

Discord Player Tidal Extractor. An extractor made for discord-player for **Tidal** support. Tidal extractor works by either making a request to the Tidal API or extracting metadata from the Tidal site. Because we cannot get streams from tidal itself, the extractor uses the extracted data to stream from youtube!

## Installing the extractor

```bash
npm install discord-player-tidal
# or
yarn add discord-player-tidal
```

## Loading the extractor

### CJS

```js
const TidalExtractor = require("discord-player-tidal").default // or const { default: TidalExtractor } = require("discord-player-tidal")
const player = getMainPlayerSomehow()

player.extractors.register(TidalExtractor)
```

### ESM

```js
import { default as TidalExtractor } from "discord-player-tidal"

const player = getMainPlayerSomehow()

player.extractors.register(TidalExtractor)
```

### Typescript

```ts
import TidalExtractor from "discord-player-tidal"

const player = getMainPlayerSomehow()

player.extractors.register(TidalExtractor)
```

*note: be sure to register it before loading the default extractors to make sure any conflicts with discord-player's default attachment extractor is resolved!*

That's it! See the magic happen as you bot is now able to play from Tidal URLs
