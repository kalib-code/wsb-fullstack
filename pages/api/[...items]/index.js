import * as uuid from "uuid";
import daysjs from "daysjs";
import { api, buildScanFilterExpression } from "../../../lib/dynamodb";

const table_names = {
    songs: "WSB_Dev_Songs",
    users: "WSB_Dev_Users",
}

export default async function handler(req, res) {
  const { items , ...query } = req.query;
  if (req.method === "POST") {
    const item = {
      id: uuid.v4(),
      ...req.body,
      createdAt: daysjs().format("YYYY-MM-DD HH:mm:ss"),
    };
    await api.put({
      TableName: table_names.items[1],
      Item: item,
    });

    res.status(201).json(item);
  }

  if (req.method === "GET") {
  

    if (items[2]) {
      const { Item } = await api.get({
        Key: {
          id: items[2],
        },
      });
      res.status(200).json(Item);
    }

    const { Items } = await api.query({
        TableName: table_names.items[1],
        IndexName: "id",
        ...buildScanFilterExpression(query),
        
    });
    res.status(200).json(Items);
  }

  if (req.method === "PUT") {
    const { Attributes } = await api.update({
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
    await api.delete({
      Key: {
        id: req.query.id,
      },
    });

    res.status(204).json({});
  }
}
