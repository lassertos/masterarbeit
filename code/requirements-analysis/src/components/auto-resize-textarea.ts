import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";

function autoResize(parent: HTMLElement, element: HTMLElement, scroll = true) {
  const scrollTop = parent.scrollTop;
  const oldHeight = parseInt(element.style.height.slice(0, -2));
  const oldScrollHeight = element.scrollHeight;
  element.style.height = "0px";
  element.style.height = `${
    Math.abs(oldScrollHeight - element.scrollHeight) === 1
      ? oldScrollHeight
      : element.scrollHeight
  }px`;
  const newHeight = parseInt(element.style.height.slice(0, -2));
  if (scroll && element.scrollHeight > 0)
    parent.scrollTop = scrollTop + newHeight - oldHeight;
}

function resize(parent: HTMLElement, element: HTMLElement, height: string) {
  const scrollTop = parent.scrollTop;
  const scrollTopMax = (parent as any).scrollTopMax;
  element.style.height = height;
  if (scrollTop === scrollTopMax)
    parent.scrollTop = (parent as any).scrollTopMax;
}

@customElement("rqa-auto-resize-textarea")
export class AutoResizeTextArea extends LitElement {
  static styles = css`
    textarea {
      width: 100%;
      resize: none;
      border-radius: 0.5rem;
      overflow: hidden;
      padding: 0.5rem;
      box-sizing: border-box;
      font-family: "Roboto", sans-serif;
    }
  `;

  @query("textarea")
  textarea!: HTMLTextAreaElement;

  @property({ type: Object })
  parent!: HTMLElement;

  @property({ type: String })
  value = "";

  @property({ type: Boolean })
  editable = true;

  @property({ type: String })
  classes = "";

  resizeObserver: ResizeObserver;

  firstUpdateCompleted = false;

  constructor() {
    super();
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = parseInt(this.textarea.style.height.slice(0, -2));
        autoResize(
          this.parent,
          entry.target as HTMLElement,
          height !== 0 && this.editable
        );
      }
      resize(this.parent, this, this.textarea.style.height);
    });
  }

  protected render(): unknown {
    return html`<textarea
      @input=${this.handleInput}
      class="auto-resize-textarea"
      ?disabled=${!this.editable}
    ></textarea>`;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.resizeObserver.disconnect();
  }

  protected firstUpdated(): void {
    const resizeListener = () => {
      autoResize(this.parent, this.textarea, this.editable);
      resize(this.parent, this, this.textarea.style.height);
    };
    autoResize(this.parent, this.textarea, false);
    resize(this.parent, this, this.textarea.style.height);
    this.textarea.addEventListener("input", resizeListener);
    this.resizeObserver.observe(this.textarea);
  }

  protected updated(): void {
    this.textarea.value = this.value;
    autoResize(
      this.parent,
      this.textarea,
      this.firstUpdateCompleted && this.editable
    );
    resize(this.parent, this, this.textarea.style.height);
    this.firstUpdateCompleted = true;
  }

  protected handleInput() {
    this.value = this.textarea.value;
    const updatePropertyEvent = new CustomEvent<string>("update-value", {
      detail: this.textarea.value,
    });
    this.dispatchEvent(updatePropertyEvent);
  }
}
