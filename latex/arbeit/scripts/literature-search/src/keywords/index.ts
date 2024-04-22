import { advantageKeyword } from "./advantage";
import { disadvantageKeyword } from "./disadvantage";
import { educationKeyword } from "./education";
import { integratedDevelopmentEnvironmentKeyword } from "./integrated-development-environment";
import { problemKeyword } from "./problem";
import { requirementKeyword } from "./requirement";

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

export const keywords = {
  advantage: advantageKeyword,
  disadvantage: disadvantageKeyword,
  education: educationKeyword,
  "integrated-development-environment": integratedDevelopmentEnvironmentKeyword,
  problem: problemKeyword,
  requirement: requirementKeyword,
};

export type AvailableKeyword = keyof typeof keywords;
