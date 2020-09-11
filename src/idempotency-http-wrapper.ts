import { Providers } from "./providers";
import { DynamoDB } from "./providers/dynamoDB";

const DEFAULT_TTL = 5;

interface IdempotencyHttpOptionsProviderDynamoDB {
  name: Providers.DynamoDB;
  endpoint?: string;
  region: string;
  tableName: string;
}

interface IdempotencyHttpOptionsRequestId {
  from: "requestId";
}

interface IdempotencyHttpOptionsHeader {
  from: "header";
  name: string;
  fallback?: boolean;
}

type IdempotencyHttpOptionsId =
  | IdempotencyHttpOptionsRequestId
  | IdempotencyHttpOptionsHeader;

export interface IdempotencyHttpOptions {
  handler: CallableFunction;
  provider: IdempotencyHttpOptionsProviderDynamoDB;
  ttl?: number;
  id: IdempotencyHttpOptionsId;
}

const isEmpty = (value: any): boolean =>
  value === null || value === undefined || value === "";

const getRequestId = (event: any, options: IdempotencyHttpOptionsId): any => {
  const requestId = event.requestContext.requestId;

  if (options.from === "requestId") {
    return requestId;
  }

  const header = event.headers[options.name];

  return isEmpty(header) && options.fallback === true ? requestId : header;
};

export const idempotencyHttpWrapper = (
  options: IdempotencyHttpOptions
): CallableFunction => {
  const provider = new DynamoDB({
    tableName: options.provider.tableName,
    region: options.provider.region,
    endpoint: options.provider.endpoint,
    ttl: options.ttl ?? DEFAULT_TTL,
  });
  return async (event: any, context: any): Promise<any> => {
    const messageId = getRequestId(event, options.id);

    if (isEmpty(messageId)) {
      return options.handler(event, context);
    }

    const hasProcessed = await provider.isProcessing(messageId);

    if (hasProcessed) {
      return provider.fetch(messageId);
    }

    const result = await options.handler(event, context);

    await provider.update(messageId, result);

    return result;
  };
};
