import { db, logger, wrapped, Event, SNSService } from '@whiskey-receipts-service/core';
import { Handler } from 'aws-lambda';
import { Topic } from 'sst/node/topic';

const sns = SNSService.live();

const deduplicateReceipts: Handler = async event => {
  logger.info('Retrieving all receipts');
  const receipts = await db
    .selectFrom('whiskey-receipts.receipts')
    .leftJoin(
      'whiskey-receipts.stores',
      'whiskey-receipts.stores.id',
      'whiskey-receipts.receipts.store_id'
    )
    .select([
      'whiskey-receipts.receipts.id as id',
      'whiskey-receipts.stores.id as store_id',
      'whiskey-receipts.stores.name as store_name',
      'whiskey-receipts.receipts.timestamp as timestamp',
      'whiskey-receipts.receipts.document_type as document_type',
    ])
    .execute();
  logger.info('Receipts', { count: receipts.length });
  let dupes = [];
  for (let i = 0; i < receipts.length; i++) {
    for (let j = 0; j < receipts.length; j++) {
      if (i !== j) {
        if (isFunctionalDuplicate(receipts[i], receipts[j])) {
          dupes.push(receipts[i]);
        }
      }
    }
  }
  const dupesSet = new Set(dupes);
  if (dupesSet.size !== 0) {
    logger.info(`Found ${dupesSet.size} duplicates. Cleaning up now...`);

    await db
      .deleteFrom('whiskey-receipts.receipts')
      .where(
        'id',
        'in',
        [...dupesSet].map(v => v.id)
      )
      .execute();

    logger.info('Deleted duplicate receipts');

    const deletedEvents: { id: string; payload: Event }[] = [...dupesSet].map(v => ({
      id: v.id,
      payload: {
        action: 'DELETE',
        details: {
          id: v.id,
          documentType: v.document_type,
          store: v.store_name!,
          timestamp: v.timestamp.getTime(),
        },
      },
    }));
    await sns.batchEvents(deletedEvents, Topic.EventsTopic.topicArn);
    logger.info(`Notified topic of ${deletedEvents.length} DELETE events`);
  } else {
    logger.info('No duplicates found!');
  }
};

export const handler = wrapped(deduplicateReceipts);

function isFunctionalDuplicate(rhs: any, lhs: any) {
  return rhs.store_id === lhs.store_id && rhs.timestamp.getTime() === lhs.timestamp.getTime();
}
