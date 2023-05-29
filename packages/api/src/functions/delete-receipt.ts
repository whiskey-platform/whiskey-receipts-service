import { SNSService, db, wrapped } from '@whiskey-receipts-service/core';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import responseMonitoring from 'src/middleware/response-monitoring';
import { validateAuth } from 'src/middleware/validate-auth';
import { json } from 'src/utils/lambda-utils';
import { Topic } from 'sst/node/topic';

const sns = SNSService.live();

const deleteReceipt: APIGatewayProxyHandlerV2 = async event => {
  const receipt = await db
    .selectFrom('receipts')
    .leftJoin('stores', 'stores.id', 'receipts.store_id')
    .select([
      'receipts.id as id',
      'stores.id as store_id',
      'stores.name as store_name',
      'receipts.timestamp as timestamp',
      'receipts.document_type as document_type',
    ])
    .where('receipts.id', '=', event.pathParameters!.id!)
    .executeTakeFirstOrThrow();

  await db
    .deleteFrom('receipts')
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
