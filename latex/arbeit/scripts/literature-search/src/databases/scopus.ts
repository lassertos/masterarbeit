import { Database } from ".";
import { AvailableKeyword, keywords } from "../keywords";
import { Query, QueryOptions, buildQuery } from "../query";

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
};

export function buildQueryTemplate(
  searchterms: AvailableKeyword[],
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
          queries: searchterms.map((searchterm) => {
            return {
              type: "or",
              operator: options.operators.or,
              prefix: options.prefixes.or,
              postfix: options.postfixes.or,
              queries: [keywords[searchterm], ...keywords[searchterm].synonyms]
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
