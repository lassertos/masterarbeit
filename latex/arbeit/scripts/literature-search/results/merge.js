const fs = require("fs");

const folders = ["advantages", "disadvantages", "problems", "requirements"];
const buffers = folders.map((folder) => fs.readFileSync(folder + "/acm.json"));
const texts = buffers.map((buffer) => buffer.toString());
const referenceArrays = texts.map((text) => JSON.parse(text));

const uniqueReferences = [];
const duplicates = [];

for (const referenceArray of referenceArrays) {
  for (const reference of referenceArray) {
    if (!uniqueReferences.find((r) => r.title === reference.title))
      uniqueReferences.push(reference);
    else if (!duplicates.find((r) => r.title === reference.title))
      duplicates.push(reference);
  }
}

console.log(uniqueReferences.length);
console.log(duplicates.length);
fs.writeFileSync("any/acm.json", JSON.stringify(uniqueReferences, null, 2));
fs.writeFileSync("duplicates/acm.json", JSON.stringify(duplicates, null, 2));
