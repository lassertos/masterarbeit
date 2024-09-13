import inquirer from "inquirer";

export async function selectVariant(): Promise<"normal" | "clean"> {
  const { variant } = await inquirer.prompt<{ variant: "normal" | "clean" }>({
    name: "variant",
    type: "list",
    message: "Choose a variant",
    choices: ["normal", "clean"],
  });

  return variant;
}
