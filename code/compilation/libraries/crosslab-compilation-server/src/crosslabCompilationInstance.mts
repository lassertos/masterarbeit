import { AbstractCompilationInstance } from "abstract-compilation-server";
import { CompilationProtocol } from "compilation-protocol";
import { ProtocolMessage } from "messaging-channels";

export abstract class CrosslabCompilationInstance extends AbstractCompilationInstance {
  handleCompilationRequest(
    compilationRequest: ProtocolMessage<
      CompilationProtocol,
      "compilation:request"
    >
  ): ProtocolMessage<CompilationProtocol, "compilation:response"> {
    return {
      type: "compilation:response",
      content: {
        success: false,
        message: "",
      },
    };
  }
}
