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

export async function requestStoragePermissions() {
  if (!Capacitor.isNativePlatform()) return { granted: true };
  try {
    const res: any = await Filesystem.requestPermissions();
    // بعض الإصدارات ترجع "publicStorage" وبعضها "filesystem" — نخليها مرنة
    const v = res?.publicStorage ?? res?.filesystem ?? res;
    const granted = v === "granted" || v?.publicStorage === "granted" || v?.filesystem === "granted";
    return { granted, raw: res };
  } catch (e) {
    return { granted: false, error: String(e) };
  }
}

type Payload = {
  filename: string;
  mime: string;
  text?: string;
  bytes?: Uint8Array;
};

async function writeNativeFile(payload: Payload, preferDownloads: boolean) {
  const { filename, text, bytes } = payload;

  const data = bytes ? uint8ToBase64(bytes) : (text ?? "");
  const encoding = bytes ? Encoding.BASE64 : Encoding.UTF8;

  // 1) حاول Downloads عبر ExternalStorage (قد ينجح حسب الجهاز/الإصدار)
  if (preferDownloads) {
    try {
      const res = await Filesystem.writeFile({
        path: `Download/Sign Pixel Led/${filename}`,
        data,
        directory: Directory.ExternalStorage as any,
        encoding,
        recursive: true,
      });
      return res;
    } catch (_) {
      // تجاهل وننتقل للخطة البديلة
    }
  }

  // 2) بديل مضمون: Documents الخاصة بالتطبيق
  const res = await Filesystem.writeFile({
    path: `Sign Pixel Led/${filename}`,
    data,
    directory: Directory.Documents,
    encoding,
    recursive: true,
  });
  return res;
}

export async function saveToDevice(payload: Payload) {
  // WEB
  if (!Capacitor.isNativePlatform()) {
    const blob = payload.bytes
      ? new Blob([payload.bytes], { type: payload.mime })
      : new Blob([payload.text ?? ""], { type: payload.mime });
    downloadOnWeb(blob, payload.filename);
    return { ok: true, mode: "web-download" };
  }

  // Native
  const perm = await requestStoragePermissions();
  // حتى لو لم تُمنح، قد يسمح النظام بالكتابة داخل Documents الخاصة بالتطبيق
  const res = await writeNativeFile(payload, true);
  return { ok: true, uri: res.uri, perm };
}

export async function shareFile(payload: Payload) {
  // WEB
  if (!Capacitor.isNativePlatform()) {
    const blob = payload.bytes
      ? new Blob([payload.bytes], { type: payload.mime })
      : new Blob([payload.text ?? ""], { type: payload.mime });
    downloadOnWeb(blob, payload.filename);
    return { ok: true, mode: "web-download" };
  }

  const perm = await requestStoragePermissions();
  const res = await writeNativeFile(payload, false);

  await Share.share({
    title: payload.filename,
    text: "Sign Pixel Led output",
    url: res.uri,
    dialogTitle: "حفظ / مشاركة الملف",
  });

  return { ok: true, uri: res.uri, perm };
}
