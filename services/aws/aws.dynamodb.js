const AWS = require('aws-sdk')
const uuid = require('uuid')
import dayjs from 'dayjs'
import { PutItemCommand , GetItemCommand ,  UpdateItemCommand , DeleteItemCommand , QueryCommand} from '@aws-sdk/client-dynamodb'
import { ddbClient } from '../../lib/client/dynamoDbClient'

const getFormattedTableName = tableName => {
  if (tableName === undefined) {
    throw new Error('Database: Table is not specified')
  }

  let env = 'DEV'

  if (process.env.NODE_ENV === 'test') {
    env = 'TEST'
  }

  if (process.env.NODE_ENV === 'staging') {
    env = 'STAGING'
  }

  if (process.env.NODE_ENV === 'uat') {
    env = 'UAT'
  }

  if (process.env.NODE_ENV === 'prod') {
    env = 'PROD'
  }

  return `WSB_${env}_${tableName}`
}

const unMarshall = result => {
  return AWS.DynamoDB.Converter.unmarshall(result.Item)
}

const marshall = data => {
  return AWS.DynamoDB.Converter.marshall(data)
}

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


export const create = async (tableName, data) => {
  const id = uuid.v1()
  const created = dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss')
  const rawData = {
    id,
    created,
    ...data
  }
  const params = {
    TableName: getFormattedTableName(tableName),
    Item: marshall(rawData)
   
  }


  try {
    const data = await ddbClient.send(new PutItemCommand(params))
    console.log(data)
    return data
  } catch (err) {
    console.error(err)
  }
}

export const get = async (tableName, id) => {
  const param = {
    TableName: getFormattedTableName(tableName),
    Key: marshall({id}),
    ConsistentRead: true
    
  }

  try {
    const data = await ddbClient.send(new GetItemCommand(param));
    return unMarshall(data);
  } catch (err) {
    console.log(err)
  }
}

export const getAll = async (tableName) => {
    const param = {
        TableName: getFormattedTableName(tableName),
        ConsistentRead: true
    }
    
    try {
        const data = await ddbClient.send(new GetItemCommand(param));
        return unMarshall(data);
    } catch (err) {
        console.log(err)
    }
}

export const update = async (tableName, id, data) => {
    const {
        updateExpression,
        expressionAttributeNames,
        expressionAttributeValues,
    } = updateBuildFilterObjects(data);

    const params = {
        TableName: getFormattedTableName(tableName),
        Key: {
            id: {
                S: id,
            },
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
    };
    
    try {
        const data = await ddbClient.send(new UpdateItemCommand(params))
        console.log( "success",data)
        return data
    } catch (err) {
        console.error(err)
    }
}

export const deleteItem = async (tableName, id) => {
    const params = {
        TableName: getFormattedTableName(tableName),
        Key: {
            id: {
                S: id,
            },
        },
    };
    
    try {
        const data = await ddbClient.send(new DeleteItemCommand(params))
        console.log( "success",data)
        return data
    } catch (err) {
        console.error(err)
    }
}


// Todo : Create a recursive function to scan and query 


export const queryItems = async (tableName, query) => {
    const { filterExpression,
        expressionAttributeNames,
        expressionAttributeValues,} = scanBuildFilterObjects(query);
    const params = {
        TableName: getFormattedTableName(tableName),
        FilterExpression: filterExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConsistentRead: true
    }
    
    try {
        const data = await ddbClient.send(new QueryCommand(params))
        console.log( "success",data)
        return data
    } catch (err) {
        console.error(err)
    }
}


