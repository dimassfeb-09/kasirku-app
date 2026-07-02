import sharp from "sharp";
import { readFileSync } from "fs";

const svg = readFileSync("public/icons/receipt.svg");

async function main() {
  await sharp(svg).resize(192, 192).png().toFile("public/icons/icon-192.png");
  await sharp(svg).resize(512, 512).png().toFile("public/icons/icon-512.png");
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: "#ffffff" },
  })
    .composite([{ input: await sharp(svg).resize(384, 384).toBuffer(), left: 64, top: 64 }])
    .png()
    .toFile("public/icons/icon-512-maskable.png");
  console.log("Icons generated");
}

main();
