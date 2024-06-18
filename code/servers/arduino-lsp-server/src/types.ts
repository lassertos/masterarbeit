export type Message = DataMessage | FileEventMessage;

export type DataMessage = {
  type: "data";
  data: string;
};

export type FileEventMessage =
  | {
      type: "file-event";
      event: "create" | "delete";
      path: string;
    }
  | {
      type: "file-event";
      event: "change";
      path: string;
      content: Uint8Array;
    };
