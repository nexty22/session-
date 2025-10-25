import fs from "fs";
import path from "path";
import archiver from "archiver";

export const zipSessionToBase64 = async (dirPath) => {
  const zipPath = path.join("./", "session.zip");
  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on("close", () => {
      const data = fs.readFileSync(zipPath);
      fs.unlinkSync(zipPath);
      resolve(data.toString("base64"));
    });
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(dirPath, false);
    archive.finalize();
  });
};

export const makeNextySession = (base64) => {
  return `Nexty~${base64}`;
};
