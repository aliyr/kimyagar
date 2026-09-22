import fs from "node:fs";
const files = ["D:/Source/Kimiagar/Web/src/scene/art.ts", "D:/Source/Kimiagar/Web/src/scene/Zone.tsx"];
for (const f of files) {
  if (!fs.existsSync(f)) { console.log("missing", f); continue; }
  const t = fs.readFileSync(f, "utf8");
  const i = t.indexOf("function useArt");
  if (i >= 0) console.log(f, t.slice(i, i + 400));
}
const s = fs.readFileSync("D:/Source/Kimiagar/Web/src/scene/MortarStation.tsx", "utf8");
console.log("left", s.includes("+ 12"));
console.log("top", s.includes("+ 8"));
console.log("front", s.includes("is-glass"));
