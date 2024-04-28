import inquirer from "inquirer";
import { createQuery } from "./actions/create-query";
import SearchBox = require("./custom-prompts/autocomplete-list");
import { integratedDevelopmentEnvironmentKeywords } from "./keywords/integrated-development-environment";
import { webKeywords } from "./keywords/web";

console.clear();

createQuery();
// inquirer.registerPrompt("search-list", SearchBox);
// inquirer.prompt({
//   type: "search-list" as any,
//   name: "test",
//   message: "Select a package manager",
//   choices: [
//     {
//       name: "npm",
//       value: "npm",
//       description: "npm is the most popular package manager",
//     },
//     {
//       name: "yarn",
//       value: "yarn",
//       description: "yarn is an awesome package manager",
//     },
//     {
//       name: "jspm",
//       value: "jspm",
//       disabled: true,
//     },
//     {
//       name: "pnpm",
//       value: "pnpm",
//       disabled: "(pnpm is not available)",
//     },
//   ],
// });
