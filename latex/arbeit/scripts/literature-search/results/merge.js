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
  merged.push({
    title: entry.title,
    abstract: entry.abstract,
    keywords: entry.keyword?.split(", ") ?? [],
    released: parseInt(entry["issued"]["date-parts"][0][0]),
    link: entry.URL,
  });
}

for (const entry of data.ieee) {
  merged.push({
    title: entry["Document Title"],
    abstract: entry.Abstract,
    keywords: entry["Author Keywords"]?.split(";") ?? [],
    released: parseInt(entry["Publication Year"]),
    link: entry["PDF Link"],
  });
}

for (const entry of data.scopus) {
  merged.push({
    title: entry.Title,
    abstract: entry.Abstract,
    keywords: entry["Author Keywords"]?.split("; ") ?? [],
    released: parseInt(entry.Year),
    link: entry["Link"],
  });
}

for (const entry of data.wos) {
  merged.push({
    title: entry.title,
    abstract: entry.abstract,
    keywords: entry.keyword?.split("; ") ?? [],
    released: parseInt(entry["issued"]["date-parts"][0][0]),
    link: "",
  });
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

// console.log("merged all:", merged.length);
// console.log("merged unique:", unique.length);
// console.log("merged duplicates:", duplicates.length);
// console.log("merged without abstract:", noAbstract.length);
// console.log("merged debug:", debug.length);
// console.log("merged collaborative:", collaborative.length);
// console.log("merged compile:", compile.length);
// console.log("merged language server:", languageServer.length);
// console.log("merged microcontroller:", microcontroller.length);
// console.log("merged crdt:", crdt.length);

fs.writeFileSync(
  "merged/merged.json",
  JSON.stringify(
    unique
      .sort((a, b) => {
        if (a.released > b.released) return -1;
        if (a.released === b.released) return 0;
        if (a.released < b.released) return 1;
      })
      .filter((entry) => {
        const { title, abstract, keywords } = entry;
        let valid = false;

        if (
          title.includes("IDE") ||
          title.toLowerCase().includes("programming environment") ||
          title.toLowerCase().includes("programming tool") ||
          title.toLowerCase().includes("development environment") ||
          title.toLowerCase().includes("development tool") ||
          title.toLowerCase().includes("code editor")
        )
          valid = true;

        if (
          keywords.find((keyword) => keyword.toLowerCase() === "ide") ||
          keywords.find((keyword) =>
            keyword.toLowerCase().includes("development environment")
          ) ||
          keywords.find((keyword) =>
            keyword.toLowerCase().includes("development tool")
          ) ||
          keywords.find((keyword) =>
            keyword.toLowerCase().includes("programming environment")
          ) ||
          keywords.find((keyword) =>
            keyword.toLowerCase().includes("programming tool")
          ) ||
          keywords.find((keyword) =>
            keyword.toLowerCase().includes("code editor")
          )
        )
          valid = true;

        // if (
        //   (abstract
        //     ?.toLowerCase()
        //     .includes("integrated development environment") ||
        //     abstract?.includes("IDE") ||
        //     abstract?.toLowerCase().includes("programming environment") ||
        //     abstract?.toLowerCase().includes("programming tool") ||
        //     abstract?.toLowerCase().includes("development tool")) &&
        //   (abstract?.toLowerCase().includes("student") ||
        //     abstract?.toLowerCase().includes("university") ||
        //     abstract?.toLowerCase().includes("college") ||
        //     abstract?.toLowerCase().includes("education"))
        // )
        //   valid = true;

        return valid;
      })
      .map((entry) => {
        return { ...entry, keywords: entry.keywords.join("; ") };
      }),
    null,
    4
  )
);
