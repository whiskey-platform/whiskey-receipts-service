import { db, wrapped } from '@whiskey-receipts-service/core';
import { GetReceiptsResponseBodyItem } from '@whiskey-receipts-service/defs';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DateTime } from 'luxon';
import { groupBy } from 'lodash';
import { validateAuth } from 'src/middleware/validate-auth';

const getReceipts: APIGatewayProxyHandlerV2 = async event => {
  const receipts = await db
    .selectFrom('receipts')
    .leftJoin('stores', 'stores.id', 'receipts.store_id')
    .select([
      'receipts.id as id',
      'stores.id as store_id',
      'stores.name as store_name',
      'receipts.timestamp as timestamp',
      'receipts.document_type as document_type',
    ])
    .execute();

  if (event.queryStringParameters?.groupByDate) {
    const combined: GetReceiptsResponseBodyItem[] = receipts.map(v => ({
      id: v.id,
      store: {
        id: v.store_id ?? 0,
        name: v.store_name ?? '',
      },
      documentType: v.document_type,
      timestamp: v.timestamp.getTime(),
    }));
    const returned = groupBy(combined, v =>
      DateTime.fromMillis(v.timestamp).toFormat('yyyy-MM-dd')
    );
    return {
      statusCode: 200,
      body: JSON.stringify(returned),
    };
  } else {
    const returned: GetReceiptsResponseBodyItem[] = receipts.map(v => ({
      id: v.id,
      store: {
        id: v.store_id ?? 0,
        name: v.store_name ?? '',
      },
      documentType: v.document_type,
      timestamp: v.timestamp.getTime(),
    }));
    return {
      statusCode: 200,
      body: JSON.stringify(returned),
    };
  }
};

export const handler = wrapped(getReceipts).use(validateAuth());
