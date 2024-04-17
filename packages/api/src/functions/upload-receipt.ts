import { ulid } from 'ulid';
import { APIGatewayJSONBodyEventHandler } from '../utils/lambda-utils';
import {
  PostReceiptsRequestBody,
  PostReceiptsRequestBodyDecoder,
} from '@whiskey-receipts-service/defs';
import { S3Service, db, logger, wrapped } from '@whiskey-receipts-service/core';
import { Bucket } from 'sst/node/bucket';
import jsonBodyParser from '@middy/http-json-body-parser';
import { validateAuth } from 'src/middleware/validate-auth';
import { validateBody } from 'src/middleware/validate-body';
import responseMonitoring from 'src/middleware/response-monitoring';
import { DateTime } from 'luxon';

const s3 = S3Service.live();

const upload: APIGatewayJSONBodyEventHandler<PostReceiptsRequestBody> = async event => {
  let id: string;
  let message: string;

  const existing = await db
    .selectFrom('whiskey-receipts.receipts')
    .leftJoin(
      'whiskey-receipts.stores',
      'whiskey-receipts.stores.id',
      'whiskey-receipts.receipts.store_id'
    )
    .select([
      'whiskey-receipts.receipts.id as id',
      'whiskey-receipts.stores.name as store_name',
      'whiskey-receipts.receipts.timestamp as timestamp',
    ])
    .where('whiskey-receipts.stores.name', '=', event.body.storeName)
    .where('timestamp', '=', DateTime.fromMillis(event.body.timestamp).toJSDate())
    .execute();

  if (existing[0]) {
    logger.info('Receipt exists. Will on only update document');
    id = existing[0].id;
    message = 'Receipt exists, will update backing document.';
  } else {
    id = ulid(event.body.timestamp);

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
      .replaceInto('whiskey-receipts.receipts')
      .values({
        id,
        store_id: storeID!,
        timestamp: new Date(event.body.timestamp),
        document_type: 'application/pdf',
      })
      .execute();

    message = 'Successfully saved receipt information';
  }

  const objectKey = s3.objectKey(id, event.body.contentType);
  const uploadUrl = await s3.getUploadLink(
    objectKey,
    Bucket.ReceiptsBucket.bucketName,
    event.body.contentType
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      message,
      receiptId: id,
      uploadUrl,
    }),
  };
};

export const handler = wrapped(upload)
  .use(jsonBodyParser())
  .use(validateAuth())
  .use(validateBody(PostReceiptsRequestBodyDecoder))
  .use(responseMonitoring());
