import inquirer from "inquirer";
import { createQueryAction } from "./actions/create-query";
import { toJsonAction } from "./actions/to-json";
import { mergeAction } from "./actions/merge";

console.clear();

inquirer
  .prompt({
    type: "list",
    name: "action",
    message: "Select an action",
    choices: [
      {
        name: "create query",
        value: "create-query",
      },
      {
        name: "parse raw data",
        value: "parse-raw-data",
      },
      {
        name: "merge hits",
        value: "merge-hits",
      },
    ],
  })
  .then(
    (answer: { action: "create-query" | "parse-raw-data" | "merge-hits" }) => {
      switch (answer.action) {
        case "create-query":
          return createQueryAction();
        case "parse-raw-data":
          return toJsonAction();
        case "merge-hits":
          return mergeAction();
      }
    }
  );
