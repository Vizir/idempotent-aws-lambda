/* eslint-disable sonarjs/no-duplicate-string */
import faker from "faker";
import nock from "nock";
import { idempotencyHttpWrapper, Providers } from "../src";

describe("idempotency-http-wrapper", () => {
  const mockNow = Date.now();

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(mockNow);
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe("dynamoDB", () => {
    it("Should extract the ID from request ID", async () => {
      // Given
      const endpoint = faker.internet.url();
      const requestId = faker.random.uuid();
      const result = { word: faker.random.word() };
      const internalHandler = jest.fn().mockReturnValue(result);
      const ttl = faker.random.number();
      const tableName = faker.random.word();
      const handler = idempotencyHttpWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint,
          name: Providers.DynamoDB,
        },
        ttl,
        id: {
          from: "requestId",
        },
      });
      const expectedTtl = String(Math.floor(mockNow / 1000) + ttl);
      const expectedValidTime = String(Math.floor(mockNow / 1000) - ttl);
      nock(endpoint)
        .post("/", {
          ConditionExpression:
            "attribute_not_exists(messageId) or (#ttl < :validTime)",
          ExpressionAttributeNames: {
            "#ttl": "ttl",
          },
          ExpressionAttributeValues: {
            ":validTime": { N: expectedValidTime },
          },
          Item: { messageId: { S: requestId }, ttl: { N: expectedTtl } },
          TableName: tableName,
        })
        .reply(200);
      nock(endpoint)
        .post("/", {
          Item: {
            messageId: { S: requestId },
            ttl: { N: expectedTtl },
            result: {
              M: { word: { S: result.word } },
            },
          },
          TableName: tableName,
        })
        .reply(200);
      const event = { requestContext: { requestId } };
      const context = {};

      // When
      await handler(event, context);

      // Then
      expect(internalHandler).toHaveBeenCalled();
    });

    it("Should extract the ID from header request", async () => {
      // Given
      const endpoint = faker.internet.url();
      const requestId = faker.random.uuid();
      const result = { word: faker.random.word() };
      const internalHandler = jest.fn().mockReturnValue(result);
      const ttl = faker.random.number();
      const tableName = faker.random.word();
      const handler = idempotencyHttpWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint,
          name: Providers.DynamoDB,
        },
        ttl,
        id: {
          from: "header",
          name: "requestId",
        },
      });
      const expectedTtl = String(Math.floor(mockNow / 1000) + ttl);
      const expectedValidTime = String(Math.floor(mockNow / 1000) - ttl);
      nock(endpoint)
        .post("/", {
          ConditionExpression:
            "attribute_not_exists(messageId) or (#ttl < :validTime)",
          ExpressionAttributeNames: {
            "#ttl": "ttl",
          },
          ExpressionAttributeValues: {
            ":validTime": { N: expectedValidTime },
          },
          Item: { messageId: { S: requestId }, ttl: { N: expectedTtl } },
          TableName: tableName,
        })
        .reply(200);
      nock(endpoint)
        .post("/", {
          Item: {
            messageId: { S: requestId },
            ttl: { N: expectedTtl },
            result: {
              M: { word: { S: result.word } },
            },
          },
          TableName: tableName,
        })
        .reply(200);
      const event = { headers: { requestId }, requestContext: {} };
      const context = {};

      // When
      await handler(event, context);

      // Then
      expect(internalHandler).toHaveBeenCalled();
    });

    it("Should ignore the idempotency when the header is empty and fallback is disabled", async () => {
      // Given
      const endpoint = faker.internet.url();
      const result = { word: faker.random.word() };
      const internalHandler = jest.fn().mockReturnValue(result);
      const ttl = faker.random.number();
      const tableName = faker.random.word();
      const handler = idempotencyHttpWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint,
          name: Providers.DynamoDB,
        },
        ttl,
        id: {
          from: "header",
          name: "requestId",
        },
      });
      const event = { headers: {}, requestContext: {} };
      const context = {};

      // When
      await handler(event, context);

      // Then
      expect(internalHandler).toHaveBeenCalled();
    });

    it("Should apply the default TTL", async () => {
      // Given
      const endpoint = faker.internet.url();
      const requestId = faker.random.uuid();
      const result = { word: faker.random.word() };
      const internalHandler = jest.fn().mockReturnValue(result);
      const defaultTTL = 5;
      const tableName = faker.random.word();
      const handler = idempotencyHttpWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint,
          name: Providers.DynamoDB,
        },
        id: {
          from: "requestId",
        },
      });
      const expectedTtl = String(Math.floor(mockNow / 1000) + defaultTTL);
      const expectedValidTime = String(Math.floor(mockNow / 1000) - defaultTTL);
      nock(endpoint)
        .post("/", {
          ConditionExpression:
            "attribute_not_exists(messageId) or (#ttl < :validTime)",
          ExpressionAttributeNames: {
            "#ttl": "ttl",
          },
          ExpressionAttributeValues: {
            ":validTime": { N: expectedValidTime },
          },
          Item: { messageId: { S: requestId }, ttl: { N: expectedTtl } },
          TableName: tableName,
        })
        .reply(200);
      nock(endpoint)
        .post("/", {
          Item: {
            messageId: { S: requestId },
            ttl: { N: expectedTtl },
            result: {
              M: { word: { S: result.word } },
            },
          },
          TableName: tableName,
        })
        .reply(200);
      const event = { requestContext: { requestId } };
      const context = {};

      // When
      await handler(event, context);

      // Then
      expect(internalHandler).toHaveBeenCalled();
    });

    it("Should ignore the request when already called using the request id", async () => {
      // Given
      const endpoint = faker.internet.url();
      const requestId = faker.random.uuid();
      const internalHandler = jest.fn();
      const ttl = faker.random.number();
      const tableName = faker.random.word();
      const handler = idempotencyHttpWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint,
          name: Providers.DynamoDB,
        },
        ttl,
        id: {
          from: "requestId",
        },
      });
      const expectedTtl = String(Math.floor(mockNow / 1000) + ttl);
      const expectedValidTime = String(Math.floor(mockNow / 1000) - ttl);
      nock(endpoint)
        .post("/", {
          ConditionExpression:
            "attribute_not_exists(messageId) or (#ttl < :validTime)",
          ExpressionAttributeNames: {
            "#ttl": "ttl",
          },
          ExpressionAttributeValues: {
            ":validTime": { N: expectedValidTime },
          },
          Item: { messageId: { S: requestId }, ttl: { N: expectedTtl } },
          TableName: tableName,
        })
        .reply(400, undefined, {
          "x-amzn-errortype": "ConditionalCheckFailedException",
        });
      nock(endpoint)
        .post("/", {
          Key: { messageId: { S: requestId } },
          TableName: tableName,
        })
        .reply(200);
      const event = { requestContext: { requestId } };
      const context = {};
      // When
      await handler(event, context);

      // Then
      expect(internalHandler).not.toHaveBeenCalled();
    });

    it("Should ignore the request when already called using the header id", async () => {
      // Given
      const endpoint = faker.internet.url();
      const requestId = faker.random.uuid();
      const internalHandler = jest.fn();
      const ttl = faker.random.number();
      const tableName = faker.random.word();
      const handler = idempotencyHttpWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint,
          name: Providers.DynamoDB,
        },
        ttl,
        id: {
          from: "header",
          name: "requestId",
        },
      });
      const expectedTtl = String(Math.floor(mockNow / 1000) + ttl);
      const expectedValidTime = String(Math.floor(mockNow / 1000) - ttl);
      nock(endpoint)
        .post("/", {
          ConditionExpression:
            "attribute_not_exists(messageId) or (#ttl < :validTime)",
          ExpressionAttributeNames: {
            "#ttl": "ttl",
          },
          ExpressionAttributeValues: {
            ":validTime": { N: expectedValidTime },
          },
          Item: { messageId: { S: requestId }, ttl: { N: expectedTtl } },
          TableName: tableName,
        })
        .reply(400, undefined, {
          "x-amzn-errortype": "ConditionalCheckFailedException",
        });
      nock(endpoint)
        .post("/", {
          Key: { messageId: { S: requestId } },
          TableName: tableName,
        })
        .reply(200);
      const event = { headers: { requestId }, requestContext: {} };
      const context = {};
      // When
      await handler(event, context);

      // Then
      expect(internalHandler).not.toHaveBeenCalled();
    });

    it("Should ignore the request when already called using the header id with fallback enabled", async () => {
      // Given
      const endpoint = faker.internet.url();
      const requestId = faker.random.uuid();
      const internalHandler = jest.fn();
      const ttl = faker.random.number();
      const tableName = faker.random.word();
      const handler = idempotencyHttpWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint,
          name: Providers.DynamoDB,
        },
        ttl,
        id: {
          from: "header",
          name: "requestId",
          fallback: true,
        },
      });
      const expectedTtl = String(Math.floor(mockNow / 1000) + ttl);
      const expectedValidTime = String(Math.floor(mockNow / 1000) - ttl);
      nock(endpoint)
        .post("/", {
          ConditionExpression:
            "attribute_not_exists(messageId) or (#ttl < :validTime)",
          ExpressionAttributeNames: {
            "#ttl": "ttl",
          },
          ExpressionAttributeValues: {
            ":validTime": { N: expectedValidTime },
          },
          Item: { messageId: { S: requestId }, ttl: { N: expectedTtl } },
          TableName: tableName,
        })
        .reply(400, undefined, {
          "x-amzn-errortype": "ConditionalCheckFailedException",
        });
      nock(endpoint)
        .post("/", {
          Key: { messageId: { S: requestId } },
          TableName: tableName,
        })
        .reply(200);
      const event = { headers: {}, requestContext: { requestId } };
      const context = {};
      // When
      await handler(event, context);

      // Then
      expect(internalHandler).not.toHaveBeenCalled();
    });
  });
});
