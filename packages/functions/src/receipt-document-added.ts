import { S3Handler } from 'aws-lambda';
import { Event, SNSService, db, wrapped } from '@whiskey-receipts-service/core';
import { Topic } from 'sst/node/topic';
import { Bucket } from 'sst/node/bucket';

const sns = SNSService.live();

const receiptDocumentAdded: S3Handler = async event => {
  const events: { id: string; payload: Event }[] = [];
  for (const record of event.Records) {
    if (record.eventName.startsWith('ObjectCreated:')) {
      const [_full, id, ..._rest] = record.s3.object.key.match(/(.*)\.(.*)/)!;
      const receipt = await db
        .selectFrom('receipts')
        .leftJoin('stores', 'stores.id', 'receipts.store_id')
        .select([
          'receipts.id as id',
          'stores.name as store_name',
          'receipts.timestamp as timestamp',
          'receipts.document_type as document_type',
        ])
        .where('receipts.id', '=', id)
        .executeTakeFirst();

      events.push({
        id,
        payload: {
          action: 'ADD',
          details: {
            id,
            timestamp: receipt!.timestamp.getTime(),
            store: receipt!.store_name!,
            documentType: receipt!.document_type,
            sourceBucket: Bucket.ReceiptsBucket.bucketName,
            sourceKey: record.s3.object.key,
          },
        },
      });
    }
  }
  await sns.batchEvents(events, Topic.EventsTopic.topicArn);
};

export const handler = wrapped(receiptDocumentAdded);
