import { db, wrapped } from '@whiskey-receipts-service/core';
import { GetReceiptsResponseBodyItem } from '@whiskey-receipts-service/defs';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DateTime } from 'luxon';
import { groupBy } from 'lodash';
import { validateAuth } from 'src/middleware/validate-auth';
import responseMonitoring from 'src/middleware/response-monitoring';

const getReceipts: APIGatewayProxyHandlerV2 = async event => {
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

export const handler = wrapped(getReceipts, { captureResponse: false })
  .use(validateAuth())
  .use(responseMonitoring());
