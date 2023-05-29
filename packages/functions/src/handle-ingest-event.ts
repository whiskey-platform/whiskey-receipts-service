import { SNSHandler } from 'aws-lambda';
import { S3Service, SNSService, db, logger, wrapped } from '@whiskey-receipts-service/core';
import { extractInput } from './lib/extraction';
import { Bucket } from 'sst/node/bucket';
import { ulid } from 'ulid';
import { extension } from 'mime-types';
import { Topic } from 'sst/node/topic';
import { DateTime } from 'luxon';

const s3 = S3Service.live();
const sns = SNSService.live();

const handleIngestEvent: SNSHandler = async event => {
  for (const record of event.Records) {
    logger.info('Handling SNS event record', { record });
    const input = extractInput(record.Sns);
    logger.info('Extracted event', { event: input });

    let id: string;

    const existing = await db
      .selectFrom('receipts')
      .leftJoin('stores', 'stores.id', 'receipts.store_id')
      .select(['receipts.id as id', 'stores.name as store_name', 'receipts.timestamp as timestamp'])
      .where('stores.name', '=', input.store)
      .where('timestamp', '=', DateTime.fromMillis(input.timestamp).toJSDate())
      .execute();

    if (existing[0]) {
      logger.info('Receipt exists. Will on only update document');
      id = existing[0].id;
    } else {
      id = ulid(input.timestamp);
    }

    if (!existing[0]) {
      // get store
      const store = (
        await db.selectFrom('stores').selectAll().where('name', '=', input.store).execute()
      )[0];

      let storeID = store?.id;

      if (!store) {
        await db.insertInto('stores').values({ name: input.store }).execute();
        const newStore = (
          await db.selectFrom('stores').selectAll().where('name', '=', input.store).execute()
        )[0];
        storeID = newStore.id;
      }

      await db
        .replaceInto('receipts')
        .values({
          id,
          store_id: storeID!,
          timestamp: new Date(input.timestamp),
          document_type: input.documentType,
        })
        .execute();

      logger.info('Successfully saved receipt to database');

      if (!input.fromAPI) {
        // send notification
        await sns.publishEvent(
          {
            body: {
              aps: {
                alert: {
                  title: 'New Receipt Available',
                  body: `${input.store} - ${new Date(input.timestamp).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}`,
                },
              },
              channel: 'receipts',
            },
          },
          Topic.NotificationsTopic.topicArn
        );
      }
    }

    s3.copyObject(
      input.sourceDataPath,
      Bucket.ReceiptsBucket.bucketName,
      `${id}.${extension(input.documentType)}`
    );
  }
};

export const handler = wrapped(handleIngestEvent);
