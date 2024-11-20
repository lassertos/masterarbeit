function getConfiguration() {
  const URL = process.env.URL;
  if (!URL) {
    throw new Error('Required configuration parameter "URL" is not defined!');
  }

  const API_URL = process.env.API_URL;
  if (!API_URL) {
    throw new Error(
      'Required configuration parameter "API_URL" is not defined!'
    );
  }

  const CODE_EDITOR_URL = process.env.CODE_EDITOR_URL;
  if (!CODE_EDITOR_URL) {
    throw new Error(
      'Required configuration parameter "CODE_EDITOR_URL" is not defined!'
    );
  }

  const COMPILER_URL = process.env.COMPILER_URL;
  if (!COMPILER_URL) {
    throw new Error(
      'Required configuration parameter "COMPILER_URL" is not defined!'
    );
  }

  const DEBUGGER_URL = process.env.DEBUGGER_URL;
  if (!DEBUGGER_URL) {
    throw new Error(
      'Required configuration parameter "DEBUGGER_URL" is not defined!'
    );
  }

  const LANGUAGE_SERVER_URL = process.env.LANGUAGE_SERVER_URL;
  if (!LANGUAGE_SERVER_URL) {
    throw new Error(
      'Required configuration parameter "LANGUAGE_SERVER_URL" is not defined!'
    );
  }

  const SIMULATION_URL = process.env.SIMULATION_URL;
  if (!SIMULATION_URL) {
    throw new Error(
      'Required configuration parameter "SIMULATION_URL" is not defined!'
    );
  }

  const VPSPU_URL = process.env.VPSPU_URL;
  if (!VPSPU_URL) {
    throw new Error(
      'Required configuration parameter "VPSPU_URL" is not defined!'
    );
  }

  const USERNAME = process.env.USERNAME;
  if (!USERNAME) {
    throw new Error(
      'Required configuration parameter "USERNAME" is not defined!'
    );
  }

  const PASSWORD = process.env.PASSWORD;
  if (!PASSWORD) {
    throw new Error(
      'Required configuration parameter "PASSWORD" is not defined!'
    );
  }

  return {
    URL,
    API_URL,
    CODE_EDITOR_URL,
    COMPILER_URL,
    DEBUGGER_URL,
    LANGUAGE_SERVER_URL,
    SIMULATION_URL,
    VPSPU_URL,
    USERNAME,
    PASSWORD,
  };
}

export const configuration = getConfiguration();
