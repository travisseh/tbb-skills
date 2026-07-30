#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");
const { randomBytes } = require("crypto");
const { URL } = require("url");

let google;
try {
  ({ google } = require("googleapis"));
} catch {
  console.error("Missing dependency. Run `npm install` in this script directory.");
  process.exit(1);
}

const UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      args._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function usage() {
  console.log(`Usage:
  youtube.js auth [--client /path/client.json] [--token /path/token.json] [--port 3996]
  youtube.js upload --file /path/video.mp4 --title "Title" [--description "..."] [--privacy unlisted|private|public]

Environment:
  GOOGLE_OAUTH_CLIENT_FILE
  YOUTUBE_TOKEN_FILE
`);
}

function requiredPath(flagValue, envName, label) {
  const value = flagValue || process.env[envName];
  if (!value) {
    throw new Error(`Missing ${label}. Pass the flag or set ${envName}.`);
  }
  return path.resolve(value);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function oauthClient(args) {
  const clientFile = requiredPath(
    args.client,
    "GOOGLE_OAUTH_CLIENT_FILE",
    "OAuth client file"
  );
  const config = readJson(clientFile);
  const credentials = config.installed || config.web;
  if (!credentials?.client_id || !credentials?.client_secret) {
    throw new Error("OAuth client JSON must contain installed or web credentials.");
  }

  const port = Number(args.port || 3996);
  const redirectUri = args.redirect || `http://127.0.0.1:${port}`;

  return {
    client: new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      redirectUri
    ),
    port,
    redirectUri,
  };
}

async function authenticate(args) {
  const tokenFile = requiredPath(args.token, "YOUTUBE_TOKEN_FILE", "token file");
  const { client, port, redirectUri } = oauthClient(args);
  const state = randomBytes(24).toString("hex");
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [UPLOAD_SCOPE],
    state,
  });

  console.log(`Open this URL:\n${authUrl}`);

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      try {
        const requestUrl = new URL(request.url, redirectUri);
        const error = requestUrl.searchParams.get("error");
        if (error) {
          response.end("Authorization failed. You may close this window.");
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (requestUrl.searchParams.get("state") !== state) {
          response.statusCode = 400;
          response.end("Authorization state mismatch.");
          server.close();
          reject(new Error("OAuth state mismatch."));
          return;
        }

        const value = requestUrl.searchParams.get("code");
        if (!value) {
          response.statusCode = 400;
          response.end("Missing authorization code.");
          return;
        }

        response.end("Authorization complete. You may close this window.");
        server.close();
        resolve(value);
      } catch (error) {
        server.close();
        reject(error);
      }
    });

    server.on("error", reject);
    server.listen(port, "127.0.0.1");
  });

  const { tokens } = await client.getToken(code);
  fs.mkdirSync(path.dirname(tokenFile), { recursive: true });
  fs.writeFileSync(tokenFile, `${JSON.stringify(tokens, null, 2)}\n`, {
    mode: 0o600,
  });
  fs.chmodSync(tokenFile, 0o600);
  console.log(`Saved token to ${tokenFile}`);
}

async function upload(args) {
  const file = args.file && path.resolve(args.file);
  if (!file || !fs.existsSync(file)) {
    throw new Error(`Missing file: ${file || "(none)"}`);
  }
  if (fs.statSync(file).size === 0) {
    throw new Error(`Video file is empty: ${file}`);
  }

  const privacy = args.privacy || "unlisted";
  if (!["unlisted", "private", "public"].includes(privacy)) {
    throw new Error(`Invalid privacy: ${privacy}`);
  }

  const tokenFile = requiredPath(args.token, "YOUTUBE_TOKEN_FILE", "token file");
  const { client } = oauthClient(args);
  client.setCredentials(readJson(tokenFile));

  const youtube = google.youtube({ version: "v3", auth: client });
  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: args.title || path.basename(file, path.extname(file)),
        description: args.description || "",
        categoryId: args.categoryId || "27",
      },
      status: {
        privacyStatus: privacy,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(file),
    },
  });

  const id = response.data.id;
  if (!id) {
    throw new Error("YouTube upload completed without returning a video ID.");
  }

  console.log(
    JSON.stringify(
      {
        id,
        watchUrl: `https://www.youtube.com/watch?v=${id}`,
        embedUrl: `https://www.youtube.com/embed/${id}`,
      },
      null,
      2
    )
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (!command || args.help) {
    usage();
    return;
  }
  if (command === "auth") {
    await authenticate(args);
    return;
  }
  if (command === "upload") {
    await upload(args);
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
