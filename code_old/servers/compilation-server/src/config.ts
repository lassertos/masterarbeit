import * as dotenv from "dotenv";
dotenv.config();

function die(reason: string): never {
    throw new Error(reason);
}

export const config = {
    PORT: process.env["PORT"] ?? die("environment variable PORT not defined!"),
    WEBSOCKET_ENDPOINT:
        process.env["WEBSOCKET_ENDPOINT"] ??
        die("environment variable WEBSOCKET_ENDPOINT not defined!"),
    API_ENDPOINT:
        process.env["API_ENDPOINT"] ??
        die("environment variable API_ENDPOINT not defined!"),
    CLOUD_INSTANTIABLE_DEVICE_URL:
        process.env["CLOUD_INSTANTIABLE_DEVICE_URL"] ??
        die("environment variable CLOUD_INSTANTIABLE_DEVICE_URL not defined!"),
};
