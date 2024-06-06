type CreateMessage = {
  type: "create";
  value: {
    server: string;
    room: string;
    password: string;
  };
};

type JoinMessage = {
  type: "join";
  value: {
    server: string;
    room: string;
    password: string;
  };
};

export type Message = CreateMessage | JoinMessage;
