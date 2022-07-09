const uuid = require("uuid");
import dayjs from "dayjs";

import awsDynamoDbService from "../lib/services/dynamodb";


class DynamoDB {
    static getFormattedTableName() {
        if (!this.table) {
            throw new Error("Database: Table is not specified");
        }

        let env = "DEV";

        if (process.env.NODE_ENV === "test") {
            env = "Test";
        }

        if (process.env.NODE_ENV === "staging") {
            env = "Staging";
        }

        if (process.env.NODE_ENV === "uat") {
            env = "Uat";
        }

        if (process.env.NODE_ENV === "prod") {
            env = "Prod";
        }

        return `WSB_${env}_${this.table}`;
    }


    static async insertOne(fields = null) {
        if (!fields) {
            throw new Error("Database: No parameters to save");
        }

        const params = { ...fields };

        if (!params.id) {
            params.id = uuid.v1();
        }

        if (!params.created) {
            params.created = dayjs(new Date()).format( "YYYY-MM-DD HH:mm:ss");;
        }

        if (!params.modified) {
            params.modified = dayjs(new Date()).format( "YYYY-MM-DD HH:mm:ss");;
        }

        const result = await awsDynamoDbService.putItem({
            table: this.getFormattedTableName(),
            fields: params,
        });

        result.insertedId = params.id;
        result.data = params;
        return result;
    }

    static async insertMany(fieldsSet = null) {
        if (!fieldsSet || !fieldsSet.length) {
            throw new Error("Database: No parameters to save");
        }

        const result = [];
        const data = [];
        const insertedIds = [];

        for (let i = 0; i < fieldsSet.length; i += 1) {
            const params = { ...fieldsSet[i] };

            if (!params.id) {
                params.id = uuid.v1();
            }
            params.created = dayjs(new Date()).format( "YYYY-MM-DD HH:mm:ss");
            params.modified = dayjs(new Date()).format( "YYYY-MM-DD HH:mm:ss");

            const insert = awsDynamoDbService.putItem({
                table: this.getFormattedTableName(),
                fields: params,
            });

            insertedIds.push(params.id);
            data.push(params);
            result.push(insert);
        }

        await Promise.all(result);

        return {
            insertedIds,
            data,
        };
    }


    static async findOneById(id) {
        if (!id) {
            throw new Error("Database: Missing primary key parameter");
        }

        const result = await awsDynamoDbService.getItem({
            table: this.getFormattedTableName(),
            id,
        });

        return result;
    }


    static async findOneByIndex(index, value) {
        if (!index) {
            throw new Error("Database: Missing index parameter");
        }

        if (!value) {
            throw new Error("Database: Missing filter parameter");
        }

        const result = await awsDynamoDbService.getItemByIndex({
            table: this.getFormattedTableName(),
            index,
            value,
        });


        if (Array.isArray(result) && result.length) {
            return result.shift();
        }

        return null;
    }

    /**
      * Find record using GSI
      * @param {*} index - field index.
      * @param {*} value - Search value
      *      {N: <keyValue>} - Key Value is number
      *      {S: <keyValue>} - Key Value is string
      * @param where  - where state for query search
      * Sample:
      *  {
      *    policyId: {
      *       eq: policyId,
      *    },
      *  }
      * @returns array of records
      */
    static async findManyByIndex(index, value, where = null) {
        if (!index) {
            throw new Error("Database: Missing index parameter");
        }

        if (!value) {
            throw new Error("Database: Missing filter parameter");
        }
        const result = await awsDynamoDbService.getAllByIndex({
            table: this.getFormattedTableName(),
            index,
            value,
            where,
        });

        return result;
    }

    static async findOne(where) {
        if (!where) {
            throw new Error("Database: Missing filter parameter");
        }

        const result = await awsDynamoDbService.scanItem({
            table: this.getFormattedTableName(),
            where,
        });

        return result;
    }


    static async findMany(where = null) {
        const result = await awsDynamoDbService.scanAll({
            table: this.getFormattedTableName(),
            where,
        });

        return result;
    }

    static async getAllByIndex({ index, value, where }) {
        if (!index) {
            throw new Error("Database: Missing primary key parameter");
        }
        if (!value) {
            throw new Error("Database: Missing update values parameter");
        }

        const result = await awsDynamoDbService.getAllByIndex({
            table: this.getFormattedTableName(),
            index,
            value,
            where,
        });

        return result;
    }

    static async updateOne({ id, values }) {
        if (!id) {
            throw new Error("Database: Missing primary key parameter");
        }

        if (!values) {
            throw new Error("Database: Missing update values parameter");
        }

        const result = await awsDynamoDbService.updateItem({
            table: this.getFormattedTableName(),
            id,
            values: {
                ...values,
                modified: dayjs(new Date()).format( "YYYY-MM-DD HH:mm:ss"),
            },
        });

        return result;
    }
}


module.exports = DynamoDB;
