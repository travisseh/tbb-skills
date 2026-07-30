---
name: record-demo
description: Record a real step-by-step product walkthrough and export an MP4, optionally uploading it to YouTube when the user explicitly requests publication. Use when the user asks for a demo video, screen recording, YouTube demo, feature walkthrough recording, or when a task explicitly needs a product demo after implementation.
---

# Record Demo

Record the actual product flow. Keep the result local unless the user explicitly
requests YouTube upload or another external publication.

## Prerequisites

Before recording:

1. Identify an available screen recorder and verify that it can export MP4.
2. If YouTube publication is explicitly requested, read and follow
   `../youtube-upload/SKILL.md`.
3. For an authorized YouTube upload, confirm the intended account and privacy
   level. Default to `unlisted` when no other visibility is requested.
4. Prepare the product, test data, browser profile, and starting screen before
   recording.

If the environment provides a recording helper, use its documented start and
stop commands. Otherwise use the available recording application's normal
controls. Do not invent machine-specific absolute paths.

## Required flow

1. Get the product into the exact state to demonstrate.
2. Start recording immediately before the walkthrough.
3. Perform the real walkthrough step by step using the actual UI and normal
   verification tools.
4. Stop recording immediately after the walkthrough.
5. Export or download the finished recording as an MP4.
6. Confirm the MP4 exists, is non-empty, and plays.
7. If YouTube publication is explicitly authorized, upload it with the
   `youtube-upload` skill:

```bash
node <path-to-youtube-upload>/scripts/youtube.js upload \
  --file /absolute/path/to/video.mp4 \
  --title "Video title" \
  --description "Short description" \
  --privacy unlisted
```

8. For an authorized upload, capture the returned `watchUrl` and `embedUrl`.
   Otherwise return the verified local MP4 path.

## Rules

- Record the real flow, not a synthetic substitute.
- Keep the walkthrough tight and intentional.
- Complete setup before recording when possible.
- If the flow fails mid-demo, stop, fix the issue, and record again.
- Do not upload solely because the user asked for a recording.
- Do not claim a YouTube upload completed until the API returns a video ID and
  URLs.
- Keep the source recording and local MP4 as recovery artifacts until the
  upload is verified.
- Never expose credentials, private customer data, or unrelated browser content
  in the recording.

## Output

For a local recording, include:

- the absolute MP4 path;
- one sentence explaining what the demo shows.

For an authorized YouTube upload, include the watch URL, embed URL, and one
sentence explaining what the demo shows.

If recording, export, authentication, or upload fails, state the failed stage
and include any recoverable recording URL or local MP4 path. Do not imply that a
YouTube demo exists when the upload did not complete.
