import fs from "fs";
import path from "path";
import JSZip from "jszip";

export function listFilesRecursive(dir) {
  let files = [];
  try {
    fs.readdirSync(dir).forEach((f) => {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        files = files.concat(listFilesRecursive(full));
      } else {
        files.push(full);
      }
    });
  } catch {
    // directory may not exist yet
  }
  return files;
}

export async function zipSessionToBase64(folderPath) {
  const zip = new JSZip();
  const files = listFilesRecursive(folderPath);
  for (const f of files) {
    const rel = f.replace(folderPath + "/", "");
    const data = fs.readFileSync(f);
    zip.file(rel, data);
  }
  const content = await zip.generateAsync({ type: "nodebuffer" });
  return content.toString("base64");
}

export function makeNextySession(base64) {
  return `Nexty~${base64}`;
}
