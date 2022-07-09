import aws from "aws-sdk";

const client = new aws.DynamoDB.DocumentClient({
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_KEY,
  region: process.env.REGION,
});

export const db = {
  get: (params) => client.get(params).promise(),
  put: (params) => client.put(params).promise(),
  query: (params) => client.query(params).promise(),
  update: (params) => client.update(params).promise(),
  delete: (params) => client.delete(params).promise(),
};

export const  buildScanFilterExpression = (where) =>{
    let filterExpression = '';
    const expressionAttributeNames = {};
    const expressionAttributeValues  = {};

    Object.keys(where).forEach((attrName) => {
        let counter = 1;
        const attrNameKey = `#${attrName}`;
        expressionAttributeNames[attrNameKey] = attrName;
        const conditionObject = where[attrName] ;
        const expressionConditions = Object.keys(conditionObject);

        expressionConditions.forEach((conditionKey) => {
            const filterObject = where[attrName];
            const conditionValue = filterObject[conditionKey] ;
            const expressionItemKey = `:${attrName}${counter}`;
            const expressionItemObj = marshall({ tempKey: conditionValue });
            expressionAttributeValues[expressionItemKey] = expressionItemObj.tempKey;

            if (filterExpression) { filterExpression += ' AND '; }

            switch (conditionKey) {
            case 'eq':
                filterExpression += `${attrNameKey} = ${expressionItemKey}`;
                break;
            case 'contains':
                filterExpression += `contains(${attrNameKey}, ${expressionItemKey})`;
                break;
            case 'gt':
                filterExpression += `${attrNameKey} > ${expressionItemKey}`;
                break;
            case 'gte':
                filterExpression += `${attrNameKey} >= ${expressionItemKey}`;
                break;
            case 'lt':
                filterExpression += `${attrNameKey} < ${expressionItemKey}`;
                break;
            case 'lte':
                filterExpression += `${attrNameKey} <= ${expressionItemKey}`;
                break;
            /* istanbul ignore next */
            default:
                break;
            }

            counter += 1;
        });
    });

    return {
        filterExpression,
        expressionAttributeNames,
        expressionAttributeValues,
    };
}
