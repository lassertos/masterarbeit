import inquirer from "inquirer";
import fs from "fs";
import { selectDatabaseAction } from "./select-database";
import { databases } from "../databases";

export async function toJsonAction() {
  const mapping = [
    {
      input: "results/raw/acm.bib",
      output: "results/json/acm.json",
      database: databases["ACM Digital Library"],
    },
    {
      input: "results/raw/ieee.csv",
      output: "results/json/ieee.json",
      database: databases["IEEE Xplore"],
    },
    {
      input: "results/raw/scopus.csv",
      output: "results/json/scopus.json",
      database: databases["Scopus"],
    },
    {
      input: "results/raw/wos.bib",
      output: "results/json/wos.json",
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
