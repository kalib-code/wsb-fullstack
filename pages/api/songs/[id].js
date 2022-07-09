import SONGS from '../../../lib/models/songs.model';

export default async function handler(req, res) {
    if (req.method === "GET") {
        const response = await SONGS.get(req.query.id);
          res.status(200).json(response);
      }

}
 