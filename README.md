# @vizir/idempotent-aws-lambda

A fast way to turn your aws lambda function idempotent.

[![npm version](https://badge.fury.io/js/%40vizir%2Fidempotent-aws-lambda.svg)](https://badge.fury.io/js/%40vizir%2Fidempotent-aws-lambda)
![Node.js CI](https://github.com/Vizir/idempotent-aws-lambda/workflows/Node.js%20CI/badge.svg?branch=master)

## Motivation

This library is design to resolve the idempotent problem of the AWS Lambda.

Some kind of request into AWS lambda should run most than one time, generating inconsistency problems when your
function isn't idempotent. You can check more details into [aws knowledge center](https://aws.amazon.com/premiumsupport/knowledge-center/lambda-function-idempotent)

## Installation

```sh
$ npm install @vizir/idempotent-aws-lambda
```

## Usage

### HTTP

Use the default aws request id to avoid duplicate requests:

```javascript
module.exports.handler = idempotencyHttpWrapper({
  handler: async (event, context) => {
    // Your lambda functions goes here
    console.log("Processing message", event, context);
    // The return will be cached into provider
    return "OK";
  },
  provider: {
    endpoint: "http://localhost:8000", // used for local development only
    name: "dynamoDB",
    region: "us-east-1",
    tableName: "my-idempotent-table",
  },
  ttl: 5, // ttl in seconds
  id: {
    from: "requestId",
  },
});
```

Use the request header to extract the idempotency id.

```javascript
module.exports.handler = idempotencyHttpWrapper({
  handler: async (event, context) => {
    // Your lambda functions goes here
    console.log("Processing message", event, context);
    // The return will be cached into provider
    return "OK";
  },
  provider: {
    endpoint: "http://localhost:8000", // used for local development only
    name: "dynamoDB",
    region: "us-east-1",
    tableName: "my-idempotent-table",
  },
  ttl: 5, // ttl in seconds
  id: {
    from: "header",
    name: "myIdempotencyHeader",
  },
});
```

Use the request header to extract the idempotency id (with aws request id when header is empty):

```javascript
module.exports.handler = idempotencyHttpWrapper({
  handler: async (event, context) => {
    // Your lambda functions goes here
    console.log("Processing message", event, context);
    // The return will be cached into provider
    return "OK";
  },
  provider: {
    endpoint: "http://localhost:8000", // used for local development only
    name: "dynamoDB",
    region: "us-east-1",
    tableName: "my-idempotent-table",
  },
  ttl: 5, // ttl in seconds
  id: {
    from: "header",
    name: "myIdempotencyHeader",
    fallback: true,
  },
});
```

### SQS

Prevent duplicate calls into sqs trigger. The ttl cannot be high to avoid retry problems.

The own aws can call your lambda twice, in this case we will ignore and remove from SQS.

```javascript
module.exports.sqsHandler = idempotencySQSWrapper({
  handler: async (event, context) => {
    console.log("Processing message", event, context);
    return "OK";
  },
  provider: {
    endpoint: process.env.ENDPOINT,
    name: "dynamoDB",
    region: process.env.REGION,
    tableName: process.env.TABLE_NAME,
  },
  queue: {
    region: process.env.REGION,
    url: process.env.QUEUE_URL,
  },
  ttl: 5,
});
```

## Support

Tested in Node.js 10-12.

## License

[The MIT License (MIT)](./LICENSE)
