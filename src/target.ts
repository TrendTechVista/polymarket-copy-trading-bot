/** Resolved copy target (proxy address). Set by index after resolving username if needed. */
export let copyTargetAddress: string = "";

export function setCopyTarget(proxy: string): void {
  copyTargetAddress = proxy;
}

export function getCopyTarget(): string {
  return copyTargetAddress;
}
