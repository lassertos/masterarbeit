import { advantageKeyword, vorteilKeyword } from "./advantage";
import { disadvantageKeyword, nachteilKeyword } from "./disadvantage";
import { educationKeyword, lehreKeyword } from "./education";
import {
  integratedDevelopmentEnvironmentKeyword,
  integrierteEntwicklungsumgebungKeyword,
} from "./integrated-development-environment";
import { problemKeyword, problemKeywordGER } from "./problem";
import { anforderungKeyword, requirementKeyword } from "./requirement";

export type Synonym =
  | {
      singular: string;
      plural?: string;
    }
  | {
      singular?: string;
      plural: string;
    };

export type Keyword = Synonym & {
  synonyms: Synonym[];
};

export const keywords = [
  integratedDevelopmentEnvironmentKeyword,
  educationKeyword,
  problemKeyword,
  advantageKeyword,
  disadvantageKeyword,
  requirementKeyword,
  integrierteEntwicklungsumgebungKeyword,
  lehreKeyword,
  problemKeywordGER,
  vorteilKeyword,
  nachteilKeyword,
  anforderungKeyword,
];
