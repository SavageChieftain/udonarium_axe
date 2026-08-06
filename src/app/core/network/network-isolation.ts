let isolated = false;

export function isNetworkIsolated(): boolean {
  return isolated;
}

export function setNetworkIsolated(value: boolean): void {
  isolated = value;
}
