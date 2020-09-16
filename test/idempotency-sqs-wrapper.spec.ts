/* eslint-disable sonarjs/no-duplicate-string */
import faker from "faker";
import nock from "nock";
import { idempotencySQSWrapper, Providers } from "../src";

describe("idempotency-sqs-wrapper", () => {
  const mockNow = Date.now();

  beforeEach(() => {
    // @ts-ignore
    jest.spyOn(Date, "now").mockReturnValue(mockNow);
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe("dynamoDB", () => {
    it("Should pass all the records if they aren't executed yet", async () => {
      // Given
      const endpointDynamo = faker.internet.url();
      const endpointSQS = faker.internet.url();
      const messageId = faker.random.uuid();
      const internalHandler = jest.fn();
      const ttl = faker.random.number();
      const tableName = faker.random.word();
      const handler = idempotencySQSWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint: endpointDynamo,
          name: Providers.DynamoDB,
        },
        queue: {
          url: endpointSQS,
          region: faker.random.word(),
        },
        ttl,
      });
      const expectedTtl = String(Math.floor(mockNow / 1000) + ttl);
      const expectedValidTime = String(Math.floor(mockNow / 1000) - ttl);
      nock(endpointDynamo)
        .post("/", {
          ConditionExpression:
            "attribute_not_exists(messageId) or (#ttl < :validTime)",
          ExpressionAttributeNames: {
            "#ttl": "ttl",
          },
          ExpressionAttributeValues: {
            ":validTime": { N: expectedValidTime },
          },
          Item: { messageId: { S: messageId }, ttl: { N: expectedTtl } },
          TableName: tableName,
        })
        .reply(200);
      const event = { Records: [{ messageId }] };
      const context = {};

      // When
      await handler(event, context);

      // Then
      expect(internalHandler).toHaveBeenCalledWith(event, context);
    });

    it("Should filter the record if they already executed", async () => {
      // Given
      const endpointDynamo = faker.internet.url();
      const endpointSQS = faker.internet.url();
      const messageId = faker.random.uuid();
      const receiptHandle = faker.random.uuid();
      const internalHandler = jest.fn();
      const ttl = faker.random.number();
      const tableName = faker.random.word();
      const handler = idempotencySQSWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint: endpointDynamo,
          name: Providers.DynamoDB,
        },
        queue: {
          url: endpointSQS,
          region: faker.random.word(),
        },
        ttl,
      });
      const expectedTtl = String(Math.floor(mockNow / 1000) + ttl);
      const expectedValidTime = String(Math.floor(mockNow / 1000) - ttl);
      nock(endpointDynamo)
        .post("/", {
          ConditionExpression:
            "attribute_not_exists(messageId) or (#ttl < :validTime)",
          ExpressionAttributeNames: {
            "#ttl": "ttl",
          },
          ExpressionAttributeValues: {
            ":validTime": { N: expectedValidTime },
          },
          Item: { messageId: { S: messageId }, ttl: { N: expectedTtl } },
          TableName: tableName,
        })
        .reply(400, undefined, {
          "x-amzn-errortype": "ConditionalCheckFailedException",
        });
      nock(endpointSQS).post("/").reply(200);
      const event = { Records: [{ messageId, receiptHandle }] };
      const expectedEvent = { Records: [] };
      const context = {};

      // When
      await handler(event, context);

      // Then
      expect(internalHandler).toHaveBeenCalledWith(expectedEvent, context);
    });

    it("Should apply the default TTL", async () => {
      // Given
      const endpointDynamo = faker.internet.url();
      const endpointSQS = faker.internet.url();
      const messageId = faker.random.uuid();
      const internalHandler = jest.fn();
      const defaultTTL = 5;
      const tableName = faker.random.word();
      const handler = idempotencySQSWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint: endpointDynamo,
          name: Providers.DynamoDB,
        },
        queue: {
          url: endpointSQS,
          region: faker.random.word(),
        },
      });
      const expectedTtl = String(Math.floor(mockNow / 1000) + defaultTTL);
      const expectedValidTime = String(Math.floor(mockNow / 1000) - defaultTTL);
      nock(endpointDynamo)
        .post("/", {
          ConditionExpression:
            "attribute_not_exists(messageId) or (#ttl < :validTime)",
          ExpressionAttributeNames: {
            "#ttl": "ttl",
          },
          ExpressionAttributeValues: {
            ":validTime": { N: expectedValidTime },
          },
          Item: { messageId: { S: messageId }, ttl: { N: expectedTtl } },
          TableName: tableName,
        })
        .reply(200);
      const event = { Records: [{ messageId }] };
      const context = {};

      // When
      await handler(event, context);

      // Then
      expect(internalHandler).toHaveBeenCalledWith(event, context);
    });
  });
});
