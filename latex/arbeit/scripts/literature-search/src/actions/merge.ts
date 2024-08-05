import fs from "fs";
import { similarity } from "../util/similarity";
import inquirer from "inquirer";
import { integratedDevelopmentEnvironmentKeywords } from "../keywords/integrated-development-environment";

export async function mergeAction() {
  const hits = [];

  for (const entry of fs.readdirSync("results/json")) {
    const parsedHits = JSON.parse(
      fs.readFileSync(`results/json/${entry}`).toString()
    );
    console.log(`${entry}: ${parsedHits.length}`);
    hits.push(...parsedHits);
  }

  const prefilteredHits: any[] = hits
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

  console.log(hits.length, prefilteredHits.length);

  const scores = prefilteredHits.map((hit) => {
    let score = {
      title: 0,
      abstract: 0,
      keywords: 0,
    };
    for (const key of ["title", "abstract", "keywords"] as const) {
      for (const keyword of [...integratedDevelopmentEnvironmentKeywords]) {
        for (const synonym of [keyword, ...keyword.synonyms]) {
          const word = synonym.singular ?? synonym.plural;
          if (!word)
            throw new Error(
              "Synonym has neither a defined singular nor a defined plural!"
            );
          if (synonym.isCaseSensitive && hit[key].includes(word)) {
            score[key]++;
            break;
          } else if (
            !synonym.isCaseSensitive &&
            hit[key].toLowerCase().includes(word.toLowerCase())
          ) {
            score[key]++;
            break;
          }
        }
      }
    }
    return {
      title: hit.title,
      titleScore: score.title,
      abstractScore: score.abstract,
      keywordsScore: score.keywords,
      score: score.title * 1 + score.abstract * 0 + score.keywords * 1,
    };
  });

  const filteredHits = prefilteredHits
    .map((hit, index) => {
      return {
        ...hit,
        titleScore: scores[index].titleScore,
        abstractScore: scores[index].abstractScore,
        keywordScore: scores[index].keywordsScore,
        score: scores[index].score,
      };
    })
    .sort((a, b) => {
      return a.score < b.score ? 1 : a.score === b.score ? 0 : -1;
    })
    .filter((hit) => hit.score >= 1);

  const sources: any[] = JSON.parse(
    fs.readFileSync("results/sources/sources.json").toString()
  ) as any[];

  console.log(filteredHits.length);

  console.log(`# hits: ${hits.length}`);
  console.log(`# pre-filtered hits: ${prefilteredHits.length}`);

  const unduplicatedHits: any[] = [];
  const skip: number[] = [];
  for (const [index, hit] of filteredHits.entries()) {
    console.log(`${index + 1}/${filteredHits.length}`);
    if (skip.includes(index)) {
      console.log("skipping");
      continue;
    }

    const results = filteredHits
      .slice(index)
      .map((h) => {
        return {
          title: h.title,
          score: similarity(h.title, hit.title),
          link: h.link,
        };
      })
      .sort((a, b) => {
        return a.score < b.score ? 1 : a.score === b.score ? 0 : -1;
      })
      .map((h, i) => {
        return { ...h, index: i + index };
      });

    const probableMatches = results.filter(
      (result) => result.score > 0.7 && result.score !== 1
    );

    if (probableMatches.length > 0) {
      const { duplicates } = await inquirer.prompt({
        name: "duplicates",
        type: "checkbox",
        message: `Check all duplicates of: "${hit.title}" - ${hit.link}`,
        choices: probableMatches.map((match) => {
          return {
            name: `${match.score.toFixed(2)}: "${match.title}" - ${match.link}`,
            value: match,
          };
        }),
      });

      for (const duplicate of [
        ...duplicates,
        ...probableMatches.filter(
          (match) => match.score === 1 && match.index !== index
        ),
      ]) {
        skip.push(duplicate.index);
      }

      console.log(skip);
    }

    unduplicatedHits.push(hit);
  }

  console.log(unduplicatedHits.length);

  fs.writeFileSync(
    "results/merged/merged.json",
    JSON.stringify(
      unduplicatedHits.map((hit) => {
        return {
          title: hit.title,
          abstract: hit.abstract,
          keywords: hit.keywords,
          link: hit.link,
          released: hit.released,
        };
      }),
      null,
      4
    )
  );

  fs.writeFileSync(
    "results/merged/merged.csv",
    "title|abstract|keywords|released|link\n" +
      // prettier-ignore
      unduplicatedHits
        .map(
          (hit) =>
            `^${
              hit.title
            }^|^${
              hit.abstract ?? ""
            }^|^${
              hit.keywords
            }^|^${
              hit.released
            }^|^${
              hit.link ?? ""
            }^`
        )
        .join("\n")
  );
}
