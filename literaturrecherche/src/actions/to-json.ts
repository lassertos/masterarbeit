import fs from "fs";
import { databases } from "../databases";

export async function toJsonAction() {
  const mapping = [
    {
      input: "data/raw/acm.bib",
      output: "data/json/acm.json",
      database: databases["ACM Digital Library"],
    },
    {
      input: "data/raw/ieee.csv",
      output: "data/json/ieee.json",
      database: databases["IEEE Xplore"],
    },
    {
      input: "data/raw/scopus.csv",
      output: "data/json/scopus.json",
      database: databases["Scopus"],
    },
    {
      input: "data/raw/wos.bib",
      output: "data/json/wos.json",
      database: databases["Web of Science"],
    },
  ];

  for (const item of mapping) {
    fs.writeFileSync(
      item.output,
      JSON.stringify(await item.database.toJson(item.input), null, 4)
    );
  }
}
