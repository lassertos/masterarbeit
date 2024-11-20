# Testing

Creators of experiments should be able to add test cases for an experiment. These test cases could be used to determine if the user has completed the experiment successfully. Since the testing of certain processes may require the interaction of multiple devices and their corresponding services the testing service should support this interaction.

## Testing Services

### Producer

A testing service producer exposes functions which can be used by a testing service consumer to compose test cases. Each producer must have a unique identifier such that the consumer can access the functions of each producer without causing a conflict. The available functions should also be made available in the service description to allow experiment creators to develop test cases and embed them into an experiment at creation time. A testing service producer should also implement handlers for starting and ending testing. These could change the internal behaviour for the duration of the test.

```typescript
interface TestingServiceProducer {
  functions: TestFunction[];
  startTesting(): () => void;
  endTesting(): () => void;
}
```

### Consumer
