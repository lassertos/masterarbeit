import { selectDatabase } from "./select-database";
import { selectFields } from "./select-fields";
import { selectKeywords } from "./select-keywords";

export async function createQuery() {
  const database = await selectDatabase();
  const fields = await selectFields(database);
  const keywords = await selectKeywords();
  const query = database.buildQuery(keywords, fields);
  console.log(query);
}
