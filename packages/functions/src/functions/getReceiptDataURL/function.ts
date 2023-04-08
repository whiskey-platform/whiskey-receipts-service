import middy from '@middy/core';
import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import { S3Service } from '@whiskey-receipts-service/core/services/s3.service';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { Bucket } from 'sst/node/bucket';

const eventSchema = {
  type: 'object',
  properties: {
    queryStringParameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    },
  },
  required: ['queryStringParameters'],
} as const;

const s3 = S3Service.live();

const getReceiptDataURL: APIGatewayProxyHandlerV2 = async (event) => {
  const { id } = event.queryStringParameters!;

  const url = await s3.getObjectURL(id!, Bucket.ReceiptsBucket.bucketName);

  return {
    statusCode: 200,
    body: JSON.stringify({
      id,
      url,
    }),
  };
};

export const handler = middy(getReceiptDataURL).use(
  validator({ eventSchema: transpileSchema(eventSchema) })
);
