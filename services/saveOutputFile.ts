import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

function downloadOnWeb(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function uint8ToBase64(u8: Uint8Array) {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    s += String.fromCharCode(...u8.subarray(i, i + chunk));
  }
  return btoa(s);
}

export async function saveOutputFile(opts: {
  filename: string;
  mime: string;
  text?: string;
  bytes?: Uint8Array;
}) {
  const { filename, mime, text, bytes } = opts;

  // WEB
  if (!Capacitor.isNativePlatform()) {
    const blob = bytes
      ? new Blob([bytes], { type: mime })
      : new Blob([text ?? ""], { type: mime });
    downloadOnWeb(blob, filename);
    return;
  }

  // NATIVE (Android/iOS): write then share
  const res = await Filesystem.writeFile({
    path: filename,
    data: bytes ? uint8ToBase64(bytes) : (text ?? ""),
    directory: Directory.Documents,
    encoding: bytes ? Encoding.BASE64 : Encoding.UTF8,
    recursive: true,
  });

  await Share.share({
    title: filename,
    text: "Sign Pixel Led output",
    url: res.uri,
    dialogTitle: "حفظ / مشاركة الملف",
  });
}
