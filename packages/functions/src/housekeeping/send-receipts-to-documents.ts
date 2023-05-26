import { SNSService, db, wrapped, Event } from '@whiskey-receipts-service/core';
import { Handler } from 'aws-lambda';
import { DateTime } from 'luxon';
import { extension } from 'mime-types';
import { Bucket } from 'sst/node/bucket';
import { Topic } from 'sst/node/topic';

const sns = SNSService.live();

const sendReceiptsToDocuments: Handler = async event => {
  const receipts = await db
    .selectFrom('receipts')
    .leftJoin('stores', 'stores.id', 'receipts.store_id')
    .select([
      'receipts.id as id',
      'stores.name as store_name',
      'receipts.timestamp as timestamp',
      'receipts.document_type as document_type',
    ])
    .execute();

  const events: { id: string; payload: Event }[] = receipts.map(r => {
    const datetime = DateTime.fromJSDate(r.timestamp);
    return {
      id: r.id,
      payload: {
        action: 'ADD',
        details: {
          id: r.id,
          timestamp: datetime.toMillis(),
          store: r.store_name!,
          documentType: r.document_type,
          sourceBucket: Bucket.ReceiptsBucket.bucketName,
          sourceKey: `${r.id}.${extension(r.document_type)}`,
        },
        replay: true,
      },
    };
  });

  await sns.batchEvents(events, Topic.EventsTopic.topicArn);
};

export const handler = wrapped(sendReceiptsToDocuments);
