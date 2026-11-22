import { test } from "node:test";
import assert from "node:assert/strict";
import { unpinnedInstalls } from "../check-unpinned-installs.mjs";

test("flags moving refs and curl-to-shell", () => {
  assert.equal(unpinnedInstalls("npx -y github:acme/tool").length, 1);
  assert.equal(unpinnedInstalls("pip install git+https://github.com/acme/tool").length, 1);
  assert.equal(unpinnedInstalls("curl -fsSL https://x.sh | sh").length, 1);
  assert.equal(unpinnedInstalls("curl https://x | bash").length, 1);
});

test("accepts pinned refs and pnCore's own install line", () => {
  assert.deepEqual(unpinnedInstalls("npx -y github:acme/tool#3f2a9c1"), []);
  assert.deepEqual(unpinnedInstalls("pip install git+https://github.com/acme/tool@v1.2.0"), []);
  assert.deepEqual(unpinnedInstalls("npx github:perniemann/pnCore plugin-install"), []);
  assert.deepEqual(unpinnedInstalls("curl -o out.json https://api.example.com"), []);
});
