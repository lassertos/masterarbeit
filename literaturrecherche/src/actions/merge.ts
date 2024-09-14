import fs from "fs";
import { integratedDevelopmentEnvironmentKeywords } from "../keywords/integrated-development-environment";
import { Keyword } from "../keywords";

type Hit = {
  title: string;
  abstract: string;
  keywords: string;
  released: number;
  link: string;
};

type ScoredHit = {
  title: string;
  abstract: string;
  keywords: string;
  released: number;
  link: string;
  scores: {
    title: number;
    abstract: number;
    keywords: number;
  };
};

export async function mergeAction() {
  const hits = [];

  for (const entry of fs.readdirSync("data/parsed")) {
    if (!entry.endsWith(".json")) continue;

    const parsedHits = JSON.parse(
      fs.readFileSync(`data/parsed/${entry}`).toString()
    );
    console.log(`${entry}: ${parsedHits.length}`);
    hits.push(...parsedHits);
  }

  const hitsFiltered = filterByScore(
    hits,
    ["title", "keywords"],
    integratedDevelopmentEnvironmentKeywords,
    1
  );
  const hitsWithoutExactDuplicates = removeExactDuplicates(hitsFiltered);

  console.log(
    hits.length,
    hitsFiltered.length,
    hitsWithoutExactDuplicates.length
  );

  exportHitsToJson(hitsWithoutExactDuplicates, "data/merged/merged.json");
  exportHitsToCsv(hitsWithoutExactDuplicates, "data/merged/merged.csv");
}

function removeExactDuplicates(hits: Hit[]): Hit[] {
  return hits
    .filter(
      (value, index, array) =>
        array.findIndex(
          (hit) => hit.title.toLowerCase() === value.title.toLowerCase()
        ) === index
    )
    .filter(
      (value, index, array) =>
        array.findIndex((h) => h.link === value.link) === index
    )
    .sort((a, b) =>
      a.released < b.released ? 1 : a.released === b.released ? 0 : -1
    );
}

function scoreHits(hits: Hit[], words: Keyword[]): ScoredHit[] {
  return hits.map((hit) => {
    let scores = {
      title: 0,
      abstract: 0,
      keywords: 0,
    };
    for (const key of ["title", "abstract", "keywords"] as const) {
      for (const keyword of words) {
        for (const synonym of [keyword, ...keyword.synonyms]) {
          const word = synonym.singular ?? synonym.plural;
          if (!word)
            throw new Error(
              "Synonym has neither a defined singular nor a defined plural!"
            );
          if (synonym.isCaseSensitive && hit[key].includes(word)) {
            scores[key]++;
            break;
          } else if (
            !synonym.isCaseSensitive &&
            hit[key].toLowerCase().includes(word.toLowerCase())
          ) {
            scores[key]++;
            break;
          }
        }
      }
    }
    return {
      ...hit,
      scores,
    };
  });
}

function filterByScore(
  hits: Hit[],
  properties: ("title" | "abstract" | "keywords")[],
  words: Keyword[],
  minimumScore: number
): Hit[] {
  const scoredHits = scoreHits(hits, words);
  return scoredHits
    .filter((scoredHit) => {
      let score = 0;

      for (const property of properties) {
        score += scoredHit.scores[property];
      }

      return score >= minimumScore;
    })
    .map((scoredHit) => {
      return {
        title: scoredHit.title,
        abstract: scoredHit.abstract,
        keywords: scoredHit.keywords,
        released: scoredHit.released,
        link: scoredHit.link,
      };
    });
}

function exportHitsToJson(hits: Hit[], path: string) {
  fs.writeFileSync(path, JSON.stringify(hits, null, 4));
}

function exportHitsToCsv(hits: Hit[], path: string) {
  fs.writeFileSync(
    path,
    "title|abstract|keywords|released|link\n" +
      // prettier-ignore
      hits
        .map(
          (hit) =>
            `"${
              hit.title.replace('"','""')
            }","${
              hit.abstract?.replace('"','""') ?? ""
            }","${
              hit.keywords.replace('"','""')
            }","${
              hit.released
            }","${
              hit.link?.replace('"','""') ?? ""
            }"`
        )
        .join("\n")
  );
}
