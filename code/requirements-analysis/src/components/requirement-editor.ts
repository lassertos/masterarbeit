import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { Requirement } from "../model";
import { AutoResizeTextArea } from "./auto-resize-textarea";
import { colors } from "../styles";

@customElement("rqa-requirement-editor")
export class RequirementEditor extends LitElement {
  static styles = css`
    :host {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    #header {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 4rem;
      background-color: ${colors["blue-800"]};
    }

    #container {
      width: calc(100% - 4rem);
      height: fit-content;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      background-color: ${colors["blue-50"]};
      margin: 2rem;
      box-sizing: border-box;
      border-radius: 1rem;
      filter: drop-shadow(2px 4px 6px ${colors["blue-900"]});
    }

    span {
      color: white;
      font-size: xx-large;
    }

    button {
      border-radius: 0.5rem;
      padding: 0.5rem;
      border-width: 0px;
    }

    #cancel-button {
      width: 100%;
      background-color: ${colors["gray-300"]};

      &:hover {
        background-color: ${colors["gray-400"]};
      }
    }

    #save-and-close-button {
      flex-grow: 1;
      background-color: ${colors["blue-300"]};

      &:hover {
        background-color: ${colors["blue-400"]};
      }
    }

    #save-and-next-button {
      flex-grow: 1;
      background-color: ${colors["orange-300"]};

      &:hover {
        background-color: ${colors["orange-400"]};
      }
    }

    .flex-row-container {
      display: flex;
      flex-direction: row;
      gap: 0.5rem;
      align-items: center;
    }

    .flex-column-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    input {
      padding: 0.5rem;
      border-radius: 0.5rem;
      border-width: 1px;
      width: 12rem;
    }

    select {
      padding: 0.5rem;
      border-radius: 0.5rem;
      background-color: white;
      text-align: center;
      width: 4rem;
    }

    #grid-container {
      display: grid;
      grid-template-columns: max-content 1fr;
      grid-template-rows: repeat(10, max-content);
      grid-column-gap: 16px;
      grid-row-gap: 8px;
      align-items: center;
    }

    .div1 {
      grid-area: 1 / 1 / 2 / 2;
    }
    .div2 {
      grid-area: 1 / 2 / 2 / 3;
    }
    .div3 {
      grid-area: 2 / 1 / 3 / 2;
    }
    .div4 {
      grid-area: 2 / 2 / 3 / 3;
    }
    .div5 {
      grid-area: 3 / 1 / 5 / 3;
    }
    .div6 {
      grid-area: 5 / 1 / 7 / 3;
    }
    .div7 {
      grid-area: 7 / 1 / 9 / 3;
    }
    .div8 {
      grid-area: 9 / 1 / 10 / 2;
    }
    .div9 {
      grid-area: 9 / 2 / 10 / 3;
    }
    .div10 {
      grid-area: 10 / 1 / 11 / 2;
    }
    .div11 {
      grid-area: 10 / 2 / 11 / 3;
    }

    .hidden {
      display: none;
    }
  `;

  @property({ type: Object })
  requirement: Requirement;

  @property({ type: String })
  mode: "create" | "update" = "create";

  @query("#input-title")
  inputTitle: HTMLInputElement;

  @query("#input-description")
  inputDescription: AutoResizeTextArea;

  @query("#input-rationale")
  inputRationale: AutoResizeTextArea;

  @query("#input-fit-criterion")
  inputFitCriterion: AutoResizeTextArea;

  @query("#input-originator")
  inputOriginator: HTMLInputElement;

  @query("#input-customer-satisfaction")
  inputCustomerSatisfaction: HTMLSelectElement;

  @query("#input-customer-dissatisfaction")
  inputCustomerDissatisfaction: HTMLSelectElement;

  protected render(): unknown {
    return html`
      <div id="header">
        <span>Anforderungseditor</span>
      </div>
      <div id="container">
        <div id="grid-container">
          <label class="div1" for="input-title">Titel</label>
          <input
            class="div2"
            id="input-title"
            type="text"
            value=${this.requirement.title}
          />
          <label class="div3" for="input-originator">Urheber</label>
          <input
            class="div4"
            id="input-originator"
            type="text"
            value=${this.requirement.originator}
          />
          <div class="div5">
            <label for="input-description">Beschreibung</label>
            <rqa-auto-resize-textarea
              id="input-description"
              .value=${this.requirement.description}
              .parent=${this}
            ></rqa-auto-resize-textarea>
          </div>
          <div class="div6">
            <label for="input-rationale">Begründung</label>
            <rqa-auto-resize-textarea
              id="input-rationale"
              .value=${this.requirement.rationale}
              .parent=${this}
            ></rqa-auto-resize-textarea>
          </div>

          <div class="div7">
            <label for="input-fit-criterion">Eignungskriterium</label>
            <rqa-auto-resize-textarea
              id="input-fit-criterion"
              .value=${this.requirement.fitCriterion}
              .parent=${this}
            ></rqa-auto-resize-textarea>
          </div>
          <label class="div8" for="input-customer-satisfaction"
            >Kundenzufriedenheit</label
          >
          <select class="div9" id="input-customer-satisfaction">
            <option
              value="1"
              .selected=${this.requirement.customerSatisfaction === 1}
            >
              1
            </option>
            <option
              value="2"
              .selected=${this.requirement.customerSatisfaction === 2}
            >
              2
            </option>
            <option
              value="3"
              .selected=${this.requirement.customerSatisfaction === 3}
            >
              3
            </option>
            <option
              value="4"
              .selected=${this.requirement.customerSatisfaction === 4}
            >
              4
            </option>
            <option
              value="5"
              .selected=${this.requirement.customerSatisfaction === 5}
            >
              5
            </option>
          </select>
          <label class="div10" for="input-customer-dissatisfaction"
            >Kundenunzufriedenheit</label
          >
          <select class="div11" id="input-customer-dissatisfaction">
            <option
              value="1"
              .selected=${this.requirement.customerDissatisfaction === 1}
            >
              1
            </option>
            <option
              value="2"
              .selected=${this.requirement.customerDissatisfaction === 2}
            >
              2
            </option>
            <option
              value="3"
              .selected=${this.requirement.customerDissatisfaction === 3}
            >
              3
            </option>
            <option
              value="4"
              .selected=${this.requirement.customerDissatisfaction === 4}
            >
              4
            </option>
            <option
              value="5"
              .selected=${this.requirement.customerDissatisfaction === 5}
            >
              5
            </option>
          </select>
        </div>
        <div class="flex-column-container">
          <div class="flex-row-container">
            <button
              id="save-and-close-button"
              @click=${() => this.saveAndClose()}
            >
              Speichern und Schließen
            </button>
            <button
              id="save-and-next-button"
              class="${this.mode === "update" ? "hidden" : ""}"
              @click=${() => this.saveAndNext()}
            >
              Speichern und Nächstes
            </button>
          </div>
          <button id="cancel-button" @click=${() => this.cancel()}>
            Abbrechen
          </button>
        </div>
      </div>
    `;
  }

  save() {
    this.requirement.title = this.inputTitle.value;
    this.requirement.originator = this.inputOriginator.value;
    this.requirement.description = this.inputDescription.value;
    this.requirement.rationale = this.inputRationale.value;
    this.requirement.fitCriterion = this.inputFitCriterion.value;
    this.requirement.customerSatisfaction = parseInt(
      this.inputCustomerSatisfaction.value
    ) as 1 | 2 | 3 | 4 | 5;
    this.requirement.customerDissatisfaction = parseInt(
      this.inputCustomerDissatisfaction.value
    ) as 1 | 2 | 3 | 4 | 5;
  }

  saveAndClose() {
    this.save();
    this.dispatchEvent(
      new CustomEvent<Requirement>("requirement-editor-save-close", {
        detail: this.requirement,
        bubbles: true,
        composed: true,
      })
    );
  }

  saveAndNext() {
    this.save();
    this.dispatchEvent(
      new CustomEvent<Requirement>("requirement-editor-save-next", {
        detail: this.requirement,
        bubbles: true,
        composed: true,
      })
    );
  }

  cancel() {
    this.dispatchEvent(
      new CustomEvent("requirement-editor-cancel", {
        bubbles: true,
        composed: true,
      })
    );
  }
}
