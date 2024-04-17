import { SNSService, db, wrapped } from '@whiskey-receipts-service/core';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import responseMonitoring from 'src/middleware/response-monitoring';
import { validateAuth } from 'src/middleware/validate-auth';
import { json } from 'src/utils/lambda-utils';
import { Topic } from 'sst/node/topic';

const sns = SNSService.live();

const deleteReceipt: APIGatewayProxyHandlerV2 = async event => {
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
    .executeTakeFirstOrThrow();

  await db
    .deleteFrom('whiskey-receipts.receipts')
    .where('id', '=', event.pathParameters!.id!)
    .executeTakeFirstOrThrow();

  await sns.publishEvent(
    {
      action: 'DELETE',
      details: {
        id: receipt.id,
        documentType: receipt.document_type,
        store: receipt.store_name!,
        timestamp: receipt.timestamp.getTime(),
      },
    },
    Topic.EventsTopic.topicArn
  );

  return json({
    message: 'Success',
  });
};

export const handler = wrapped(deleteReceipt).use(validateAuth()).use(responseMonitoring());
