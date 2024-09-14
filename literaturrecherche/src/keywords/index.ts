import { advantageKeywords } from "./advantage";
import { approachKeywords } from "./approach";
import { debuggingKeywords } from "./debugging";
import { disadvantageKeywords } from "./disadvantage";
import { educationKeywords } from "./education";
import { integratedDevelopmentEnvironmentKeywords } from "./integrated-development-environment";
import { microcontrollerKeywords } from "./microcontroller";
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
  ...approachKeywords,
  ...debuggingKeywords,
  ...disadvantageKeywords,
  ...educationKeywords,
  ...integratedDevelopmentEnvironmentKeywords,
  ...microcontrollerKeywords,
  ...problemKeywords,
  ...requirementKeywords,
  ...webKeywords,
];
