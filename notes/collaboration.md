# Collaboration

For the prototypical implementation of a collaboration service yjs was chosen. With this library the following should be implemented:

- Devices should be able to announce the rooms they are joining along with the schema of the data which they expect inside this room.
- Each device should have an associated status object per room which it shares with other connected devices inside the same room.
- If the status information of a device is older than a predefined amount of time (e.g. 30s) it should be deleted / considered invalid.

Lets assume we have an experiment consisting of the devices _Code Editor 1_ and _Code Editor 2_ and we want them to be able to share their different projects between each other. A possible experiment configuration for this could be:

```json
{
  "devices": [
    {
      "device": "https://api.example.com/devices/code-editor-1",
      "role": "code-editor-1"
    },
    {
      "device": "https://api.example.com/devices/code-editor-2",
      "role": "code-editor-2"
    }
  ],
  "roles": [
    {
      "name": "code-editor-1",
      "configuration": {}
    },
    {
      "name": "code-editor-2",
      "configuration": {}
    }
  ],
  "serviceConfigurations": [
    {
      "serviceType": "https://api.example.com/serviceTypes/collaboration",
      "configuration": {
        "rooms": ["projects"]
      },
      "participants": [
        {
          "role": "code-editor-1",
          "serviceId": "collaboration",
          "config": {}
        },
        {
          "role": "code-editor-2",
          "serviceId": "collaboration",
          "config": {}
        }
      ]
    }
  ]
}
```

A possible Schema for the room projects could look like this:

```json
{
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "additionalProperties": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "const": "directory"
        },
        "content": {
          "type": "object",
          "additionalProperties": {
            "type": "object",
            "anyOf": [
              {
                "properties": {
                  "type": {
                    "type": "string",
                    "const": "file"
                  },
                  "content": {
                    "type": "string"
                  }
                },
                "required": ["type", "content"]
              },
              {
                "$ref": "#/additionalProperties/additionalProperties"
              }
            ]
          }
        }
      },
      "required": ["type", "content"]
    }
  }
}
```

Which is equivalent to the following TypeScript type `ProjectRoom`:

```typescript
type ProjectRoom = {
  [participantId: string]: {
    [projectName: string]: {
      type: "directory";
      content: {
        [entryName: string]:
          | {
              type: "file";
              content: string;
            }
          | ProjectRoom[string][string];
      };
    };
  };
};
```

In this scenario each participant will generate a unique id which it will use to share its projects with the other participants. This could allow for the following:

- Users may choose which projects they want to share with the other participants
- One could implement a system which only allows some devices to take specific actions on the shared resources (e.g. only the owner may add / remove projects)

The schemas expected for a certain room should be part of the device information as it could be used to make sure that an experiment configuration is possible.

If we added another code editor into the experiment the configuration would need to be updated accordingly. For this a new role would need to be created and new service configurations would need to be added for each pairwise combination of code editors inside the experiment.

## Initialization

When a connection between two devices is established both receive the names of the rooms to be created. The service should provide a default value for each of the rooms which should be conform with the schema for the room. These default values could be provided to the service via the constructor or a corresponding setter. Afterwards the devices will wait until the connection has been established. Then they will start to synchronize their documents. This is done in three steps:

- Step 1: Send local state vector to the peer
- Step 2: Calculate differences between the local state and the state of the peer and respond with these
- Step 3: Apply received differences and send done message

After these three steps the two participants should be synchronized. When a device updates a shared resource a corresponding message needs to be sent to all other participants.

## Visual Studio Code Integration

We want to allow users to choose which projects they would like to share. These projects should then be added to the document of the projects room. If the user unshares them they should be removed. If a filesystem event occurs within the shared projects the corresponding change has to be incorporated into the shared version of the project. The shared version of a projects consists of many nested shared types. The following typescript type shows how the document is structured:

```typescript
type ProjectDocument = {
  value: Y.Map<{
    [projectName: string]: Y.Map<{
      type: Y.Text;
      content: Y.Map<{
        [entryName: string]:
          | Y.Map<{
              type: Y.Text;
              content: Y.Text;
            }>
          | ProjectDocument["value"][string];
      }>;
    }>;
  }>;
};
```

So if the user deletes / created a file / folder the corresponding entry has to be removed / created inside the shared type. This can be done by listening to the filesystem events thrown inside of a shared project and updating the shared resource accordingly. If a shared project is deleted by its owner it needs to be removed from the shared projects. Furthermore if the shared resource is updated the corresponding changes need to be made inside the filesystem of vscode. This can be done by observing the above described value deep from the root. This way all events of the root and its children are emitted and can be used to apply the changes locally.

Besides updating the filesystem there is also the possibility of making simultaneous changes inside of a file. If a user opens a shared file a corresponding binding needs to be created which will listen for any changes made by either the user or another participant on this shared file. If a change occurs locally the corresponding update should be sent to all participants. If a remote change is received the contents of the file should be updated accordingly. Furthermore awareness information should be shared between the participants to allow all participants to see where the others are working currently.

Another kind of information to be shared between participants is status information. For this it would either be possible to attach it to the projects room or to create a new status room. This status information could be extended by other extensions. E.g. the compilation extension could add a status `isCompiling`. If a user starts a compilation this would be set to true and the other participants would be notified of this change. Using this information the vscode instance of the other participants could change their compilation icon to a disabled state while another compilation is currently running. Or in the case of a debugging session the code editor could allow them to join the current debugging session. Since this status information would be sent via awareness states it has a timeout of 30s so if a client disconnects it would still be possible to recover a usable experiment state.
