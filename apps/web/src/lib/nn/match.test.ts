import { describe, expect, it } from "vitest";
import { matchRecordByTitle } from "./records";

/**
 * Which record the founder meant.
 *
 * REN is told "the bank task", never a document id, so this is the step
 * between being told and being able to act. The rule that matters most is
 * the one about ties: the next thing to happen to a resolved record may be a
 * delete, and an assistant that picks between two candidates to seem decisive
 * is an assistant that eventually destroys the wrong one.
 */

const items = [
  { id: "1", title: "Call the bank" },
  { id: "2", title: "Bank statement review" },
  { id: "3", title: "Buy milk" },
  { id: "4", title: "Call the bank" },
];

describe("resolving a record from what was said", () => {
  it("takes an exact title", () => {
    const found = matchRecordByTitle([items[0]!, items[2]!], "call the bank");
    expect(found.kind).toBe("one");
    if (found.kind === "one") expect(found.record.id).toBe("1");
  });

  it("is not case sensitive, because speech has no case", () => {
    const found = matchRecordByTitle([items[0]!], "CALL THE BANK");
    expect(found.kind).toBe("one");
  });

  it("takes a fragment of the title", () => {
    const found = matchRecordByTitle([items[0]!, items[2]!], "milk");
    expect(found.kind).toBe("one");
    if (found.kind === "one") expect(found.record.id).toBe("3");
  });

  it("prefers the exact title over one that merely contains the words", () => {
    const found = matchRecordByTitle([items[1]!, items[0]!], "call the bank");
    expect(found.kind).toBe("one");
    if (found.kind === "one") expect(found.record.id).toBe("1");
  });

  it("refuses to choose between two equally good matches", () => {
    // The whole point. Two records called the same thing, and a delete
    // waiting behind the answer.
    const found = matchRecordByTitle(items, "call the bank");
    expect(found.kind).toBe("many");
    if (found.kind === "many") expect(found.titles).toHaveLength(2);
  });

  it("says it found nothing rather than returning the closest thing", () => {
    expect(matchRecordByTitle(items, "mortgage").kind).toBe("none");
  });

  it("finds a record whose words are all present but scattered", () => {
    const found = matchRecordByTitle([{ id: "9", title: "Review the bank statement today" }], "bank review");
    expect(found.kind).toBe("one");
  });

  it("handles an empty phrase and an empty collection without throwing", () => {
    expect(matchRecordByTitle(items, "   ").kind).toBe("none");
    expect(matchRecordByTitle([], "anything").kind).toBe("none");
  });

  it("reads a title from whichever field the collection uses", () => {
    // Notes carry `text`, documents carry `name`, tasks carry `title`.
    expect(matchRecordByTitle([{ id: "a", name: "Passport scan" }], "passport").kind).toBe("one");
    expect(matchRecordByTitle([{ id: "b", text: "Remember the milk" }], "milk").kind).toBe("one");
  });

  it("ignores records with no title at all", () => {
    expect(matchRecordByTitle([{ id: "c", done: true }], "anything").kind).toBe("none");
  });
});
