import {
  isTest,
  TestingServiceConsumer,
  testSchema,
  TestWithId,
} from "@crosslab-ide/crosslab-testing-service";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "crosslab-testing-extension" is now active in the web extension host!'
  );

  const testController = vscode.tests.createTestController(
    "crosslab-tests",
    "CrossLab Tests"
  );

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
      testingServiceConsumer.startTesting();
      const testRun = testController.createTestRun(request);
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
      testingServiceConsumer.endTesting();
    }
  );

  const disposable = vscode.commands.registerCommand(
    "crosslab-testing-extension.helloWorld",
    () => {
      vscode.window.showInformationMessage(
        "Hello World from crosslab-testing-extension in a web extension host!"
      );
    }
  );

  context.subscriptions.push(disposable);

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
