export type EditingSemanticsImpactConfirmationRequest = {
  countDurationMs: number;
  impactedInstanceIds: string[];
  instanceCount: number;
  originId: string;
  originLabel: string;
};

type Listener = (
  request: EditingSemanticsImpactConfirmationRequest | null,
) => void;

let activeRequest: EditingSemanticsImpactConfirmationRequest | null = null;
let activeResolve: ((confirmed: boolean) => void) | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) {
    listener(activeRequest);
  }
}

function fallbackConfirm(
  request: EditingSemanticsImpactConfirmationRequest,
): boolean {
  const confirmFn = globalThis.window?.confirm;
  if (typeof confirmFn !== "function") return true;
  const label =
    request.instanceCount === 1
      ? "1 instance"
      : `${request.instanceCount} instances`;
  return confirmFn(`Editing this component will affect ${label}. Continue?`);
}

export function subscribeEditingSemanticsImpactConfirmation(
  listener: Listener,
): () => void {
  listeners.add(listener);
  listener(activeRequest);
  return () => {
    listeners.delete(listener);
  };
}

export function requestEditingSemanticsImpactConfirmation(
  request: EditingSemanticsImpactConfirmationRequest,
): Promise<boolean> {
  if (listeners.size === 0) {
    return Promise.resolve(fallbackConfirm(request));
  }

  if (activeResolve) {
    activeResolve(false);
  }

  activeRequest = request;
  notify();

  return new Promise<boolean>((resolve) => {
    activeResolve = resolve;
  });
}

export function resolveEditingSemanticsImpactConfirmation(
  confirmed: boolean,
): void {
  const resolve = activeResolve;
  activeResolve = null;
  activeRequest = null;
  notify();
  resolve?.(confirmed);
}
