const AWS = require("aws-sdk");

const dynamoDb = new AWS.DynamoDB({
    apiVersion: "latest",
    region: process.env.REGION, // Singapore
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
});


const scanRebuildFilterExpression = (filter, condition, attribute, value) => {
    let temp = filter;

    if (filter) {
        temp += " AND ";
    }

    switch (condition) {
    case "eq":
        temp += `${attribute} = ${value}`;
        break;
    case "contains":
        temp += `contains(${attribute}, ${value})`;
        break;
    case "gt":
        temp += `${attribute} > ${value}`;
        break;
    case "gte":
        temp += `${attribute} >= ${value}`;
        break;
    case "lt":
        temp += `${attribute} < ${value}`;
        break;
    case "lte":
        temp += `${attribute} <= ${value}`;
        break;
    case "between":
        // eslint-disable-next-line no-case-declarations
        temp += `${attribute} BETWEEN ${value}1 AND ${value}2`;
        break;
    case "ne":
        temp += `${attribute} <> ${value}`;
        break;
    case "attribute_exists":
        temp += `attribute_exists(${attribute}) and ${attribute} <> :nullfield`;
        break;
    default:
        break;
    }

    return temp;
};


const scanBuildFilterObjects = (where) => {
    let filterExpression = "";
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    const attrNames = Object.keys(where);

    attrNames.forEach((attrName) => {
        let counter = 1;
        const attrNameKey = `#${attrName}`;
        expressionAttributeNames[attrNameKey] = attrName;
        const expressionConditions = Object.keys(where[attrName]);

        expressionConditions.forEach((conditionKey) => {
            const conditionValue = where[attrName][conditionKey];
            const expressionItemKey = `:${attrName}${counter}`;

            if (conditionKey === "between") {
                const rangeValue = conditionValue.split(",");
                const expressionItemObj = AWS.DynamoDB.Converter.marshall({
                    startRange: rangeValue[0],
                    endRange: rangeValue[1],
                });
                expressionAttributeValues[`${expressionItemKey}1`] = expressionItemObj.startRange;
                expressionAttributeValues[`${expressionItemKey}2`] = expressionItemObj.endRange;
            } else if (conditionKey === "attribute_exists") {
                expressionAttributeValues[":nullfield"] = { NULL: true };
            } else {
                const expressionItemObj = AWS.DynamoDB.Converter.marshall({
                    tempKey: conditionValue,
                });
                expressionAttributeValues[expressionItemKey] = expressionItemObj.tempKey;
            }
            filterExpression = scanRebuildFilterExpression(
                filterExpression,
                conditionKey,
                attrNameKey,
                expressionItemKey,
            );

            counter += 1;
        });
    });

    return {
        filterExpression,
        expressionAttributeNames,
        expressionAttributeValues,
    };
};


const updateBuildFilterObjects = (values) => {
    let updateExpression = "";
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    const attrNames = Object.keys(values);

    attrNames.forEach((attrName) => {
        const attrNameKey = `#${attrName}`;
        const attrNameVal = `:${attrName}`;
        expressionAttributeNames[attrNameKey] = attrName;

        const expressionItemObj = AWS.DynamoDB.Converter.marshall({
            tempKey: values[attrName],
        });

        expressionAttributeValues[attrNameVal] = expressionItemObj.tempKey;

        if (!updateExpression) {
            updateExpression += "set ";
        }

        if (updateExpression !== "set ") {
            updateExpression += ", ";
        }

        updateExpression += `${attrNameKey} = ${attrNameVal}`;
    });

    return {
        updateExpression,
        expressionAttributeNames,
        expressionAttributeValues,
    };
};


const awsDynamoDbService = {
    putItem: async ({ table, fields }) => {
        const converted = AWS.DynamoDB.Converter.marshall(fields);

        const param = {
            Item: converted,
            TableName: table,
        };
        try {
            const result = await dynamoDb.putItem(param).promise();
            return result;
        } catch (ex) {
            if (ex.name === "ResourceNotFoundException") {
                // eslint-disable-next-line no-console
                console.log("ERROR - ", `ResourceNotFoundException(${table}): `, ex.message);
            }
            throw ex;
        }
    },


    getItem: async ({ table, id }) => {
        const param = {
            Key: {
                id: {
                    S: id,
                },
            },
            TableName: table,
        };

        const result = await dynamoDb.getItem(param).promise();

        if (!result || !result.Item) {
            return null;
        }

        return AWS.DynamoDB.Converter.unmarshall(result.Item);
    },


    /**
     *
     * @param {*} param0
     * @deprecated use getAllByIndex instead
     */
    getItemByIndex: async ({ table, index, value }) => {
        const param = {
            TableName: table,
            IndexName: index,
            KeyConditionExpression: `${index} = :idx`,
            ExpressionAttributeValues: { ":idx": value },
        };

        const result = await dynamoDb.query(param).promise();
        const converted = [];

        if (result && result.Items && result.Items.length) {
            result.Items.forEach((item) => {
                converted.push(AWS.DynamoDB.Converter.unmarshall(item));
            });
        }

        return converted;
    },

    /**
     * Get ALL the index, similar to scanAll.  only differentcan this can be scan via index
     * @param {Object} param0
     *   - table
     *   - index - index name
     *   - value index value
     *   - where - NVP condition, serving as second query from the index
     *      condition: ne,eq,between,
     *      syntax:
     *      {
     *         <attributeName>: {
     *           <condition>: <attributeValue>
     *         }
     *      }
     *      Example:
     *      {
     *        policyId: {
     *          eq: policyId,
     *        },
     *      }
     */
    getAllByIndex: async ({
        table, index, value, where,
    }) => {
        let indexValue = value;
        if (typeof value !== "object") {
            const marshallValue = AWS.DynamoDB.Converter.marshall({ value });
            indexValue = marshallValue.value;
        }

        const param = {
            TableName: table,
            IndexName: index,
            KeyConditionExpression: `#${index} = :idx`,
            ExpressionAttributeValues: { ":idx": indexValue },
        };

        if (where) {
            const {
                filterExpression,
                expressionAttributeNames,
                expressionAttributeValues,
            } = scanBuildFilterObjects(where);

            param.FilterExpression = filterExpression;
            param.ExpressionAttributeNames = expressionAttributeNames;
            param.ExpressionAttributeValues = {
                ...param.ExpressionAttributeValues,
                ...expressionAttributeValues,
            };
        }
        if (!param.ExpressionAttributeNames) {
            param.ExpressionAttributeNames = {};
        }
        param.ExpressionAttributeNames[`#${index}`] = index;
        let cached = [];

        const getAllDataRecursive = async (parameter) => {
            const result = await dynamoDb.query(param).promise();

            const paramx = parameter;
            if (paramx.ExclusiveStartKey) {
                delete paramx.ExclusiveStartKey;
            }

            if (result && result.Items && result.Items.length) {
                cached = [...cached, ...result.Items];
            }

            if (result.LastEvaluatedKey) {
                paramx.ExclusiveStartKey = result.LastEvaluatedKey;
                return getAllDataRecursive(paramx);
            }
            return result;
        };

        await getAllDataRecursive(param);

        const converted = [];
        if (cached && cached.length) {
            cached.forEach((item) => {
                converted.push(AWS.DynamoDB.Converter.unmarshall(item));
            });
        }

        return converted;
    },

    scanAll: async ({ table, where }) => {
        const params = {
            TableName: table,
        };

        if (where) {
            const {
                filterExpression,
                expressionAttributeNames,
                expressionAttributeValues,
            } = scanBuildFilterObjects(where);

            params.FilterExpression = filterExpression;
            params.ExpressionAttributeNames = expressionAttributeNames;
            params.ExpressionAttributeValues = expressionAttributeValues;
        }

        let cached = [];
        const converted = [];
        const getAllDataRecursive = async (parameter) => {
            const result = await dynamoDb.scan(parameter).promise();
            const paramx = parameter;
            if (paramx.ExclusiveStartKey) {
                delete paramx.ExclusiveStartKey;
            }

            if (result && result.Items && result.Items.length) {
                cached = [...cached, ...result.Items];
            }

            if (result.LastEvaluatedKey) {
                paramx.ExclusiveStartKey = result.LastEvaluatedKey;
                return getAllDataRecursive(paramx);
            }
            return result;
        };

        await getAllDataRecursive(params);

        if (cached && cached.length) {
            cached.forEach((item) => {
                converted.push(AWS.DynamoDB.Converter.unmarshall(item));
            });
        }

        return converted;
    },


    scanItem: async ({ table, where }) => {
        const result = await awsDynamoDbService.scanAll({ table, where });

        if (!result || !result.length) {
            return null;
        }

        const [first] = result;
        return first;
    },


    updateItem: async ({ table, id, values }) => {
        const {
            updateExpression,
            expressionAttributeNames,
            expressionAttributeValues,
        } = updateBuildFilterObjects(values);

        const params = {
            TableName: table,
            Key: {
                id: {
                    S: id,
                },
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
        };

        const result = await dynamoDb.updateItem(params).promise();
        result.updatedId = id;
        return result;
    },
};


module.exports = awsDynamoDbService;
