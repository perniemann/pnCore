import { test } from "node:test";
import assert from "node:assert/strict";
import { routerFindings, skillDescription } from "../check-router-skills.mjs";

const catalog = new Map([
  ["pn-a", "x".repeat(10)],
  ["pn-b", "y".repeat(20)],
]);

test("counts id plus description and passes within budget", () => {
  const r = routerFindings({ budgetChars: 100, skills: ["pn-a", "pn-b"] }, catalog);
  assert.deepEqual(r, { errors: [], chars: 38 });
});

test("flags unknown, duplicate, empty and over-budget sets", () => {
  assert.match(routerFindings({ budgetChars: 100, skills: ["pn-z"] }, catalog).errors[0], /no such/);
  assert.match(
    routerFindings({ budgetChars: 100, skills: ["pn-a", "pn-a"] }, catalog).errors[0],
    /twice/
  );
  assert.ok(routerFindings({ budgetChars: 100, skills: [] }, catalog).errors.includes("skills is empty"));
  assert.match(routerFindings({ budgetChars: 20, skills: ["pn-b"] }, catalog).errors[0], /over/);
  assert.match(routerFindings({ budgetChars: 0, skills: ["pn-a"] }, catalog).errors[0], /positive/);
});

test("reads quoted and plain frontmatter descriptions", () => {
  assert.equal(skillDescription('---\nname: a\ndescription: "Do X."\n---\nbody'), "Do X.");
  assert.equal(skillDescription("---\ndescription: Do Y.\n---\n"), "Do Y.");
  assert.equal(skillDescription("no frontmatter"), "");
});
