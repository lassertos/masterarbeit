import { selectDatabaseAction } from "./select-database";
import { selectFieldsAction } from "./select-fields";
import { selectKeywordsAction } from "./select-keywords";

export async function createQueryAction() {
  const database = await selectDatabaseAction();
  const fields = await selectFieldsAction(database);
  const keywords = await selectKeywordsAction();
  const query = database.buildQuery(keywords, fields);
  console.log(query);
}
