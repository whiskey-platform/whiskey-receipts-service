import { DynamoDBService, Event, wrapped } from '@whiskey-receipts-service/core';
import { SNSHandler } from 'aws-lambda';
import { DateTime } from 'luxon';
import { Table } from 'sst/node/table';

const dynamodb = new DynamoDBService();

const addEventToTable: SNSHandler = async event => {
  const items: { timestamp: number; payload: Event }[] = [];
  for (const record of event.Records) {
    const payload = JSON.parse(record.Sns.Message);
    if (payload.replay) continue; // don't add replayed event
    const timestamp = DateTime.fromISO(record.Sns.Timestamp).toMillis();
    items.push({
      timestamp,
      payload,
    });
  }
  await dynamodb.addItems(items, Table.EventsTable.tableName);
};

export const handler = wrapped(addEventToTable);
