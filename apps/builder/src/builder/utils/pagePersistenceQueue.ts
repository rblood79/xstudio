import { scheduleBackgroundTask } from "./scheduleTask";

let queueTail = Promise.resolve();

export function enqueuePagePersistence(
  task: () => Promise<void> | void,
): Promise<void> {
  queueTail = queueTail.catch(() => undefined).then(
    () =>
      new Promise<void>((resolve, reject) => {
        scheduleBackgroundTask(() => {
          Promise.resolve()
            .then(task)
            .then(resolve, reject);
        });
      }),
  );

  return queueTail;
}
