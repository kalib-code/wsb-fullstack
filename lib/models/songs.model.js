import DynamoDB  from '../db';

/**
 * Policy contract document
 */
class SONGS extends DynamoDB {

    /**
     * Create song
     * @param {*} song - song object
     */
    static async create(song) {
        return this.insertOne(song);
    }

    /**
     * Get song by id
     * 
     * @param {*} id - song id
     * 
     */
     
    static async get(id) {
        console.log(id)
        return this.findOneById(id);
    }

    static async findMany(song) {
        return this.findMany(song);
    }
}

SONGS.table = "Songs";

module.exports = SONGS;
