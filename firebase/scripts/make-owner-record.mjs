#!/usr/bin/env node
/**
 * Turns a password into the scrypt record `NN_OWNER_RECOVERY` holds.
 *
 * Prints the record — salt, hash and parameters. Never the password, which is
 * not recoverable from the output and is not written anywhere by this script.
 *
 *   node firebase/scripts/make-owner-record.mjs
 *
 * It reads the password from stdin rather than argv so it does not end up in
 * the shell history or in the process list, where every other user on the
 * machine can read it.
 */
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { createInterface } from "node:readline";

const scrypt = promisify(scryptCb);
const RECOVERY_SCRYPT = { N: 65_536, r: 8, p: 1, keyLength: 64, maxmem: 160 * 1024 * 1024 };

const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
const password = await new Promise((resolve) => {
  rl.question("Password (not echoed to stdout): ", (answer) => { rl.close(); resolve(answer); });
});

if (password.length < 16) {
  console.error("Too short: NN requires at least 16 characters.");
  process.exit(1);
}

const salt = randomBytes(32);
const derived = await scrypt(password, salt, RECOVERY_SCRYPT.keyLength, RECOVERY_SCRYPT);
const at = new Date().toISOString();

process.stdout.write(JSON.stringify({
  schemaVersion: 1, algorithm: "scrypt",
  salt: salt.toString("base64"), hash: derived.toString("base64"),
  N: RECOVERY_SCRYPT.N, r: RECOVERY_SCRYPT.r, p: RECOVERY_SCRYPT.p,
  keyLength: RECOVERY_SCRYPT.keyLength,
  createdAt: at, updatedAt: at, failures: 0, lockedUntil: null,
}) + "\n");
