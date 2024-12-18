import { CollaborationServiceProsumer } from "@crosslab-ide/crosslab-collaboration-service";
import {
  isTest,
  TestingServiceConsumer,
  TestWithId,
} from "@crosslab-ide/crosslab-testing-service";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import * as vscode from "vscode";

export async function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "crosslab-testing-extension" is now active in the web extension host!'
  );

  // check for collaboration extension
  const collaborationExtension = vscode.extensions.all.find(
    (extension) =>
      extension.id === "crosslab.@crosslab-ide/crosslab-collaboration-extension"
  );
  const collaborationApi = collaborationExtension?.isActive
    ? collaborationExtension?.exports
    : await collaborationExtension?.activate();
  const collaborationServiceProsumer = collaborationApi?.getProsumer() as
    | CollaborationServiceProsumer
    | undefined;
  if (!collaborationServiceProsumer?.hasRoom("status")) {
    collaborationServiceProsumer?.createRoom("status", "yjs");
  }
  const awareness = collaborationServiceProsumer?.getAwareness("status");
  awareness?.setLocalState({
    ...awareness.getLocalState(),
    isTesting: false,
  });

  const testController = vscode.tests.createTestController(
    "crosslab-tests",
    "CrossLab Tests"
  );

  function canRunTests() {
    const states = awareness?.getStates();
    let canRunTests = true;
    for (const [_id, state] of states ?? []) {
      canRunTests &&= !state.isDebugging;
      canRunTests &&= !state.isCompiling;
      canRunTests &&= !state.isTesting;
    }
    return canRunTests;
  }

  awareness?.on("change", async (_changes, origin) => {
    console.log(
      "status-update (testing):",
      _changes,
      origin,
      Array.from(awareness.getStates().entries())
    );
    if (origin === "local") {
      return;
    }

    await vscode.commands.executeCommand(
      "setContext",
      "crosslab.isTesting",
      !canRunTests()
    );
  });

  const testingServiceConsumer = new TestingServiceConsumer(
    "testing-extension:testing"
  );

  function parseTest(test: TestWithId): vscode.TestItem {
    console.log("parsing test:", test);
    const testItem = testController.createTestItem(test.id, test.name);
    testController.items.add(testItem);

    for (const child of test.children ?? []) {
      testItem.children.add(parseTest(child));
    }

    console.log("parsed test successfully:", test);
    return testItem;
  }

  testingServiceConsumer.on("new-test", parseTest);

  testController.createRunProfile(
    "Run",
    vscode.TestRunProfileKind.Run,
    async (request, token) => {
      if (!canRunTests()) {
        const testRun = testController.createTestRun(request);
        testRun.appendOutput(
          "Cannot start test-run while compiling, debugging or testing!"
        );
        testRun.end();
        return;
      }
      awareness?.setLocalStateField("isTesting", true);
      await vscode.commands.executeCommand(
        "setContext",
        "crosslab.isTesting",
        true
      );
      await testingServiceConsumer.startTesting();
      const testRun = testController.createTestRun(request);
      testRun.token.onCancellationRequested(async () => {
        testRun.end();
        await testingServiceConsumer.endTesting();
        await vscode.commands.executeCommand(
          "setContext",
          "crosslab.isTesting",
          false
        );
        awareness?.setLocalStateField("isTesting", false);
      });
      const queue: vscode.TestItem[] = [];

      if (request.include) {
        request.include.forEach((test) => queue.push(test));
      } else {
        testController.items.forEach((test) => queue.push(test));
      }

      while (queue.length > 0 && !token.isCancellationRequested) {
        const test = queue.pop()!;

        if (request.exclude?.includes(test)) {
          continue;
        }

        const start = Date.now();
        const result = await testingServiceConsumer.runTest(test.id);
        const duration = Date.now() - start;

        if (result.success) {
          testRun.passed(test, duration);
        } else {
          testRun.failed(
            test,
            new vscode.TestMessage(result.message),
            duration
          );
        }

        test.children.forEach((test) => queue.push(test));
      }

      testRun.end();
      await testingServiceConsumer.endTesting();
      await vscode.commands.executeCommand(
        "setContext",
        "crosslab.isTesting",
        false
      );
      awareness?.setLocalStateField("isTesting", false);
    }
  );

  return {
    addServices(deviceHandler: DeviceHandler) {
      console.log("adding testing service!");
      deviceHandler.addService(testingServiceConsumer);
      deviceHandler.once("configuration", (configuration) => {
        console.log("attempting to read tests from device configuration!");
        console.log("configuration:", configuration);

        console.log(
          `checking if device configuration contains property "tests"`
        );
        if (!("tests" in configuration)) {
          return;
        }

        console.log(
          `checking if property "tests" of device configuration is an array`
        );
        if (!Array.isArray(configuration.tests)) {
          console.error(
            `Property "tests" of device configuration is not an array!`
          );
          return;
        }

        console.log(
          `checking if property "tests" of device configuration only contains items of type Test`
        );
        if (configuration.tests.some((test) => !isTest(test))) {
          console.error(
            `Property "tests" of device configuration contains invalid items!`
          );
          return;
        }

        console.log("parsing tests");
        for (const test of configuration.tests) {
          const testWithId = testingServiceConsumer.addTest(test);
          parseTest(testWithId);
        }
        console.log("successfully read tests from device configuration!");
      });
      console.log("successfully added testing service!");
    },
  };
}

export function deactivate() {}
