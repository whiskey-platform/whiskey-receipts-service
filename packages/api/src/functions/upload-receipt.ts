import { ulid } from 'ulid';
import { APIGatewayJSONBodyEventHandler } from '../utils/lambda-utils';
import {
  PostReceiptsRequestBody,
  PostReceiptsRequestBodyDecoder,
} from '@whiskey-receipts-service/defs';
import { S3Service, db, wrapped } from '@whiskey-receipts-service/core';
import { Bucket } from 'sst/node/bucket';
import jsonBodyParser from '@middy/http-json-body-parser';
import { validateAuth } from 'src/middleware/validate-auth';
import { validateBody } from 'src/middleware/validate-body';

const s3 = S3Service.live();

const upload: APIGatewayJSONBodyEventHandler<PostReceiptsRequestBody> = async event => {
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

  const id = ulid(event.body.timestamp);

  await db
    .replaceInto('receipts')
    .values({
      id,
      store_id: storeID!,
      timestamp: new Date(event.body.timestamp),
      document_type: 'application/pdf',
    })
    .execute();

  const objectKey = s3.objectKey(id, event.body.contentType);
  const url = await s3.getUploadLink(
    objectKey,
    Bucket.ReceiptsBucket.bucketName,
    event.body.contentType
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'successfully saved receipt',
      receiptId: id,
      uploadUrl: url,
    }),
  };
};

export const handler = wrapped(upload)
  .use(jsonBodyParser())
  .use(validateAuth())
  .use(validateBody(PostReceiptsRequestBodyDecoder));
