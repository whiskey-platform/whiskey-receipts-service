import jsonBodyParser from '@middy/http-json-body-parser';
import { db, wrapped } from '@whiskey-receipts-service/core';
import {
  PutReceiptsRequestBody,
  PutReceiptsRequestBodyDecoder,
} from '@whiskey-receipts-service/defs';
import { DateTime } from 'luxon';
import responseMonitoring from 'src/middleware/response-monitoring';
import { validateAuth } from 'src/middleware/validate-auth';
import { validateBody } from 'src/middleware/validate-body';
import { APIGatewayJSONBodyEventHandler, json } from 'src/utils/lambda-utils';

const updateReceipt: APIGatewayJSONBodyEventHandler<PutReceiptsRequestBody> = async event => {
  const _receipt = await db
    .selectFrom('whiskey-receipts.receipts')
    .selectAll()
    .where('id', '=', event.pathParameters!.id!)
    .executeTakeFirstOrThrow();

  if (event.body.storeName) {
    // get store
    const store = (
      await db
        .selectFrom('whiskey-receipts.stores')
        .selectAll()
        .where('name', '=', event.body.storeName)
        .execute()
    )[0];

    let storeID = store?.id;

    if (!store) {
      await db
        .insertInto('whiskey-receipts.stores')
        .values({ name: event.body.storeName })
        .execute();
      const newStore = (
        await db
          .selectFrom('whiskey-receipts.stores')
          .selectAll()
          .where('name', '=', event.body.storeName)
          .execute()
      )[0];
      storeID = newStore.id;
    }

    await db
      .updateTable('whiskey-receipts.receipts')
      .set({ store_id: storeID })
      .where('id', '=', event.pathParameters!.id!)
      .executeTakeFirstOrThrow();
  }

  if (event.body.timestamp) {
    await db
      .updateTable('whiskey-receipts.receipts')
      .set({ timestamp: DateTime.fromMillis(event.body.timestamp).toJSDate() })
      .where('id', '=', event.pathParameters!.id!)
      .executeTakeFirstOrThrow();
  }

  const receipt = await db
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
    .where('whiskey-receipts.receipts.id', '=', event.pathParameters!.id!)
    .executeTakeFirst();

  return json({
    message: 'Successfully updated receipt',
    receipt,
  });
};

export const handler = wrapped(updateReceipt)
  .use(jsonBodyParser())
  .use(validateAuth())
  .use(validateBody(PutReceiptsRequestBodyDecoder))
  .use(responseMonitoring());
