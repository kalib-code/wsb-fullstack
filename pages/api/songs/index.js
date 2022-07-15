
import qs from 'qs'

import {
  create,
  getAll,
} from '../../../services/aws/aws.dynamodb.js'

const resource = 'Songs' // upper case

export default async function handler (req, res) {
  if (req.method === 'POST') {
    const result = await create(resource, req.body)
    res.status(200).json(result)

  }

  if (req.method === 'GET') {
      const queryString = qs.parse(req.query)
      const response = await getAll(resource, queryString)

      if(response.length === 0) {
        res.status(404).json({
          message: 'Not found'
        })
      }else{
        res.status(200).json(response)
      }
     
  

  }

}
