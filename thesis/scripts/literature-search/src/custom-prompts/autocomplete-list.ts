import observe from "inquirer/lib/utils/events";
import figures from "figures";
import Paginator from "inquirer/lib/utils/paginator";
import chalk from "chalk";
import * as fuzzy from "fuzzy";
import * as Inquirer from "inquirer";
import ScreenManager from "inquirer/lib/utils/screen-manager";
import readline from "readline";
import Prompt from "inquirer/lib/prompts/base";
import { filter, map, takeUntil } from "rxjs";

// renderer is used to _display_ a row
type Renderer = (item: Item, isSelected: boolean) => string;
// filterer is used to _fuzzy search_ a row
// it's separate from renderer so you can search for non-visible text!
type Filterer = (item: Item, query: string) => boolean;

interface Item extends Inquirer.ChoiceBase {
  id: number;
  name?: string;
  value?: string;
}

const ignoreKeys = ["up", "down", "space"];

function defaultFilterRow(choice: Item, query: string) {
  return fuzzy.test(query, choice.name ?? "");
}

function defaultRenderRow(choice: Item, isSelected: boolean) {
  if (isSelected) {
    return `${chalk.cyan(figures.pointer)}${chalk.cyan(choice.name)}`;
  } else {
    return ` ${choice.name}`;
  }
}

function renderChoices(renderRow: Renderer, choices: Item[], pointer: number) {
  var output = "";

  choices.forEach(function (choice, i) {
    output += renderRow(choice, i === pointer);
    output += "\n";
  });

  return output.replace(/\n$/, "");
}

class SearchBox extends Prompt<Inquirer.Question & { pageSize: number }> {
  private pointer: number = 0;
  private selected: string | undefined = "";
  // @ts-ignore
  private done: (state: any) => void;
  private list: Item[] = [];
  private filterList: Item[] = [];
  private paginator: Paginator = new Paginator(
    new ScreenManager(
      readline.createInterface({ input: process.stdin, output: process.stdout })
    )
  );
  private renderRow: Renderer;
  private filterRow: Filterer;

  constructor(
    question: Inquirer.Question & { pageSize: number },
    readline: readline.Interface,
    answers: Inquirer.Answers
  ) {
    super(question, readline, answers);
    // const { choices, renderRow, filterRow } = this.opt;
    const { choices } = this.opt;

    if (!choices) {
      this.throwParamError("choices");
    }

    this.renderRow = defaultRenderRow;
    this.filterRow = defaultFilterRow;

    this.filterList = this.list = choices.choices
      .filter(() => true) // fix slice is not a function
      .map((item, id) => ({ ...item, id }));
  }

  render(error?: string) {
    // Render question
    var message = this.getQuestion();
    var bottomContent = "";
    const tip = chalk.dim("(Press <enter> to submit)");

    // Render choices or answer depending on the state
    if (this.status === "answered") {
      message += chalk.cyan(this.selected ? this.selected : "");
    } else {
      message += `${tip} ${this.rl.line}`;
      const choicesStr = renderChoices(
        this.renderRow,
        this.filterList,
        this.pointer
      );
      bottomContent = this.paginator.paginate(
        choicesStr,
        this.pointer,
        this.opt.pageSize
      );
    }

    if (error) {
      bottomContent = chalk.red(">> ") + error;
    }

    this.screen.render(message, bottomContent);
  }

  filterChoices() {
    this.filterList = this.list.filter((choice) =>
      this.filterRow(choice, this.rl.line)
    );
  }

  onDownKey() {
    const len = this.filterList.length;
    this.pointer = this.pointer < len - 1 ? this.pointer + 1 : 0;
    this.render();
  }

  onUpKey() {
    const len = this.filterList.length;
    this.pointer = this.pointer > 0 ? this.pointer - 1 : len - 1;
    this.render();
  }

  onAllKey() {
    this.render();
  }

  onEnd(state: any) {
    this.status = "answered";
    if (this.getCurrentItemName()) {
      this.selected = this.getCurrentItemName();
    }
    // Rerender prompt (and clean subline error)
    this.render();

    this.screen.done();
    this.done(state.value);
  }

  onError(state: any) {
    this.render(state.isValid);
  }

  onKeyPress() {
    this.pointer = 0;
    this.filterChoices();
    this.render();
  }

  getCurrentItem() {
    if (this.filterList.length) {
      return this.filterList[this.pointer];
    } else {
      return this.list[this.pointer];
    }
  }

  getCurrentItemValue() {
    return this.getCurrentItem().value;
  }

  getCurrentItemName() {
    return this.getCurrentItem().name;
  }

  _run(cb: any) {
    this.done = cb;

    const events = observe(this.rl);
    const upKey = events.keypress.pipe(
      filter(
        (e) => !!(e.key.name === "up" || (e.key.name === "p" && e.key.ctrl))
      )
    );
    const downKey = events.keypress.pipe(
      filter(
        (e) => !!(e.key.name === "down" || (e.key.name === "n" && e.key.ctrl))
      )
    );
    const allKey = events.keypress.pipe(
      filter((e) => !!(e.key.name === "o" && e.key.ctrl))
    );
    const validation = this.handleSubmitEvents(
      events.line.pipe(map(this.getCurrentItemValue.bind(this)))
    );

    validation.success.forEach(this.onEnd.bind(this));
    validation.error.forEach(this.onError.bind(this));
    upKey.forEach(this.onUpKey.bind(this));
    downKey.forEach(this.onDownKey.bind(this));
    allKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onAllKey.bind(this));
    events.keypress
      .pipe(
        filter((e) => !e.key.ctrl && !ignoreKeys.includes(e.key.name ?? "")),
        takeUntil(validation.success)
      )
      .forEach(this.onKeyPress.bind(this));

    this.render();
    return this;
  }
}

export = SearchBox;
