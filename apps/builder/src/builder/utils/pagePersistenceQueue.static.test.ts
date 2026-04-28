import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("pagePersistenceQueue ordering contract", () => {
  it("appends queueTail synchronously before background execution", async () => {
    const source = await readFile(
      resolve(__dirname, "pagePersistenceQueue.ts"),
      "utf-8",
    );

    const queueAppendIndex = source.indexOf("queueTail = queueTail.catch");
    const scheduledWorkIndex = source.indexOf(
      "scheduleBackgroundTask",
      queueAppendIndex,
    );

    expect(source).toMatch(
      /export function enqueuePagePersistence\([\s\S]*\): Promise<void>/,
    );
    expect(queueAppendIndex).toBeGreaterThan(-1);
    expect(scheduledWorkIndex).toBeGreaterThan(queueAppendIndex);
    expect(source).toContain("return queueTail;");
  });
});
