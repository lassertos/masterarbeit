import { selectDatabase } from "./actions/select-database";
import { selectFields } from "./actions/select-fields";
import { selectKeywords } from "./actions/select-keywords";

console.clear();

async function main() {
  const database = await selectDatabase();
  const fields = await selectFields(database);
  const keywords = await selectKeywords();
  const query = database.buildQuery(keywords, fields);
  console.log(query);
}

main();
