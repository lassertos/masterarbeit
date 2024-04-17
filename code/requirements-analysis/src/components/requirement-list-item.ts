import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Requirement } from "../model";
import { colors } from "../styles";

@customElement("rqa-requirement-list-item")
export class RequirementListItem extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      border-radius: 0.5rem;
      background-color: ${colors["blue-50"]};
      filter: drop-shadow(0px 4px 4px ${colors["blue-900"]});
    }

    #header {
      width: 100%;
      height: 3rem;
      display: flex;
      justify-content: center;
      align-items: center;
      user-select: none;
      border-radius: 0.5rem;
      padding: 0.5rem;
      box-sizing: border-box;
      cursor: pointer;
      background-color: ${colors["blue-300"]};
      font-family: inherit;
      font-size: large;
      font-weight: 500;

      &:hover {
        background-color: ${colors["blue-400"]};
      }
    }

    #chevron-right {
      height: 1.5rem;
      width: 1.5rem;
      padding: 0.25rem;
      margin-left: auto;
      border-radius: 360%;
    }

    #chevron-down {
      height: 1.5rem;
      width: 1.5rem;
      padding: 0.25rem;
      margin-left: auto;
      border-radius: 360%;
    }

    #title {
      position: absolute;
    }

    #content {
      width: 100%;
      border-radius: 0.5rem;
      padding: 0.5rem;
      box-sizing: border-box;
    }

    .visible {
      display: block;
    }

    .hidden {
      display: none;
    }

    .long-td {
      word-break: break-all;
      padding-left: 2rem;
    }

    button {
      border-radius: 0.5rem;
      padding: 0.5rem;
      border-width: 0px;
      font-size: large;
    }

    #buttons-container {
      padding-top: 0.5rem;
      display: flex;
      flex-direction: row;
      gap: 0.5rem;
      align-items: center;
      width: 100%;
    }

    #edit-button {
      flex-grow: 1;
      background-color: ${colors["orange-300"]};

      &:hover {
        background-color: ${colors["orange-400"]};
      }
    }

    #delete-button {
      flex-grow: 1;
      background-color: ${colors["red-300"]};

      &:hover {
        background-color: ${colors["red-400"]};
      }
    }
  `;

  @state()
  isOpen = false;

  @property({ type: Number })
  index: number;

  @property({ type: Object })
  requirement: Requirement;

  protected render(): unknown {
    return html`<div id="header" @click=${() => this.toggleOpen()}>
        <span id="title"
          >Anforderung
          ${this.index}${this.requirement.title
            ? " : " + this.requirement.title
            : ""}</span
        >${this.isOpen
          ? html`<svg
              id="chevron-down"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="w-6 h-6"
            >
              <path
                fill-rule="evenodd"
                d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z"
                clip-rule="evenodd"
              />
            </svg> `
          : html`<svg
              id="chevron-right"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="w-6 h-6"
            >
              <path
                fill-rule="evenodd"
                d="M16.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5Z"
                clip-rule="evenodd"
              />
            </svg>`}
      </div>
      <div id="content" class="${this.isOpen ? "visible" : "hidden"}">
        <table>
          <tr>
            <td>Urheber</td>
            <td class="long-td">${this.requirement.originator}</td>
          </tr>
          <tr>
            <td>Beschreibung</td>
            <td class="long-td">${this.requirement.description}</td>
          </tr>
          <tr>
            <td>Begründung</td>
            <td class="long-td">${this.requirement.rationale}</td>
          </tr>
          <tr>
            <td>Eignungskriterium</td>
            <td class="long-td">${this.requirement.fitCriterion}</td>
          </tr>
          <tr>
            <td>Kundenzufriedenheit</td>
            <td class="long-td">${this.requirement.customerSatisfaction}</td>
          </tr>
          <tr>
            <td>Kundenunzufriedenheit</td>
            <td class="long-td">${this.requirement.customerDissatisfaction}</td>
          </tr>
        </table>
        <div id="buttons-container">
          <button id="edit-button" @click=${() => this.editRequirement()}>
            Bearbeiten
          </button>
          <button id="delete-button" @click=${() => this.deleteRequirement()}>
            Löschen
          </button>
        </div>
      </div>`;
  }

  toggleOpen() {
    this.isOpen = !this.isOpen;
  }

  editRequirement() {
    this.dispatchEvent(
      new CustomEvent<number>("edit-requirement", {
        detail: this.index,
        bubbles: true,
        composed: true,
      })
    );
  }

  deleteRequirement() {
    this.dispatchEvent(
      new CustomEvent<number>("delete-requirement", {
        detail: this.index,
        bubbles: true,
        composed: true,
      })
    );
  }
}
