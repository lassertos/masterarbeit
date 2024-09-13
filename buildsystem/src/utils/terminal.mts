import terminalKit from "terminal-kit";
import { JobStatus } from "../types.mjs";

export const terminal = terminalKit.terminal;

export function renderExecution(statusMap: Map<string, JobStatus>) {
  const screenBuffer = new terminalKit.ScreenBuffer({ dst: terminal });
  const textBuffer = new terminalKit.TextBuffer({ dst: screenBuffer });
  const characters = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const maxLength = Math.max(
    ...Array.from(statusMap.entries()).map((entry) => entry[0].length)
  );
  let index = 0;

  const interval = setInterval(() => {
    index = (index + 1) % 10;
    textBuffer.setText("");
    textBuffer.moveTo(0, 0);
    textBuffer.insert(
      `Waiting: ${
        Array.from(statusMap.entries()).filter(
          (entry) => entry[1] === "waiting"
        ).length
      }\n`,
      { color: "gray" }
    );
    textBuffer.insert(
      `Running: ${
        Array.from(statusMap.entries()).filter(
          (entry) => entry[1] === "running"
        ).length
      }\n`,
      { color: "blue" }
    );
    textBuffer.insert(
      `Finished: ${
        Array.from(statusMap.entries()).filter(
          (entry) => entry[1] === "success"
        ).length
      }\n`,
      { color: "green" }
    );
    textBuffer.insert(
      `Failed: ${
        Array.from(statusMap.entries()).filter((entry) => entry[1] === "failed")
          .length
      }\n\n`,
      { color: "red" }
    );
    textBuffer.insert(
      Array.from(statusMap.entries())
        .filter((entry) => entry[1] === "running")
        .map(
          (entry) =>
            `${entry[0]}${" ".repeat(maxLength - entry[0].length + 4)} ${
              characters[index]
            }\n`
        )
        .join(""),
      { color: "blue" }
    );
    textBuffer.draw();
    screenBuffer.draw();
    textBuffer.drawCursor();
    screenBuffer.drawCursor();
  }, 100);

  return () => {
    clearInterval(interval);
    textBuffer.setText("");
    textBuffer.moveTo(0, 0);
    textBuffer.insert(
      `Waiting: ${
        Array.from(statusMap.entries()).filter(
          (entry) => entry[1] === "waiting"
        ).length
      }\n`,
      { color: "gray" }
    );
    textBuffer.insert(
      `Running: ${
        Array.from(statusMap.entries()).filter(
          (entry) => entry[1] === "running"
        ).length
      }\n`,
      { color: "blue" }
    );
    textBuffer.insert(
      `Finished: ${
        Array.from(statusMap.entries()).filter(
          (entry) => entry[1] === "success"
        ).length
      }\n`,
      { color: "green" }
    );
    textBuffer.insert(
      `Failed: ${
        Array.from(statusMap.entries()).filter((entry) => entry[1] === "failed")
          .length
      }\n\n`,
      { color: "red" }
    );
    textBuffer.draw();
    screenBuffer.draw();
    textBuffer.drawCursor();
    screenBuffer.drawCursor();
  };
}
