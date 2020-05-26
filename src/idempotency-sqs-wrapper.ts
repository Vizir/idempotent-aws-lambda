import SQS from "aws-sdk/clients/sqs";
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
}

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

    for (let record of event.Records) {
      const messageId = record.messageId;

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
