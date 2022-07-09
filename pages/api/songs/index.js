import * as uuid from "uuid";
import * as date from 'dayjs'
import SONGS from '../../../lib/models/songs.model';





export default async function handler(req, res) {


  if (req.method === "POST") {
    const response = await SONGS.create(req.body);
    res.status(201).json(response);

  }
  if (req.method === "GET") {
    
    const response = await SONGS.findMany();
      res.status(200).json(response);
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
