import { AvailableDatabase, databases } from "./databases";
import inquirer from "inquirer";
import { AvailableKeyword, keywords } from "./keywords";

console.clear();

let chosenDatabase: (typeof databases)[AvailableDatabase];
let chosenFields: string[];
let chosenKeywords: AvailableKeyword[];

function selectDatabase() {
  inquirer
    .prompt({
      type: "list",
      name: "database",
      message: "Choose a database",
      choices: Object.keys(databases),
    })
    .then((answer: { database: AvailableDatabase }) => {
      chosenDatabase = databases[answer.database];
      selectFields();
    });
}

function selectFields() {
  inquirer
    .prompt({
      type: "checkbox",
      name: "fields",
      message: "Choose the fields to search",
      choices: chosenDatabase.possibleFields,
      pageSize: chosenDatabase.possibleFields.length,
    })
    .then((answer: { fields: string[] }) => {
      chosenFields = answer.fields.map(
        (field) =>
          chosenDatabase.possibleFields.find(
            (possibleField) => possibleField.name === field
          )!.queryString
      );
      selectKeywords();
    });
}

function selectKeywords() {
  inquirer
    .prompt({
      type: "checkbox",
      name: "keywords",
      message: "Choose the keywords to search",
      choices: Object.keys(keywords),
    })
    .then((answer: { keywords: AvailableKeyword[] }) => {
      chosenKeywords = answer.keywords;
      const query = chosenDatabase.buildQuery(
        chosenKeywords,
        chosenFields as any
      );
      console.log(query);
    });
}

selectDatabase();
