import inquirer from "inquirer";
import { Keyword, keywords } from "../keywords";

export async function selectKeywordsAction(): Promise<Keyword[]> {
  return inquirer
    .prompt({
      type: "checkbox",
      name: "keywords",
      message: "Choose the keywords to search",
      choices: keywords.map((keyword) => {
        return {
          name:
            (keyword.singular ?? keyword.plural) +
            (keyword.synonyms.length > 0
              ? ` (${keyword.synonyms
                  .map((synonym) => synonym.singular ?? synonym.plural)
                  .join(", ")})`
              : ""),
          short: keyword.singular ?? keyword.plural,
          value: keyword,
        };
      }),
      loop: false,
    })
    .then((answer: { keywords: Keyword[] }) => {
      return answer.keywords;
    });
}
