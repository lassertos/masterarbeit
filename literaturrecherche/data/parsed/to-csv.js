const fs = require("fs");

const files = ["acm.json", "ieee.json", "scopus.json", "wos.json"];

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(file, { encoding: "utf-8" }));
  const csv = [Object.keys(data[0]).join(",")];

  for (const entry of data) {
    csv.push(
      '"' +
        Object.values(entry)
          .map((value) =>
            typeof value === "string"
              ? value.replace(/\"/g, '""')
              : JSON.stringify(value)
          )
          .join('","') +
        '"'
    );
  }

  fs.writeFileSync(file.replace(".json", ".csv"), csv.join("\n"));
}
