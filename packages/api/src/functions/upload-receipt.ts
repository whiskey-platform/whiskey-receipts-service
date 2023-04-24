import { ulid } from 'ulid';
import { APIGatewayJSONBodyEventHandler } from '../utils/lambda-utils';
import {
  PostReceiptsRequestBody,
  PostReceiptsRequestBodyDecoder,
} from '@whiskey-receipts-service/defs';
import { S3Service, db } from '@whiskey-receipts-service/core';
import { Bucket } from 'sst/node/bucket';
import middy from '@middy/core';
import requestMonitoring from 'src/middleware/request-monitoring';
import jsonBodyParser from '@middy/http-json-body-parser';
import { validateAuth } from 'src/middleware/validate-auth';
import { validateBody } from 'src/middleware/validate-body';

const s3 = S3Service.live();

const upload: APIGatewayJSONBodyEventHandler<PostReceiptsRequestBody> = async event => {
  // get store
  const store = await db
    .selectFrom('stores')
    .select('id')
    .where('name', '=', event.body.storeName)
    .executeTakeFirst();

  let storeID = store?.id;

  if (!store) {
    const newStore = await db
      .insertInto('stores')
      .values({ name: event.body.storeName })
      .returning('id')
      .executeTakeFirstOrThrow();
    storeID = newStore.id;
  }

  const id = ulid(event.body.timestamp);

  await db
    .insertInto('receipts')
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

export const handler = middy(upload)
  .use(requestMonitoring())
  .use(jsonBodyParser())
  .use(validateAuth())
  .use(validateBody(PostReceiptsRequestBodyDecoder));
