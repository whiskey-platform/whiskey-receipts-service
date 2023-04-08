import middy from '@middy/core';
import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { FromSchema } from 'json-schema-to-ts';
import { ulid } from 'ulid';
import { db } from '@whiskey-receipts-service/core/db/db';
import { S3Service } from '@whiskey-receipts-service/core/services/s3.service';
import { Bucket } from 'sst/node/bucket';

const eventSchema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        storeName: { type: 'string' },
        timestamp: { type: 'number' },
        contentType: { type: 'string' },
      },
      required: ['storeName', 'timestamp', 'contentType'],
    },
  },
  required: ['body'],
} as const;
type BodyModel = FromSchema<typeof eventSchema.properties.body>;

const s3 = S3Service.live();

const upload: APIGatewayProxyHandlerV2 = async (event) => {
  const body: BodyModel = JSON.parse(event.body!); // validated by middy

  // get store
  const store = await db
    .selectFrom('stores')
    .select('id')
    .where('name', '=', body.storeName)
    .executeTakeFirst();

  let storeID = store?.id;

  if (!store) {
    const newStore = await db
      .insertInto('stores')
      .values({ name: body.storeName })
      .returning('id')
      .executeTakeFirstOrThrow();
    storeID = newStore.id;
  }

  const id = ulid(body.timestamp);

  await db
    .insertInto('receipts')
    .values({
      id,
      store_id: storeID!,
      timestamp: new Date(body.timestamp),
      documentType: 'application/pdf',
    })
    .execute();

  const objectKey = s3.objectKey(id, body.contentType);
  const url = await s3.getUploadLink(
    objectKey,
    Bucket.ReceiptsBucket.bucketName,
    body.contentType
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

export const handler = middy(upload).use(
  validator({ eventSchema: transpileSchema(eventSchema) })
);
