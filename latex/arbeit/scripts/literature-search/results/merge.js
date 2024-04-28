const fs = require("fs");

const data = {
  acm: JSON.parse(fs.readFileSync("json/acm.json", { encoding: "utf-8" })),
  ieee: JSON.parse(fs.readFileSync("json/ieee.json", { encoding: "utf-8" })),
  scopus: JSON.parse(
    fs.readFileSync("json/scopus.json", { encoding: "utf-8" })
  ),
  wos: JSON.parse(fs.readFileSync("json/wos.json", { encoding: "utf-8" })),
};

const merged = [];

for (const entry of data.acm) {
  merged.push({ title: entry.title, abstract: entry.abstract });
}

for (const entry of data.ieee) {
  merged.push({ title: entry["Document Title"], abstract: entry.Abstract });
}

for (const entry of data.scopus) {
  merged.push({ title: entry.Title, abstract: entry.Abstract });
}

for (const entry of data.wos) {
  merged.push({ title: entry.title, abstract: entry.abstract });
}

const unique = merged.filter(
  (v, i, s) =>
    s.findIndex((_v) => _v.title.toLowerCase() === v.title.toLowerCase()) === i
);
const duplicates = merged.filter(
  (v, i, s) =>
    s.findIndex((_v) => _v.title.toLowerCase() === v.title.toLowerCase()) !== i
);
const noAbstract = unique.filter((e) => !e.abstract);
const debug = unique.filter((e) => e.abstract?.toLowerCase().includes("debug"));
const collaborative = unique.filter((e) =>
  e.abstract?.toLowerCase().includes("collaborative")
);
const compile = unique.filter((e) =>
  e.abstract?.toLowerCase().includes("compile")
);
const languageServer = unique.filter((e) =>
  e.abstract?.toLowerCase().includes("language server")
);
const microcontroller = unique.filter((e) =>
  e.abstract?.toLowerCase().includes("microcontroller")
);
const crdt = unique.filter((e) => e.abstract?.toLowerCase().includes("crdt"));

console.log("merged all:", merged.length);
console.log("merged unique:", unique.length);
console.log("merged duplicates:", duplicates.length);
console.log("merged without abstract:", noAbstract.length);
console.log("merged debug:", debug.length);
console.log("merged collaborative:", collaborative.length);
console.log("merged compile:", compile.length);
console.log("merged language server:", languageServer.length);
console.log("merged microcontroller:", microcontroller.length);
console.log("merged crdt:", crdt.length);

fs.writeFileSync("merged/merged.json", JSON.stringify(unique, null, 4));
