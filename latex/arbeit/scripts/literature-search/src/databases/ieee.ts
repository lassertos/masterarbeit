import { Database } from ".";
import { Keyword } from "../keywords";
import { Query, QueryOptions, buildQuery } from "../query";
import csv from "csvtojson";
import fs from "fs";

const queryOptions = {
  operators: {
    and: " AND ",
    field: ":",
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

export const ieeeDatabase: Database = {
  name: "IEEE Xplore",
  possibleFields: [
    { name: "All Metadata", queryString: '"All Metadata"' },
    { name: "Full Text & Metadata", queryString: '"Full Text .AND. Metadata"' },
    { name: "Full Text Only", queryString: '"Full Text Only"' },
    { name: "Document Title", queryString: '"Document Title"' },
    { name: "Authors", queryString: '"Authors"' },
    { name: "Publication Title", queryString: '"Publication Title"' },
    { name: "Abstract", queryString: '"Abstract"' },
    { name: "Index Terms", queryString: '"Index Terms"' },
    { name: "Accession Number", queryString: '"Accession Number"' },
    { name: "Article Number", queryString: '"Article Number"' },
    { name: "Article Page Number", queryString: '"Article Page Number"' },
    { name: "Author Affiliations", queryString: '"Author Affiliations"' },
    { name: "Author Keywords", queryString: '"Author Keywords"' },
    { name: "Author ORCID", queryString: '"Author ORCID"' },
    { name: "DOI", queryString: '"DOI"' },
    { name: "Funding Agency", queryString: '"Funding Agency"' },
    { name: "IEEE Terms", queryString: '"IEEE Terms"' },
    { name: "ISBN", queryString: '"ISBN"' },
    { name: "ISSN", queryString: '"ISSN"' },
    { name: "Issue", queryString: '"Issue"' },
    { name: "Mesh_Terms", queryString: '"Mesh_Terms"' },
    { name: "Publication Number", queryString: '"Publication Number"' },
    { name: "Publisher", queryString: '"Publisher"' },
    {
      name: "Parent Publication Number",
      queryString: '"Parent Publication Number"',
    },
    {
      name: "Standards Dictionary Terms",
      queryString: '"Standards Dictionary Terms"',
    },
    { name: "Standards ICS Terms", queryString: '"Standards ICS Terms"' },
    { name: "Standard Number", queryString: '"Standard Number"' },
  ],
  buildQuery: (keywords, fields) =>
    buildQuery(buildQueryTemplate(keywords, fields, queryOptions)),
  toJson: async (file) => {
    const jsonData: any[] = await csv().fromFile(file);
    return jsonData.map((entry) => {
      return {
        title: entry["Document Title"],
        abstract: entry.Abstract ?? "",
        keywords: (entry["Author Keywords"]?.split(";") ?? []).join("; "),
        released: parseInt(entry["Publication Year"]),
        link: entry["DOI"]
          ? "https://doi.org/" + entry["DOI"]
          : entry["PDF Link"],
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
                  type: "field",
                  field,
                  operator: options.operators.field,
                  prefix: options.prefixes.field,
                  postfix: options.postfixes.field,
                  query: {
                    type: "word",
                    word,
                    prefix: options.prefixes.word,
                    postfix: options.postfixes.word,
                  },
                };
              }),
          };
        }),
      };
    }),
  };
}
