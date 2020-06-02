import { idempotencyHttpWrapper, idempotencySQSWrapper } from "../..";
import { Providers } from "../../src";

const region = process.env.region as string;
const tableName = process.env.TABLE_NAME as string;
const queueUrl = process.env.QUEUE_URL as string;

export const httpHandlerRequestId = idempotencyHttpWrapper({
  handler: async (event: object, context: object) => {
    console.log("Processing message", event, context);
    return "OK";
  },
  provider: {
    endpoint: process.env.ENDPOINT,
    name: Providers.DynamoDB,
    region,
    tableName,
  },
  ttl: 5,
  id: {
    from: "requestId",
  },
});

export const httpHandlerHeader = idempotencyHttpWrapper({
  handler: async (event: object, context: object) => {
    console.log("Processing message", event, context);
    return "OK";
  },
  provider: {
    endpoint: process.env.ENDPOINT,
    name: Providers.DynamoDB,
    region,
    tableName,
  },
  ttl: 5,
  id: {
    from: "header",
    name: "myIdempotencyKey",
    fallback: true,
  },
});

export const sqsHandler = idempotencySQSWrapper({
  handler: async (event: object, context: object) => {
    console.log("Processing message", event, context);
    return "OK";
  },
  provider: {
    endpoint: process.env.ENDPOINT,
    name: Providers.DynamoDB,
    region,
    tableName,
  },
  queue: {
    region,
    url: queueUrl,
  },
  ttl: 5,
});
