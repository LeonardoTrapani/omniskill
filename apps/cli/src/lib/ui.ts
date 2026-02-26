import * as p from "@clack/prompts";

import { isInteractive } from "./output-mode";

// -- spinner ------------------------------------------------------------------

type Spinner = {
  start(msg: string): void;
  stop(msg: string): void;
  message(msg: string): void;
};

function plainSpinner(): Spinner {
  return {
    start() {},
    stop(msg: string) {
      if (msg) console.error(msg);
    },
    message() {},
  };
}

export function spinner(): Spinner {
  if (isInteractive) return p.spinner();
  return plainSpinner();
}

// -- log ----------------------------------------------------------------------

function write(msg: string) {
  console.error(msg);
}

const plainLog = {
  info: write,
  error: write,
  warn: write,
  success: write,
  message: write,
} as const;

export const log = isInteractive ? p.log : plainLog;

// -- prompts ------------------------------------------------------------------

export const isCancel = p.isCancel;

type ConfirmOptions = Parameters<typeof p.confirm>[0];

export async function confirm(options: ConfirmOptions): Promise<boolean | symbol> {
  if (isInteractive) return p.confirm(options);
  return false;
}

type SelectOptions<T> = Parameters<typeof p.select<T>>[0];

const CANCEL = Symbol("cancel");

export async function select<T>(options: SelectOptions<T>): Promise<T | symbol> {
  if (isInteractive) return p.select(options);
  return CANCEL;
}

type MultiselectOptions<T> = Parameters<typeof p.multiselect<T>>[0];

export async function multiselect<T>(options: MultiselectOptions<T>): Promise<T[] | symbol> {
  if (isInteractive) return p.multiselect(options);
  return CANCEL;
}
