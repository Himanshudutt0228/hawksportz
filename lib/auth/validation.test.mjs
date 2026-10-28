import test from "node:test";
import assert from "node:assert/strict";
import { callbackDestination, readEmail, validNewPassword } from "./validation.ts";

test("email callbacks cannot redirect outside the two approved account pages", () => {
  for (const value of [null, "https://evil.example", "//evil.example", "/\\evil.example", "/admin", "/reset-password?next=https://evil.example"]) {
    assert.equal(callbackDestination(value), "/account");
  }
  assert.equal(callbackDestination("/reset-password"), "/reset-password");
});

test("auth inputs reject files, malformed emails and oversized or short passwords", () => {
  assert.equal(readEmail(new File(["test"], "email.txt")), null);
  assert.equal(readEmail("bad\r\n@example.com"), null);
  assert.equal(readEmail("a".repeat(255) + "@example.com"), null);
  assert.equal(readEmail(" person@example.com "), "person@example.com");
  assert.equal(validNewPassword("a".repeat(11)), false);
  assert.equal(validNewPassword("a".repeat(129)), false);
  assert.equal(validNewPassword("a long passphrase"), true);
});
