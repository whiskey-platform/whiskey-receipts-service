import { S3Service, wrapped } from '@whiskey-receipts-service/core';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import responseMonitoring from 'src/middleware/response-monitoring';
import { validateAuth } from 'src/middleware/validate-auth';
import { validateQuery } from 'src/middleware/validate-query';
import { Bucket } from 'sst/node/bucket';

interface QueryParameters {
  id: string;
}

const s3 = S3Service.live();

const getDownloadURL: APIGatewayProxyHandlerV2 = async event => {
  const { id } = event.queryStringParameters!;

  const url = await s3.getObjectURL(`${id!}.pdf`, Bucket.ReceiptsBucket.bucketName);

  return {
    statusCode: 200,
    body: JSON.stringify({
      id,
      url,
    }),
  };
};

export const handler = wrapped(getDownloadURL)
  .use(validateAuth())
  .use(
    validateQuery<QueryParameters>({
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      additionalProperties: false,
      required: ['id'],
    })
  )
  .use(responseMonitoring());
