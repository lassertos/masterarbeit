import { AvailableKeyword } from "../keywords";
import { acmDatabase } from "./acm";
import { ieeeDatabase } from "./ieee";
import { scopusDatabase } from "./scopus";
import { webOfScienceDatabase } from "./wos";
import { zbMathDatabase } from "./zbmath";

export type Database = {
  name: string;
  possibleFields: { name: string; queryString: string }[];
  buildQuery: (keywords: AvailableKeyword[], fields: string[]) => string;
};

export const databases = {
  "ACM Digital Library": acmDatabase,
  "IEEE Xplore": ieeeDatabase,
  Scopus: scopusDatabase,
  "Web of Science": webOfScienceDatabase,
  "zbMATH Open": zbMathDatabase,
};

export type AvailableDatabase = keyof typeof databases;
