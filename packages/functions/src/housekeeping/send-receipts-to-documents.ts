import { SNSService, db } from '@whiskey-receipts-service/core';
import { Handler } from 'aws-lambda';
import { DateTime } from 'luxon';
import { extension } from 'mime-types';
import { Bucket } from 'sst/node/bucket';
import { Topic } from 'sst/node/topic';

const sns = SNSService.live();

export const handler: Handler = async event => {
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

  const events = receipts.map(r => {
    const datetime = DateTime.fromJSDate(r.timestamp);
    return {
      id: r.id,
      payload: {
        sourceBucket: Bucket.ReceiptsBucket.bucketName,
        sourceKey: `${r.id}.${extension(r.document_type)}`,
        destinationKey: `Finances/Receipts/${datetime.year}/${datetime.toFormat('yyyy-MM-dd')} - ${
          r.store_name
        } (${r.id}).pdf`,
      },
    };
  });

  await sns.batchEvents(events, Topic.DocumentIngestTopic.topicArn);
};
