---
name: youtube-upload
description: Authenticate with the YouTube Data API and upload a local video, returning watch and embed URLs. Use when asked to upload an MP4 to YouTube, move a screen recording to YouTube, or create a YouTube embed for a demo.
---

# YouTube Upload

Upload local MP4 files through the YouTube Data API with the bundled script.

## Setup

The uploader needs:

- Node.js 18 or newer;
- the `googleapis` package installed in `scripts/`;
- a Google OAuth desktop-client JSON file;
- a writable token JSON path;
- YouTube Data API v3 enabled for the Google Cloud project.

Install the script dependency once:

```bash
cd <youtube-upload-skill>/scripts
npm install
```

Set paths explicitly with flags or environment variables:

```bash
export GOOGLE_OAUTH_CLIENT_FILE=/absolute/path/to/oauth-client.json
export YOUTUBE_TOKEN_FILE=/absolute/path/to/youtube-token.json
```

Never commit either file.

## Authenticate

The token must include:

```text
https://www.googleapis.com/auth/youtube.upload
```

Run:

```bash
node <youtube-upload-skill>/scripts/youtube.js auth
```

Open the printed URL, sign in to the intended channel owner, approve access, and
allow the local callback. Use `--port <port>` if the default port is unavailable
and ensure that callback is allowed by the OAuth client.

## Upload

```bash
node <youtube-upload-skill>/scripts/youtube.js upload \
  --file /absolute/path/to/video.mp4 \
  --title "Video title" \
  --description "Short description" \
  --privacy unlisted
```

Optional flags:

- `--client /path/to/oauth-client.json`
- `--token /path/to/token.json`
- `--categoryId 27`
- `--privacy unlisted|private|public`

The command prints:

```json
{
  "id": "YOUTUBE_VIDEO_ID",
  "watchUrl": "https://www.youtube.com/watch?v=YOUTUBE_VIDEO_ID",
  "embedUrl": "https://www.youtube.com/embed/YOUTUBE_VIDEO_ID"
}
```

Use `embedUrl` for website iframes.

## Rules

- Default to `unlisted` unless the user explicitly requests another visibility.
- Confirm the local file exists and is non-empty before uploading.
- Do not log OAuth credentials or refresh tokens.
- Do not claim completion until the API returns a video ID.
- If authentication or upload fails, report the exact failed stage and preserve
  the local MP4 for recovery.
