import { advantageKeywords } from "./advantage";
import { disadvantageKeywords } from "./disadvantage";
import { educationKeywords } from "./education";
import { integratedDevelopmentEnvironmentKeywords } from "./integrated-development-environment";
import { problemKeywords } from "./problem";
import { requirementKeywords } from "./requirement";
import { webKeywords } from "./web";

export type Synonym =
  | {
      singular: string;
      plural?: string;
      isCaseSensitive?: boolean;
    }
  | {
      singular?: string;
      plural: string;
      isCaseSensitive?: boolean;
    };

export type Keyword = Synonym & {
  synonyms: Synonym[];
};

export const keywords = [
  ...advantageKeywords,
  ...disadvantageKeywords,
  ...educationKeywords,
  ...integratedDevelopmentEnvironmentKeywords,
  ...problemKeywords,
  ...requirementKeywords,
  ...webKeywords,
];
