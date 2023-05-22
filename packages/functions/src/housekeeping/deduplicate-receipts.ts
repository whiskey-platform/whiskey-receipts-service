import { db, logger } from '@whiskey-receipts-service/core';
import { Handler } from 'aws-lambda';

export const handler: Handler = async event => {
  logger.info('Retrieving all receipts');
  const receipts = await db
    .selectFrom('receipts')
    .selectAll()
    .orderBy('timestamp', 'asc')
    .execute();

  let dupes = [];
  for (let i = 0; i < receipts.length - 1; i++) {
    if (isFunctionalDuplicate(receipts[i + 1], receipts[i])) {
      dupes.push(receipts[i]);
    }
  }
  if (dupes.length !== 0) {
    logger.info(`Found ${dupes.length} duplicates. Cleaning up now...`);

    await db
      .deleteFrom('receipts')
      .where(
        'id',
        'in',
        dupes.map(v => v.id)
      )
      .execute();

    logger.info('Deleted duplicate receipts');
  } else {
    logger.info('No duplicates found!');
  }
};

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
  return rhs.store_id === lhs.store_id && rhs.timestamp === lhs.timestamp;
}
