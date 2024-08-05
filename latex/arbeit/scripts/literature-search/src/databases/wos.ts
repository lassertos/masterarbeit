import { Database } from ".";
import { Keyword } from "../keywords";
import { Query, QueryOptions, buildQuery } from "../query";
import { execSync } from "child_process";

const queryOptions = {
  operators: {
    and: " AND ",
    field: "=",
    or: " OR ",
  },
  prefixes: {
    and: "(",
    field: "",
    or: "(",
    word: '"',
  },
  postfixes: {
    and: ")",
    field: "",
    or: ")",
    word: '"',
  },
};

export const webOfScienceDatabase: Database = {
  name: "Web of Science",
  possibleFields: [
    { name: "Topic", queryString: "TS" },
    { name: "Title", queryString: "TI" },
    { name: "Author", queryString: "AU" },
    { name: "Author Identifiers", queryString: "AI" },
    { name: "Group Author", queryString: "GP" },
    { name: "Editor", queryString: "ED" },
    { name: "Abstract", queryString: "AB" },
    { name: "Author Keywords", queryString: "AK" },
    { name: "Keyword Plus ®", queryString: "KP" },
    { name: "Publication / Source Titles", queryString: "SO" },
    { name: "DOI", queryString: "DO" },
    { name: "Publication Date", queryString: "DOP" },
    { name: "Year Published", queryString: "PY" },
    { name: "Address", queryString: "AD" },
    { name: "Research Area", queryString: "SU" },
    { name: "ISSN/ISBN", queryString: "IS" },
    { name: "PubMed ID", queryString: "PMID" },
  ],
  buildQuery: (keywords, fields) =>
    buildQuery(buildQueryTemplate(keywords, fields, queryOptions)),
  toJson: (file) => {
    const jsonData: any[] = JSON.parse(
      execSync(`pandoc ${file} -t csljson`, {
        maxBuffer: 1024 * 1024 * 4,
      }).toString()
    );
    return jsonData.map((entry) => {
      return {
        title: entry.title,
        abstract: entry.abstract ?? "",
        keywords: (entry.keyword?.split("; ") ?? []).join("; "),
        released: parseInt(entry["issued"]["date-parts"][0][0]),
        link: entry["DOI"]
          ? "https://doi.org/" + entry["DOI"]
          : "https://www.webofscience.com/wos/woscc/full-record/" + entry["id"],
      };
    });
  },
};

export function buildQueryTemplate(
  keywords: Keyword[],
  fields: string[],
  options: QueryOptions
): Query {
  return {
    type: "or",
    operator: options.operators.or,
    prefix: options.prefixes.or,
    postfix: options.postfixes.or,
    queries: fields.map((field) => {
      return {
        type: "field",
        field,
        operator: options.operators.field,
        prefix: options.prefixes.field,
        postfix: options.postfixes.field,
        query: {
          type: "and",
          operator: options.operators.and,
          prefix: options.prefixes.and,
          postfix: options.postfixes.and,
          queries: keywords.map((keyword) => {
            return {
              type: "or",
              operator: options.operators.or,
              prefix: options.prefixes.or,
              postfix: options.postfixes.or,
              queries: [keyword, ...keyword.synonyms]
                .flatMap((synonym) => {
                  const words = [];

                  if (synonym.singular) words.push(synonym.singular);
                  if (synonym.plural) words.push(synonym.plural);

                  return words;
                })
                .map((word) => {
                  return {
                    type: "word",
                    prefix: options.prefixes.word,
                    postfix: options.postfixes.word,
                    word: word,
                  };
                }),
            };
          }),
        },
      };
    }),
  };
}
