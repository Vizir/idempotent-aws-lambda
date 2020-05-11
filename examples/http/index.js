const { idempotencyHttpWrapper } = require("../../");

module.exports.httpHandlerRequestId = idempotencyHttpWrapper({
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
  ttl: 5,
  id: {
    from: "requestId",
  },
});

module.exports.httpHandlerHeader = idempotencyHttpWrapper({
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
  ttl: 5,
  id: {
    from: "header",
    name: "myIdempotencyKey",
    fallback: true,
  },
});
