import {deleteItem, get , update} from '../../../services/aws/aws.dynamodb.js';

const resource = 'Songs'; // upper case
export default async function handler(req, res) {
    if (req.method === "GET") {
        const response = await get( resource , req.query.id);
        res.status(200).json(response);
    }

    if (req.method === "PUT") {
        const data = await update( resource , req.query.id, req.body);
        res.status(200).json(data);
      }

    if (req.method === "DELETE") {
        await deleteItem( resource , req.query.id);
        res.status(204).json({});
    }
    
      

}
 