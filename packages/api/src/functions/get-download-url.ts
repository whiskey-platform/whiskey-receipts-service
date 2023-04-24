import middy from '@middy/core';
import { S3Service } from '@whiskey-receipts-service/core';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import requestMonitoring from 'src/middleware/request-monitoring';
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

export const handler = middy(getDownloadURL)
  .use(requestMonitoring())
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
  );
