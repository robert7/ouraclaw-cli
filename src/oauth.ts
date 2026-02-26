import http from "http";
import https from "https";
import crypto from "crypto";
import { URL } from "url";
import { OuraTokenResponse } from "./types";

const AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize";
const TOKEN_URL = "https://api.ouraring.com/oauth/token";
const REDIRECT_URI = "http://localhost:9876/callback";
const SCOPES = "email personal daily heartrate workout session spo2 tag stress heart_health ring_configuration";

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function buildAuthorizeUrl(clientId: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export function exchangeCodeForTokens(
  clientId: string,
  clientSecret: string,
  code: string,
): Promise<OuraTokenResponse> {
  return postTokenRequest({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
  });
}

export function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<OuraTokenResponse> {
  return postTokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
}

function postTokenRequest(
  body: Record<string, string>,
): Promise<OuraTokenResponse> {
  const postData = new URLSearchParams(body).toString();
  const parsed = new URL(TOKEN_URL);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Failed to parse token response: ${data}`));
            }
          } else {
            reject(new Error(`Token request failed (${res.statusCode}): ${data}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

export function captureOAuthCallback(expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId: NodeJS.Timeout | undefined;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      server.close();
      fn();
    };

    const server = http.createServer((req, res) => {
      if (settled) {
        res.writeHead(409);
        res.end("OAuth flow already completed");
        return;
      }

      if (!req.url?.startsWith("/callback")) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const url = new URL(req.url, `http://localhost:9876`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      const state = url.searchParams.get("state");

      if (error) {
        res.writeHead(400);
        res.end(`Authorization error: ${error}`);
        settle(() => reject(new Error(`OAuth error: ${error}`)));
        return;
      }

      if (!code) {
        res.writeHead(400);
        res.end("Missing authorization code");
        settle(() => reject(new Error("Missing authorization code in callback")));
        return;
      }

      if (!state) {
        res.writeHead(400);
        res.end("Missing OAuth state");
        settle(() => reject(new Error("Missing OAuth state in callback")));
        return;
      }

      if (state !== expectedState) {
        res.writeHead(400);
        res.end("Invalid OAuth state");
        settle(() => reject(new Error("OAuth state mismatch in callback")));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<html><body><h2>OuraClaw authorized!</h2><p>You can close this tab and return to the terminal.</p></body></html>",
      );
      settle(() => resolve(code));
    });

    server.listen(9876, "localhost", () => {
      // Server is ready, waiting for callback
    });

    server.on("error", (err) => {
      settle(() => reject(new Error(`Failed to start OAuth callback server: ${err.message}`)));
    });

    // Timeout after 2 minutes
    timeoutId = setTimeout(() => {
      settle(() => reject(new Error("OAuth callback timed out after 2 minutes")));
    }, 120_000);
  });
}
