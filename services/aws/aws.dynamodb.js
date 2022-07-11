const AWS = require('aws-sdk')
const uuid = require('uuid')
import dayjs from 'dayjs'

import {
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  ScanCommand
} from '@aws-sdk/client-dynamodb'
import { ddbClient } from '../../lib/client/dynamoDbClient'
import { marshall, unmarshall as unMarshall } from '@aws-sdk/util-dynamodb'

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

const updateBuildFilterObjects = values => {
  let updateExpression = ''
  const expressionAttributeNames = {}
  const expressionAttributeValues = {}
  const attrNames = Object.keys(values)

  attrNames.forEach(attrName => {
    const attrNameKey = `#${attrName}`
    const attrNameVal = `:${attrName}`
    expressionAttributeNames[attrNameKey] = attrName

    const expressionItemObj = AWS.DynamoDB.Converter.marshall({
      tempKey: values[attrName]
    })

    expressionAttributeValues[attrNameVal] = expressionItemObj.tempKey

    if (!updateExpression) {
      updateExpression += 'set '
    }

    if (updateExpression !== 'set ') {
      updateExpression += ', '
    }

    updateExpression += `${attrNameKey} = ${attrNameVal}`
  })

  return {
    updateExpression,
    expressionAttributeNames,
    expressionAttributeValues
  }
}

const buildScanFilterExpression = where => {
  let filterExpression = ''
  const expressionAttributeNames = {}
  const expressionAttributeValues = {}

  Object.keys(where).forEach(attrName => {
    let counter = 1
    const attrNameKey = `#${attrName}`
    expressionAttributeNames[attrNameKey] = attrName
    const conditionObject = where[attrName]
    const expressionConditions = Object.keys(conditionObject)

    expressionConditions.forEach(conditionKey => {
      const filterObject = where[attrName]
      const conditionValue = filterObject[conditionKey]
      const expressionItemKey = `:${attrName}${counter}`
      const expressionItemObj = marshall({ tempKey: conditionValue })
      expressionAttributeValues[expressionItemKey] = expressionItemObj.tempKey

      if (filterExpression) {
        filterExpression += ' AND '
      }

      switch (conditionKey) {
        case 'eq':
          filterExpression += `${attrNameKey} = ${expressionItemKey}`
          break
        case 'contains':
          filterExpression += `contains(${attrNameKey}, ${expressionItemKey})`
          break
        case 'gt':
          filterExpression += `${attrNameKey} > ${expressionItemKey}`
          break
        case 'gte':
          filterExpression += `${attrNameKey} >= ${expressionItemKey}`
          break
        case 'lt':
          filterExpression += `${attrNameKey} < ${expressionItemKey}`
          break
        case 'lte':
          filterExpression += `${attrNameKey} <= ${expressionItemKey}`
          break
        /* istanbul ignore next */
        default:
          break
      }

      counter += 1
    })
  })

  return {
    filterExpression,
    expressionAttributeNames,
    expressionAttributeValues
  }
}

const recursiveScanCommand = async input => {
  let cached = []
  const command = new ScanCommand(input)
  const response = await ddbClient.send(command)

  if (response.Items && response.Items.length) {
    cached = [...cached, ...response.Items]
  }

  if (response.LastEvaluatedKey) {
    const newInput = { ...input, ExclusiveStartKey: response.LastEvaluatedKey }
    return await recursiveScanCommand(newInput)
  }

  return cached
}
const recursiveQueryCommand = async input => {
  let cached = []
  const command = new QueryCommand(input)
  const response = await this.client.send(command)

  if (response.Items && response.Items.length) {
    cached = [...cached, ...response.Items]
  }

  if (response.LastEvaluatedKey) {
    const newInput = { ...input, ExclusiveStartKey: response.LastEvaluatedKey }
    return await recursiveQueryCommand(newInput)
  }

  return cached
}

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
    Item: marshall(rawData),
    ReturnValue: 'ALL_OLD'
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
    Key: marshall({ id }),
    ConsistentRead: true
  }

  try {
    const data = await ddbClient.send(new GetItemCommand(param))
    return unMarshall(data.Item)
  } catch (err) {
    console.log(err)
  }
}

export const update = async (tableName, id, data) => {
  data.modified = dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss')
  const {
    updateExpression,
    expressionAttributeNames,
    expressionAttributeValues
  } = updateBuildFilterObjects(data)

  const params = {
    TableName: getFormattedTableName(tableName),
    Key: {
      id: {
        S: id
      }
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  }

  try {
    const data = await ddbClient.send(new UpdateItemCommand(params))
    console.log('success', data)
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
        S: id
      }
    }
  }

  try {
    const data = await ddbClient.send(new DeleteItemCommand(params))
    console.log('success', data)
    return data
  } catch (err) {
    console.error(err)
  }
}

export const getAll = async (tableName, where) => {
  const input = {
    TableName: getFormattedTableName(tableName)
  }
  const isEmpty = Object.keys(where).length === 0;

  if (!isEmpty) {

    const scanFilterExpression = buildScanFilterExpression(where)
    input.FilterExpression = scanFilterExpression.filterExpression

    input.ExpressionAttributeNames =
      scanFilterExpression.expressionAttributeNames

    input.ExpressionAttributeValues =
      scanFilterExpression.expressionAttributeValues
  }

  const result = await recursiveScanCommand(input)
  return result.map(item => unMarshall(item))
}

export const getItemsByIndex = async (index, value, where) => {
  const input = {
    TableName: getFormattedTableName(tableName),
    IndexName: index,
    KeyConditionExpression: '#s = :idx',
    ExpressionAttributeNames: { '#s': index },
    ExpressionAttributeValues: { ':idx': { S: value } }
  }

  if (typeof where !== 'undefined') {
    const scanFilterExpression = buildScanFilterExpression(where)
    input.FilterExpression = scanFilterExpression.filterExpression

    input.ExpressionAttributeNames = {
      ...input.ExpressionAttributeNames,
      ...scanFilterExpression.expressionAttributeNames
    }

    input.ExpressionAttributeValues = {
      ...input.ExpressionAttributeValues,
      ...scanFilterExpression.expressionAttributeValues
    }
  }

  const result = await recursiveQueryCommand(input)
  return result.map(item => unmarshall(item))
}
