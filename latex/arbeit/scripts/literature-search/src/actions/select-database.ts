import inquirer from "inquirer";
import { databases, AvailableDatabase, Database } from "../databases";

export async function selectDatabaseAction(): Promise<Database> {
  return inquirer
    .prompt({
      type: "list",
      name: "database",
      message: "Choose a database",
      choices: Object.keys(databases),
    })
    .then((answer: { database: AvailableDatabase }) => {
      return databases[answer.database];
    });
}
