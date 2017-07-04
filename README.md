<p align="center"><img src="https://image.ibb.co/cZHgja/grabber_text.png"></p>
<p align="center">
	<a href="https://standardjs.com"><img alt="JavaScript Style Guide" src="https://img.shields.io/badge/code_style-standard-brightgreen.svg"></a>
	<a href="https://travis-ci.org/lap00zza/Grabber"><img alt="Build Status" src="https://travis-ci.org/lap00zza/Grabber.svg?branch=master"></a>
</p>

Grab everything! Currently support grabbing videos from **9anime** (ex: Server F4) and **RapidVideo**
![](https://image.ibb.co/cF7iEa/Grabber.png)
## Download
* [Greasyfork](https://greasyfork.org/en/scripts/31010-grabber)

## Usage
1. Install a user script manager. I recommend [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
2. Install Grabber
3. Open any 9anime watch page. Example: [Shingeki No Kyojin 2](https://9anime.to/watch/shingeki-no-kyojin-season-2.3v16)
4. The Grab All button will appear near RapidVideo. Click it!
5. Make sure to keep a download manager handy. The grabbed links will be copied to your clipboard.

:warning: **If you get a Tampermonkey page requesting origin permission, remember to click allow.**

## What is metadata.json?
> You can use [Renamer](https://github.com/lap00zza/Renamer) to bulk rename files using metadata.json

![metadata.json](https://image.ibb.co/iR0Mxk/metadata.png)

Its a small JSON file which helps you keep track of the files names. When you download videos from servers like RapidVideo the file names are always cryptic. This is where `metadata.json` helps you out. This is how it looks like:
```json
{
	"animeName": "ONE PIECE FILM: GOLD",
	"animeUrl": "https://9anime.to/watch/one-piece-film-gold.71vy",
	"files": [
		{
			"original": "bVTiwZTHZS2Lmme.mp4",
			"real": "one piece film_ gold-ep_001-standard.mp4"
		}
	],
	"timestamp": "2017-06-30T15:01:15.622Z",
	"server": "RapidVideo"
}
```
You can write a simple file renaming program and use this file to easily bulk rename all the downloaded files or manually copy paste.

## License
[MIT](https://github.com/lap00zza/Grabber/blob/master/LICENSE)

Copyright (c) 2017 Jewel Mahanta
