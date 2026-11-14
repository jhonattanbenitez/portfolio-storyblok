import assert from "node:assert/strict";
import test from "node:test";
import { readMotionTransition } from "../lib/motion.ts";

const style = values => ({ getPropertyValue: key => values[key] || "" });
const normalCurve = "cubic-bezier(.2, .7, .2, 1)";

test("Framer consumes CSS milliseconds and the shared no-bounce curve", () => {
  assert.deepEqual(readMotionTransition(style({ "--motion-normal": "220ms", "--motion-ease": normalCurve })), { duration: 0.22, ease: [0.2, 0.7, 0.2, 1] });
});

test("equivalent CSS seconds preserve timing without a second JS timing constant", () => {
  assert.deepEqual(readMotionTransition(style({ "--motion-normal": " 0.28s ", "--motion-ease": " cubic-bezier(0.2,0.7,0.2,1) " })), { duration: 0.28, ease: [0.2, 0.7, 0.2, 1] });
});

test("a reduced-motion CSS timing of zero stays immediate in Framer", () => {
  assert.equal(readMotionTransition(style({ "--motion-normal": "0ms", "--motion-ease": normalCurve })).duration, 0);
});

test("missing or unusable time values fail to zero rather than an excessive animation", () => {
  for (const duration of ["", "garbage", "NaNms", "Infinitys", "-1s", "10000ms", "2s", "220"]) {
    assert.equal(readMotionTransition(style({ "--motion-normal": duration, "--motion-ease": normalCurve })).duration, 0, duration);
  }
});

test("invalid or overshooting easing fails to a bounded linear curve", () => {
  for (const easing of ["", "spring(1, 2, 3)", "cubic-bezier(0,1,2)", "cubic-bezier(0,1,2,1)", "cubic-bezier(0,-1,.2,1)", "cubic-bezier(NaN,1,0,1)"]) {
    assert.deepEqual(readMotionTransition(style({ "--motion-normal": "220ms", "--motion-ease": easing })).ease, [0, 0, 1, 1], easing);
  }
});
