# BTClock WebUI

[![BTClock CI](https://github.com/btclock/webui/actions/workflows/workflow.yml/badge.svg)](https://github.com/btclock/webui2/actions/workflows/workflow.yml)

The web user-interface for the BTClock, based on Svelte-kit. It uses Bootstrap for the lay-out.

![Screenshot](doc/screenshot-light.webp)
![Screenshot Dark](doc/screenshot-dark.webp)

## Developing

After installed dependencies with `yarn`, start a development server:

```bash
yarn dev

# or start the server and open the app in a new browser tab
yarn dev -- --open
```

## Building

To create a production version of the WebUI:

```bash
yarn build
```

Make sure the postinstall script is ran, because otherwise the filenames are to long for the LittleFS filesystem.

## Deploying

To upload the firmware to the BTClock, you need to GZIP all the files. You can use the python script `gzip_build.py` for that:

```bash
python3 gzip_build.py
```

Then you can make a `LittleFS.bin` with mklittlefs:

```bash
mklittlefs -c build_gz -s 409600 littlefs.bin
```

You can preview the production build with `yarn preview`.
