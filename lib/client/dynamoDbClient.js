import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// Set the AWS Region.; //e.g. "us-east-1"
// Create an Amazon DynamoDB service client object.
const ddbClient = new DynamoDBClient({ 
    region: process.env.REGION ,
    credential:{
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.SECRET_KEY
    }
});

export { ddbClient };