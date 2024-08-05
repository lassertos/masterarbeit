import { Keyword } from "../keywords";
import { acmDatabase } from "./acm";
import { ieeeDatabase } from "./ieee";
import { scopusDatabase } from "./scopus";
import { webOfScienceDatabase } from "./wos";

export type DatabaseEntry = {
  title: string;
  abstract: string;
  keywords: string;
  released: number;
  link: string;
};

export type Database = {
  name: string;
  possibleFields: { name: string; queryString: string }[];
  buildQuery: (keywords: Keyword[], fields: string[]) => string;
  toJson: (file: string) => Promise<DatabaseEntry[]> | DatabaseEntry[];
};

export const databases = {
  "ACM Digital Library": acmDatabase,
  "IEEE Xplore": ieeeDatabase,
  Scopus: scopusDatabase,
  "Web of Science": webOfScienceDatabase,
};

export type AvailableDatabase = keyof typeof databases;
