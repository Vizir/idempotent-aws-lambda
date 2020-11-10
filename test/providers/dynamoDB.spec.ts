import faker from "faker";
import nock from "nock";
import { DynamoDB } from "../../src/providers/dynamoDB";

describe("DynamoDB", () => {
  const mockNow = Date.now();

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(mockNow);
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe("fetch", () => {
    it("Should return the item when exists", async () => {
      // Given
      const endpoint: string = faker.internet.url();
      const word: string = faker.random.word();
      nock(endpoint)
        .post("/")
        .reply(200, {
          Item: {
            result: {
              M: {
                word: {
                  S: word,
                },
              },
            },
          },
        });
      const dynamoDB = new DynamoDB({
        endpoint,
        region: faker.random.word(),
        ttl: faker.random.number(),
        tableName: faker.random.word(),
      });
      const messageId = faker.random.uuid();
      const expectedResult = { word };

      // When
      const result: any = await dynamoDB.fetch(messageId);

      // Then
      expect(result).toStrictEqual(expectedResult);
    });

    it("Should return undefined when the item doesn't exist", async () => {
      // Given
      const endpoint: string = faker.internet.url();
      nock(endpoint).post("/").reply(200);
      const dynamoDB = new DynamoDB({
        endpoint,
        region: faker.random.word(),
        ttl: faker.random.number(),
        tableName: faker.random.word(),
      });
      const messageId = faker.random.uuid();

      // When
      const result = await dynamoDB.fetch(messageId);

      // Then
      expect(result).toBeUndefined();
    });
  });

  describe("isProcessing", () => {
    it("Should return false when the message isn't processing", async () => {
      // Given
      const endpoint: string = faker.internet.url();
      nock(endpoint).post("/").reply(200);
      const dynamoDB = new DynamoDB({
        endpoint,
        region: faker.random.word(),
        ttl: faker.random.number(),
        tableName: faker.random.word(),
      });
      const messageId = faker.random.uuid();

      // When
      const result = await dynamoDB.isProcessing(messageId);

      // Then
      expect(result).toBeFalsy();
    });

    it("Should return true when the message is processing", async () => {
      // Given
      const endpoint: string = faker.internet.url();
      nock(endpoint).post("/").reply(400, undefined, {
        "x-amzn-errortype": "ConditionalCheckFailedException",
      });
      const dynamoDB = new DynamoDB({
        endpoint,
        region: faker.random.word(),
        ttl: faker.random.number(),
        tableName: faker.random.word(),
      });
      const messageId = faker.random.uuid();

      // When
      const result = await dynamoDB.isProcessing(messageId);

      // Then
      expect(result).toBeTruthy();
    });

    it("Should thrown an error when some internal error happen", async (): Promise<
      void
    > => {
      // Given
      const endpoint: string = faker.internet.url();
      nock(endpoint).post("/").reply(400, undefined, {
        "x-amzn-errortype": "Other error",
      });
      const dynamoDB = new DynamoDB({
        endpoint,
        region: faker.random.word(),
        ttl: faker.random.number(),
        tableName: faker.random.word(),
      });
      const messageId = faker.random.uuid();

      // When
      const promise = dynamoDB.isProcessing(messageId);

      // Then
      return expect(promise).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("Should update the item with successfully", async (): Promise<void> => {
      // Given
      const endpoint: string = faker.internet.url();
      const messageId = faker.random.uuid();
      const ttl = faker.random.number();
      const creationTime = Math.floor(Date.now() / 1000);
      const word = faker.random.word();
      const tableName = faker.random.word();
      nock(endpoint)
        .post("/", {
          Item: {
            messageId: {
              S: messageId,
            },
            ttl: {
              N: String(creationTime + ttl),
            },
            result: {
              M: {
                word: {
                  S: word,
                },
              },
            },
          },
          TableName: tableName,
        })
        .reply(200);
      const dynamoDB = new DynamoDB({
        endpoint,
        region: faker.random.word(),
        ttl,
        tableName,
      });
      const data = { word };

      // When
      const promise = dynamoDB.update(messageId, data);

      // Then
      return expect(promise).resolves.not.toThrow();
    });
  });
});
