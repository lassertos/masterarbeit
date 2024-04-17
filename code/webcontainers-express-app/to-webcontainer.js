import { readdirSync, lstatSync, readFileSync, writeFileSync } from "fs";

function scanDirectory(path, ignorePaths) {
  const content = {};
  const itemNames = readdirSync(path);

  for (const itemName of itemNames) {
    if (ignorePaths.includes(itemName)) continue;
    if (lstatSync(path + "/" + itemName).isFile()) {
      console.log("file:", path + "/" + itemName);
      content[itemName] = {
        file: {
          contents: readFileSync(path + "/" + itemName, {
            encoding: "utf-8",
          }),
        },
      };
    }

    if (lstatSync(path + "/" + itemName).isDirectory()) {
      console.log("folder:", path + "/" + itemName);
      content[itemName] = {
        directory: scanDirectory(path + "/" + itemName, ignorePaths),
      };
    }
  }

  return content;
}

writeFileSync(
  "./files.js",
  "/** @satisfies {import('@webcontainer/api').FileSystemTree} */\nexport const files = " +
    JSON.stringify(
      scanDirectory("../WIDEr/frontend", [
        "dist",
        "node_modules",
        "testProject.ts",
      ]),
      null,
      4
    )
);
