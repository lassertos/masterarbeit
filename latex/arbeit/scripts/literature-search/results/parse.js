const fs = require("fs");
const csv = require("csvtojson");
const { execSync } = require("child_process");

async function parse() {
  execSync("pandoc -o json/acm.json raw/acm.bib -t csljson");
  fs.writeFileSync(
    "json/ieee.json",
    JSON.stringify(await csv().fromFile("raw/ieee.csv"), null, 4)
  );
  fs.writeFileSync(
    "json/scopus.json",
    JSON.stringify(await csv().fromFile("raw/scopus.csv"), null, 4)
  );
  execSync("pandoc -o json/wos.json raw/wos.bib -t csljson");
}

parse();
