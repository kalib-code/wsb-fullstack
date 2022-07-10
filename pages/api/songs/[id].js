import SONGS from '../../../lib/models/songs.model';
import {get , update} from '../../../services/aws/aws.dynamodb.js';

const resource = 'Songs'; // upper case
export default async function handler(req, res) {
    if (req.method === "GET") {
        console.log(req.query.id , "ID req")

        const response = await get( resource , req.query.id);
        res.status(200).json(response);
    }

    if (req.method === "PUT") {
        const data = await update( resource , req.query.id, req.body);
        res.status(200).json(data);
      }
    
      

}
 