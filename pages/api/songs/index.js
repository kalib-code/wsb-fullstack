import * as uuid from "uuid";
import * as date from 'dayjs'
import SONGS from '../../../lib/models/songs.model';
import {create} from '../../../services/aws/aws.dynamodb.js';


const resource = 'Songs'; // upper case

export default async function handler(req, res) {

  if (req.method === "POST") {
    const result = await create( resource, req.body );
    res.status(200).json(result);

    // const response = await SONGS.create(req.body);
    // res.status(201).json(response);

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
