import test from "node:test";
import assert from "node:assert/strict";
import { decideFollowUp } from "./invoice_service.ts";

test("deadline follow-up is selected on the due date", () => {
  const order = { matterId: "MAT-1", clientName: "A", clientEmail: "a@example.com", amountCents: 100, signedDocument: "signed.pdf", followUpDate: "2026-10-25" };
  assert.equal(decideFollowUp(order, "2026-10-25"), "follow-up");
  assert.equal(decideFollowUp({ ...order, followUpDate: "2026-10-26" }, "2026-10-25"), "wait");
});
