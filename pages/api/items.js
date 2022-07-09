import * as uuid from "uuid";
import dynamoDb from "../../lib/dynamodb";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const item = {
      id: uuid.v4(),
      ...req.body,
      createdAt: Date.now(),
    };

    await dynamoDb.put({
      TableName: "WSB_Dev_Users",
      Item: item,
    });

    res.status(201).json(item);
  }

  if (req.method === "GET") {
    if (req.query.id) {
      const { Item } = await dynamoDb.get({
        Key: {
          id: req.query.id,
        },
      });

      res.status(200).json(Item);
    }

    const { Items } = await dynamoDb.query({
      TableName: process.env.TABLE_NAME,
    });
    res.status(200).json(Items);
  }

  if (req.method === "PUT") {
    const { Attributes } = await dynamoDb.update({
      Key: {
        id: req.body.id,
      },
      UpdateExpression: "SET content = :content",
      ExpressionAttributeValues: {
        ":content": req.body.content || null,
      },
      ReturnValues: "ALL_NEW",
    });

    res.status(200).json(Attributes);
  }

  if (req.method === "DELETE") {
    await dynamoDb.delete({
      Key: {
        id: req.query.id,
      },
    });

    res.status(204).json({});
  }
}