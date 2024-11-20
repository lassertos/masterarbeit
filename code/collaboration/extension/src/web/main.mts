import { css, html, LitElement } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { Message } from "./messages.mjs";
import "@vscode-elements/elements/dist/vscode-button/index.js";
import "@vscode-elements/elements/dist/vscode-single-select/index.js";
import "@vscode-elements/elements/dist/vscode-option/index.js";
import "@vscode-elements/elements/dist/vscode-textfield/index.js";

// eslint-disable-next-line
interface vscode {
  postMessage(message: Message): void;
}

declare const vscode: vscode;

@customElement("collaboration-view")
export class CollaborationView extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    vscode-single-select {
      width: 100%;
    }
    vscode-option {
      width: 100%;
    }
    vscode-textfield {
      width: 100%;
    }
    vscode-button {
      margin-top: 0.25rem;
    }
  `;

  @query("#action-dropdown")
  actionDropdown!: HTMLSelectElement;

  @query("#server-address-text-field")
  serverAddressTextField!: HTMLInputElement;

  @query("#room-name-text-field")
  roomNameTextField!: HTMLInputElement;

  @query("#password-text-field")
  passwordTextField!: HTMLInputElement;

  @state()
  private currentAction: "create" | "join" = "create";

  protected render(): unknown {
    return html`
      <label for="action-dropdown">Action</label>
      <vscode-single-select
        id="action-dropdown"
        @change=${() => this.selectHandler()}
      >
        <vscode-option value="create">Create Session</vscode-option>
        <vscode-option value="join">Join Session</vscode-option>
      </vscode-single-select>
      <vscode-textfield
        id="server-address-text-field"
        placeholder="ws://localhost:1234"
        >Server</vscode-textfield
      >
      <vscode-textfield id="room-name-text-field" placeholder="my-roomname"
        >Room Name</vscode-textfield
      >
      <vscode-textfield id="password-text-field" type="password"
        >Password</vscode-textfield
      >
      ${this.renderAction()}
    `;
  }

  private selectHandler() {
    if (this.actionDropdown.value === "create") {
      this.currentAction = "create";
    } else if (this.actionDropdown.value === "join") {
      this.currentAction = "join";
    }
  }

  private renderAction() {
    switch (this.currentAction) {
      case "create":
        return this.renderCreateAction();
      case "join":
        return this.renderJoinAction();
    }
  }

  private renderCreateAction() {
    return html`
      <vscode-button @click=${() => this.createSession()}
        >Create Session</vscode-button
      >
    `;
  }

  private renderJoinAction() {
    return html`
      <vscode-button @click=${() => this.joinSession()}
        >Join Session</vscode-button
      >
    `;
  }

  private createSession() {
    vscode.postMessage({
      type: "create",
      value: {
        server: this.serverAddressTextField.value,
        room: this.roomNameTextField.value,
        password: this.passwordTextField.value,
      },
    });
  }

  private joinSession() {
    vscode.postMessage({
      type: "join",
      value: {
        server: this.serverAddressTextField.value,
        room: this.roomNameTextField.value,
        password: this.passwordTextField.value,
      },
    });
  }
}
