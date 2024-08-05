import { Database } from ".";
import { Keyword } from "../keywords";
import { Query, QueryOptions, buildQuery } from "../query";
import csv from "csvtojson";
import fs from "fs";

const queryOptions = {
  operators: {
    and: " AND ",
    field: "(",
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
    field: ")",
    or: ")",
    word: '"',
  },
};

export const scopusDatabase: Database = {
  name: "Scopus",
  possibleFields: [
    { name: "All Fields", queryString: "ALL" },
    { name: "Abstract", queryString: "ABS" },
    { name: "Document Title", queryString: "TITLE" },
    { name: "Document Title & Abstract", queryString: "TITLE-ABS" },
    {
      name: "Document Title & Abstract & Keywords",
      queryString: "TITLE-ABS-KEY",
    },
    {
      name: "Document Title & Abstract & Keywords & Author",
      queryString: "TITLE-ABS-KEY-AUTH",
    },
  ],
  buildQuery: (keywords, fields) =>
    buildQuery(buildQueryTemplate(keywords, fields, queryOptions)),
  toJson: async (file) => {
    const jsonData: any[] = await csv().fromFile(file);
    return jsonData.map((entry) => {
      return {
        title: entry.Title,
        abstract: entry.Abstract ?? "",
        keywords: (entry["Author Keywords"]?.split("; ") ?? []).join("; "),
        released: parseInt(entry.Year),
        link: entry["DOI"] ? "https://doi.org/" + entry["DOI"] : entry["Link"],
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
    type: "and",
    operator: options.operators.and,
    prefix: options.prefixes.and,
    postfix: options.postfixes.and,
    queries: [
      {
        type: "word",
        word: "SUBJAREA(comp)",
        prefix: "",
        postfix: "",
      },
      {
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
      },
    ],
  };
}
