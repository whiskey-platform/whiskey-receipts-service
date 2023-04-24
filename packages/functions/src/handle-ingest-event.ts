import { SNSHandler } from 'aws-lambda';
import { S3Service, db, logger } from '@whiskey-receipts-service/core';
import { extractInput } from './lib/extraction';
import { Bucket } from 'sst/node/bucket';
import { ulid } from 'ulid';

const s3 = S3Service.live();

export const handler: SNSHandler = async event => {
  for (const record of event.Records) {
    logger.info('Handling SNS event record', { record });
    const input = extractInput(record.Sns);
    logger.info('Extracted event', { event: input });

    const id = ulid(input.timestamp);

    s3.copyObject(input.sourceDataPath, Bucket.ReceiptsBucket.bucketName, id);

    // get store
    const store = await db
      .selectFrom('stores')
      .select('id')
      .where('name', '=', input.store)
      .executeTakeFirst();

    let storeID = store?.id;

    if (!store) {
      const newStore = await db
        .insertInto('stores')
        .values({ name: input.store })
        .returning('id')
        .executeTakeFirstOrThrow();
      storeID = newStore.id;
    }

    await db
      .insertInto('receipts')
      .values({
        id,
        store_id: storeID!,
        timestamp: new Date(input.timestamp),
        documentType: input.documentType,
      })
      .execute();

    logger.info('Successfully saved receipt to database');
  }
};
