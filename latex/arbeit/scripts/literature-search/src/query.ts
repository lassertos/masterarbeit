import { AvailableKeyword, keywords } from "./keywords";

type WordQuery = {
  type: "word";
  prefix: string;
  postfix: string;
  word: string;
};
type FieldQuery = {
  type: "field";
  field: string;
  operator: string;
  prefix: string;
  postfix: string;
  query: Query;
};
type AndQuery = {
  type: "and";
  operator: string;
  prefix?: string;
  postfix?: string;
  queries: Query[];
};
type OrQuery = {
  type: "or";
  operator: string;
  prefix?: string;
  postfix?: string;
  queries: Query[];
};
export type Query = WordQuery | FieldQuery | AndQuery | OrQuery;

export type QueryOptions = {
  operators: {
    and: string;
    field: string;
    or: string;
  };
  prefixes: {
    and: string;
    field: string;
    or: string;
    word: string;
  };
  postfixes: {
    and: string;
    field: string;
    or: string;
    word: string;
  };
};

export function buildQuery(query: Query) {
  switch (query.type) {
    case "word":
      return buildWordQuery(query);
    case "field":
      return buildFieldQuery(query);
    case "and":
      return buildAndQuery(query);
    case "or":
      return buildOrQuery(query);
  }
}

function buildWordQuery(query: WordQuery): string {
  return `${query.prefix}${query.word}${query.postfix}`;
}

function buildFieldQuery(query: FieldQuery): string {
  return `${query.prefix}${query.field}${query.operator}${buildQuery(
    query.query
  )}${query.postfix}`;
}

function buildAndQuery(query: AndQuery): string {
  return `${query.prefix}${query.queries
    .map((q) => buildQuery(q))
    .join(query.operator)}${query.postfix}`;
}

function buildOrQuery(query: OrQuery): string {
  return `${query.prefix}${query.queries
    .map((q) => buildQuery(q))
    .join(query.operator)}${query.postfix}`;
}
