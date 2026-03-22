export async function sha256(input: ArrayBuffer | string): Promise<Uint8Array> {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

export async function sha256Hex(input: ArrayBuffer | string): Promise<string> {
  const hash = await sha256(input);
  return Array.from(hash)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256Base64Url(str: string): Promise<string> {
  if (str == null) return '';
  const hash = await sha256(str);
  const base64 = btoa(String.fromCharCode(...hash))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=*$/g, '');
  return base64;
}
