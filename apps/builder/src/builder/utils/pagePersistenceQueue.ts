import { scheduleBackgroundTask } from "./scheduleTask";

let queueTail = Promise.resolve();

export function enqueuePagePersistence(
  task: () => Promise<void> | void,
): void {
  scheduleBackgroundTask(() => {
    queueTail = queueTail
      .catch(() => undefined)
      .then(async () => {
        await task();
      });
  });
}
