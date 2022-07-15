import NextAuth from "next-auth"
import EmailProvider from "next-auth/providers/email"
import GithubProvider from "next-auth/providers/github"
import { DynamoDB } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb"
import { DynamoDBAdapter } from "@next-auth/dynamodb-adapter"
const config = {
    credentials: {
      accessKeyId: process.env.ACCESS_KEY,
      secretAccessKey: process.env.SECRET_KEY,
    },
    region: process.env.REGION,
    tableName: process.env.TABLE_NAME,
  };

  const client = DynamoDBDocument.from(new DynamoDB(config), {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
  })

export default NextAuth({
  // Configure one or more authentication providers
  providers: [
    EmailProvider({
        server: {
          host: process.env.EMAIL_SERVER_HOST,
          port: process.env.EMAIL_SERVER_PORT,
          auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD
          }
        },
        from: process.env.EMAIL_FROM
      }),
    // ...add more providers here
  ],
  adapter: DynamoDBAdapter(
    client
  ),
})