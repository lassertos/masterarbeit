import inquirer from "inquirer";
import { AvailableKeyword, keywords } from "../keywords";

export async function selectKeywords(): Promise<AvailableKeyword[]> {
  return inquirer
    .prompt({
      type: "checkbox",
      name: "keywords",
      message: "Choose the keywords to search",
      choices: Object.keys(keywords),
    })
    .then((answer: { keywords: AvailableKeyword[] }) => {
      return answer.keywords;
    });
}
