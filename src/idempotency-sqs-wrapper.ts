import { SQS } from "aws-sdk";
import { Providers } from "./providers";
import { DynamoDB } from "./providers/dynamoDB";

const DEFAULT_TTL = 5;

interface IdempotencySQSOptionsProviderDynamoDB {
  name: Providers.DynamoDB;
  endpoint?: string;
  region: string;
  tableName: string;
}

interface IdempotencySQSOptionsQueue {
  region: string;
  url: string;
}

export interface IdempotencySQSOptions {
  handler: CallableFunction;
  provider: IdempotencySQSOptionsProviderDynamoDB;
  queue: IdempotencySQSOptionsQueue;
  ttl?: number;
  id: IdempotencySQSOptionsId;
}

interface IdempotencySQSOptionsMessageId {
  from: "messageId";
}

interface IdempotencySQSOptionsEvent {
  from: "event";
  name: Array<string>;
}

type IdempotencySQSOptionsId =
  | IdempotencySQSOptionsMessageId
  | IdempotencySQSOptionsEvent;

const isEmpty = (value: any): boolean =>
  value === null || value === undefined || value === "";

const getMessageId = (record: any, options: IdempotencySQSOptionsId): any => {
  const messageId = record.messageId;

  if (options.from === "messageId") {
    return messageId;
  }

  const body = JSON.parse(record.body);
  const message = JSON.parse(body.Message);

  let id: string = "";
  if (!isEmpty(options.name)) {
    options.name.forEach((value) => {
      let keys = value.split(".");
      let messageValue: any = message;

      if (!isEmpty(keys)) {
        for (let key of keys) {
          if (messageValue[key] !== Object(messageValue[key])) {
            id += messageValue[key];
            break;
          }
          messageValue = messageValue[key];
        }
      }
    });
  }

  return isEmpty(id) ? messageId : id;
};

export const idempotencySQSWrapper = (
  options: IdempotencySQSOptions
): CallableFunction => {
  return async (event: any, context: any): Promise<any> => {
    const provider = new DynamoDB({
      tableName: options.provider.tableName,
      region: options.provider.region,
      endpoint: options.provider.endpoint,
      ttl: options.ttl ?? DEFAULT_TTL,
    });

    const newRecords = [];

    for (const record of event.Records) {
      const messageId = getMessageId(record, options.id);

      const hasProcessed = await provider.isProcessing(messageId);

      if (!hasProcessed) {
        newRecords.push(record);
        continue;
      }

      const sqs = new SQS({
        region: options.queue.region,
      });
      await sqs
        .deleteMessage({
          QueueUrl: options.queue.url,
          ReceiptHandle: record.receiptHandle,
        })
        .promise();
    }

    event.Records = newRecords;

    return options.handler(event, context);
  };
};
