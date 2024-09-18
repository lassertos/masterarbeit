import { MessageChannel } from "./messageChannel";
import internal from "stream";

export class StdioMessageChannel extends MessageChannel {
  private _stdin: internal.Writable;
  private _stdout: internal.Readable;

  constructor(stdio: { in: internal.Writable; out: internal.Readable }) {
    super();

    this._stdin = stdio.in;
    this._stdout = stdio.out;

    this.emit("ready");

    this._stdout.on("close", () => {
      this.emit("close");
    });

    this._stdin.on("close", () => {
      this.emit("close");
    });

    this._stdout.on("data", (data) => {
      this.emit("message", data.toString());
    });
  }

  send(message: string): void {
    if (this._stdin.writable) this._stdin.write(message);
  }
}
