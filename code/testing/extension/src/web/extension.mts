import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "crosslab-testing-extension" is now active in the web extension host!'
  );

  const testController = vscode.tests.createTestController(
    "crosslab-tests",
    "CrossLab Tests"
  );

  const firstTestItem = testController.createTestItem(
    "crosslab-test-1",
    "First Test"
  );
  const secondTestItem = testController.createTestItem(
    "crosslab-test-2",
    "Second Test"
  );

  testController.items.add(firstTestItem);
  testController.items.add(secondTestItem);

  const runProfile = testController.createRunProfile(
    "Run",
    vscode.TestRunProfileKind.Run,
    (request, token) => {
      // TODO
      const testRun = testController.createTestRun(request);
      const queue: vscode.TestItem[] = [];

      // Loop through all included tests, or all known tests, and add them to our queue
      if (request.include) {
        request.include.forEach((test) => queue.push(test));
      } else {
        testController.items.forEach((test) => queue.push(test));
      }

      // For every test that was queued, try to run it. Call run.passed() or run.failed().
      // The `TestMessage` can contain extra information, like a failing location or
      // a diff output. But here we'll just give it a textual message.
      while (queue.length > 0 && !token.isCancellationRequested) {
        const test = queue.pop()!;

        const start = Date.now();

        // Skip tests the user asked to exclude
        if (request.exclude?.includes(test)) {
          continue;
        }

        testRun.passed(test, Date.now() - start);

        test.children.forEach((test) => queue.push(test));
      }

      // Make sure to end the run after all tests have been executed:
      testRun.end();
    }
  );

  const debugRunProfile = testController.createRunProfile(
    "Debug",
    vscode.TestRunProfileKind.Debug,
    (request, token) => {
      // TODO
      const testRun = testController.createTestRun(request);
      const queue: vscode.TestItem[] = [];

      // Loop through all included tests, or all known tests, and add them to our queue
      if (request.include) {
        request.include.forEach((test) => queue.push(test));
      } else {
        testController.items.forEach((test) => queue.push(test));
      }

      // For every test that was queued, try to run it. Call run.passed() or run.failed().
      // The `TestMessage` can contain extra information, like a failing location or
      // a diff output. But here we'll just give it a textual message.
      while (queue.length > 0 && !token.isCancellationRequested) {
        const test = queue.pop()!;

        const start = Date.now();

        // Skip tests the user asked to exclude
        if (request.exclude?.includes(test)) {
          continue;
        }

        testRun.passed(test, Date.now() - start);

        test.children.forEach((test) => queue.push(test));
      }

      // Make sure to end the run after all tests have been executed:
      testRun.end();
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
}

export function deactivate() {}
