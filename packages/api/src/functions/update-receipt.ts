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
    .selectFrom('receipts')
    .selectAll()
    .where('id', '=', event.pathParameters!.id!)
    .executeTakeFirstOrThrow();

  if (event.body.storeName) {
    // get store
    const store = (
      await db.selectFrom('stores').selectAll().where('name', '=', event.body.storeName).execute()
    )[0];

    let storeID = store?.id;

    if (!store) {
      await db.insertInto('stores').values({ name: event.body.storeName }).execute();
      const newStore = (
        await db.selectFrom('stores').selectAll().where('name', '=', event.body.storeName).execute()
      )[0];
      storeID = newStore.id;
    }

    await db
      .updateTable('receipts')
      .set({ store_id: storeID })
      .where('id', '=', event.pathParameters!.id!)
      .executeTakeFirstOrThrow();
  }

  if (event.body.timestamp) {
    await db
      .updateTable('receipts')
      .set({ timestamp: DateTime.fromMillis(event.body.timestamp).toJSDate() })
      .where('id', '=', event.pathParameters!.id!)
      .executeTakeFirstOrThrow();
  }

  return json({
    message: 'Successfully updated receipt',
  });
};

export const handler = wrapped(updateReceipt)
  .use(jsonBodyParser())
  .use(validateAuth())
  .use(validateBody(PutReceiptsRequestBodyDecoder))
  .use(responseMonitoring());
