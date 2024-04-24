import inquirer from "inquirer";
import { Database } from "../databases";

export async function selectFields(database: Database): Promise<string[]> {
  return inquirer
    .prompt({
      type: "checkbox",
      name: "fields",
      message: "Choose the fields to search",
      choices: database.possibleFields,
      loop: false,
    })
    .then((answer: { fields: string[] }) => {
      return answer.fields.map(
        (field) =>
          database.possibleFields.find(
            (possibleField) => possibleField.name === field
          )!.queryString
      );
    });
}
