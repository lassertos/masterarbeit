import { Database } from ".";
import { Keyword } from "../keywords";
import { Query, QueryOptions, buildQuery } from "../query";

const queryOptions = {
  operators: {
    and: " & ",
    field: ":",
    or: " | ",
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

export const zbMathDatabase: Database = {
  name: "zbMATH Open",
  possibleFields: [
    { name: "anywhere", queryString: "any" },
    { name: "authors", queryString: "au" },
    { name: "title", queryString: "ti" },
    { name: "source / journal", queryString: "so" },
    { name: "language", queryString: "la" },
    { name: "year of publication", queryString: "py" },
    { name: "summary / review", queryString: "ab" },
    { name: "reviewer", queryString: "rv" },
    { name: "document type", queryString: "dt" },
    { name: "zbMATH ID", queryString: "an" },
    { name: "external ID", queryString: "en" },
    { name: "classification", queryString: "cc" },
    { name: "keywords", queryString: "ut" },
    { name: "software", queryString: "sw" },
    { name: "biographic reference", queryString: "br" },
  ],
  buildQuery: (keywords, fields) =>
    buildQuery(buildQueryTemplate(keywords, fields, queryOptions)),
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
