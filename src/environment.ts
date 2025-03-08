import { EnvironmentVariables } from "./types";

export const getFromEnvironmentOrFail = (env: any, envVarName: EnvironmentVariables): string => {
    const lookedUpValue = env[envVarName];
    if (typeof lookedUpValue === "string" && lookedUpValue !== "") {
        return lookedUpValue;
    } else {
        throw new Error(`missing or empty environment variable: ${envVarName}`);
    }
}

export const getFromEnvironmentOrDefault = (env: any, envVarName: EnvironmentVariables, defaultValue: string): string => {
    const lookedUpValue = env[envVarName];
    if (typeof lookedUpValue === "string" && lookedUpValue !== "") {
        return lookedUpValue;
    } else {
        return defaultValue
    }
}
