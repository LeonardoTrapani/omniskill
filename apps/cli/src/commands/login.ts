import open from "open";
import pc from "picocolors";

import { authClient, CLI_DEVICE_CLIENT_ID } from "../lib/auth-client";
import { getSessionFilePath, saveSession } from "../lib/session";
import { trpc } from "../lib/trpc";
import * as ui from "../lib/ui";

const DEVICE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";

function formatUserCode(code: string) {
  if (code.length <= 4) {
    return code;
  }

  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

function readErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const candidate = error as { error?: string; code?: string };
  return candidate.error ?? candidate.code;
}

function readErrorDescription(error: unknown, fallback: string) {
  if (typeof error !== "object" || error === null) {
    return fallback;
  }

  const candidate = error as {
    error_description?: string;
    message?: string;
    error?: {
      message?: string;
      statusText?: string;
      error_description?: string;
    };
  };

  return (
    candidate.error_description ??
    candidate.error?.error_description ??
    candidate.error?.message ??
    candidate.error?.statusText ??
    candidate.message ??
    fallback
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginCommand() {
  const setupSpinner = ui.spinner();
  setupSpinner.start("requesting login code");

  const { data: codeData, error: codeError } = await authClient.device.code({
    client_id: CLI_DEVICE_CLIENT_ID,
    scope: "openid profile email",
  });

  if (codeError || !codeData) {
    setupSpinner.stop(pc.red(readErrorDescription(codeError, "failed to request login code")));
    return;
  }

  setupSpinner.stop(pc.green("authorization request created"));

  const verificationUrl = codeData.verification_uri;
  const verificationCompleteUrl = codeData.verification_uri_complete || verificationUrl;
  const formattedCode = formatUserCode(codeData.user_code);

  ui.log.message("attempting to open the browser for login");
  ui.log.message(pc.dim("if the browser does not open, open this url manually:"));
  ui.log.message(pc.cyan(verificationCompleteUrl));
  ui.log.message(`enter this code if prompted: ${pc.bold(formattedCode)}`);

  try {
    await open(verificationCompleteUrl);
  } catch {
    ui.log.warn(`unable to open browser automatically. use: ${verificationUrl}`);
  }

  let pollingIntervalSeconds = Math.max(codeData.interval, 1);
  const pollingSpinner = ui.spinner();
  pollingSpinner.start(`waiting for confirmation (polling every ${pollingIntervalSeconds}s)`);

  while (true) {
    await sleep(pollingIntervalSeconds * 1000);

    const { data: tokenData, error: tokenError } = await authClient.device.token({
      grant_type: DEVICE_GRANT_TYPE,
      device_code: codeData.device_code,
      client_id: CLI_DEVICE_CLIENT_ID,
    });

    if (tokenData?.access_token) {
      await saveSession({
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
      });

      pollingSpinner.stop(pc.green("login successful"));

      try {
        const me = await trpc.me.query();
        ui.log.success(`logged in as ${me.user.name ?? me.user.email}`);
      } catch {
        ui.log.info("session saved, but profile fetch failed");
      }

      ui.log.info(pc.dim(`session saved to ${getSessionFilePath()}`));
      return;
    }

    if (!tokenError) {
      continue;
    }

    const tokenErrorCode = readErrorCode(tokenError);

    if (tokenErrorCode === "authorization_pending") {
      continue;
    }

    if (tokenErrorCode === "slow_down") {
      pollingIntervalSeconds += 5;
      pollingSpinner.message(`waiting for confirmation (polling every ${pollingIntervalSeconds}s)`);
      continue;
    }

    if (tokenErrorCode === "access_denied") {
      pollingSpinner.stop(pc.yellow("login was denied in the browser"));
      return;
    }

    if (tokenErrorCode === "expired_token") {
      pollingSpinner.stop(pc.red("login code expired. run login again"));
      return;
    }

    pollingSpinner.stop(pc.red(readErrorDescription(tokenError, "device login failed")));
    return;
  }
}
