import { db, logger, wrapped } from '@whiskey-receipts-service/core';
import { Handler } from 'aws-lambda';

const deduplicateReceipts: Handler = async event => {
  logger.info('Retrieving all receipts');
  const receipts = await db.selectFrom('receipts').selectAll().execute();
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
      .deleteFrom('receipts')
      .where(
        'id',
        'in',
        [...dupesSet].map(v => v.id)
      )
      .execute();

    logger.info('Deleted duplicate receipts');
  } else {
    logger.info('No duplicates found!');
  }
};

export const handler = wrapped(deduplicateReceipts);

function isFunctionalDuplicate(
  rhs: {
    id: string;
    store_id: number;
    timestamp: Date;
    document_type: string;
  },
  lhs: {
    id: string;
    store_id: number;
    timestamp: Date;
    document_type: string;
  }
) {
  return rhs.store_id === lhs.store_id && rhs.timestamp.getTime() === lhs.timestamp.getTime();
}
