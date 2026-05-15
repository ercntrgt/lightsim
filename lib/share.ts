// Proje durumunu URL'ye gömmek için izomorfik base64url kodlama
// (harici servis/DB gerekmez). Tarayıcı, Node ve Edge'de çalışır.

import type { SharedProject } from "@/types";

function bytesToB64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let bin = "";
    for (let i = 0; i < bytes.length; i++)
      bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  return Buffer.from(bytes).toString("base64");
}

function b64ToBytes(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export function encodeShare(p: SharedProject): string {
  const bytes = new TextEncoder().encode(JSON.stringify(p));
  return bytesToB64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeShare(s: string): SharedProject {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const json = new TextDecoder().decode(b64ToBytes(b64));
  return JSON.parse(json) as SharedProject;
}
