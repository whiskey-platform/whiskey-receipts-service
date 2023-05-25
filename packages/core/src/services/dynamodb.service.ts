import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteCommand,
  BatchWriteCommandInput,
  DynamoDBDocumentClient,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { tracer } from '../utils/tracer';
import { logger } from '../utils/logger';
import { chunk } from 'lodash';

export class DynamoDBService {
  private docClient: DynamoDBDocumentClient;

  constructor() {
    const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });
    tracer.captureAWSv3Client(dynamo);
    this.docClient = DynamoDBDocumentClient.from(dynamo);
  }

  public async addItem(Item: any, TableName: string) {
    logger.info(`Adding item to ${TableName}`);
    const request = new PutCommand({
      Item,
      TableName,
    });
    await this.docClient.send(request);
    logger.info('Successfully added item to table');
  }

  public async addItems(Items: any[], TableName: string) {
    logger.info(`Adding item to ${TableName}`);
    const groups = chunk(Items, 25);
    for (const group of groups) {
      logger.info(`Sending ${group.length} of ${Items.length} total items to DynamoDB`);
      let input: BatchWriteCommandInput = {
        RequestItems: {},
      };
      input.RequestItems![TableName] = group.map(Item => ({
        PutRequest: {
          Item,
        },
      }));
      const request = new BatchWriteCommand(input);
      await this.docClient.send(request);
    }
    logger.info('Successfully added item to table');
  }
}
