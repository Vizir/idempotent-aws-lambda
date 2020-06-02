const AWS = require("aws-sdk");

AWS.config.update({
  endpoint: "http://dynamodb:8000",
  region: "us-east-1",
});
const dynamoDb = new AWS.DynamoDB();

(async () => {
  console.log("Configuring...");

  const result = await dynamoDb
    .createTable({
      TableName: "my-idempotency-table",
      AttributeDefinitions: [
        {
          AttributeName: "messageId",
          AttributeType: "S",
        },
      ],
      KeySchema: [
        {
          AttributeName: "messageId",
          KeyType: "HASH",
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    })
    .promise();

  console.log("Created table", result);

  const resultTTL = await dynamoDb
    .updateTimeToLive({
      TableName: "my-idempotency-table",
      TimeToLiveSpecification: {
        AttributeName: "ttl",
        Enabled: true,
      },
    })
    .promise();

  console.log("Updated TTL", resultTTL);
})();
