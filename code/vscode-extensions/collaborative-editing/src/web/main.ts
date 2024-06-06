import { css, html, LitElement } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeDropdown,
  vsCodeOption,
  vsCodeTextField,
} from "@vscode/webview-ui-toolkit";
import { Message } from "./messages";

// eslint-disable-next-line
interface vscode {
  postMessage(message: Message): void;
}

declare const vscode: vscode;

provideVSCodeDesignSystem().register(
  vsCodeTextField(),
  vsCodeButton(),
  vsCodeDropdown(),
  vsCodeOption()
);

@customElement("collaboration-view")
export class CollaborationView extends LitElement {
  static styles = css`
    vscode-text-field {
      width: 100%;
    }
    vscode-button {
      width: 100%;
      margin-top: 0.5rem;
    }
    vscode-dropdown {
      width: 100%;
      margin-bottom: 0.5rem;
    }
    vscode-option {
      width: 100%;
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
      <vscode-dropdown
        id="action-dropdown"
        @change=${() => this.selectHandler()}
      >
        <vscode-option value="create">Create Session</vscode-option>
        <vscode-option value="join">Join Session</vscode-option>
      </vscode-dropdown>
      <vscode-text-field
        id="server-address-text-field"
        placeholder="ws://localhost:1234"
        >Server</vscode-text-field
      >
      <vscode-text-field id="room-name-text-field" placeholder="my-roomname"
        >Room Name</vscode-text-field
      >
      <vscode-text-field id="password-text-field" type="password"
        >Password</vscode-text-field
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
