import { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { S3Service, db, wrapped } from '@whiskey-receipts-service/core';
import { ulid } from 'ulid';
import { DateTime } from 'luxon';
import { Bucket } from 'sst/node/bucket';

// old db info
const dynamoDB = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDB);
const TableName = 'mattwyskiel-receipts-dev';
const oldBucketName = 'mattwyskiel-receipts-dev';

const s3 = S3Service.live();

const migrateOldReceipts: Handler = async event => {
  console.log('Starting');

  let oldReceipts: any[] = [];
  let ExclusiveStartKey: Record<string, any> | undefined;
  do {
    console.log('DynamoDB call');
    const input: ScanCommandInput = {
      TableName,
    };
    if (ExclusiveStartKey) input.ExclusiveStartKey = ExclusiveStartKey;
    const getOldReceipts = new ScanCommand({
      TableName,
    });
    const response = await docClient.send(getOldReceipts);
    oldReceipts = oldReceipts.concat(response.Items!);
    console.log('LastEvaluatedKey: ', response.LastEvaluatedKey);
    console.log(oldReceipts);
    ExclusiveStartKey = response.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  for (const oldReceipt of oldReceipts) {
    console.log('Evaluating ', oldReceipt.key);
    const receiptTimestamp = DateTime.fromFormat(oldReceipt.dateString, 'yyyy-MM-dd').toMillis();

    const receiptsFromStore = await db
      .selectFrom('receipts')
      .leftJoin('stores', 'stores.id', 'receipts.store_id')
      .select([
        'receipts.id as id',
        'stores.id as store_id',
        'stores.name as store_name',
        'receipts.timestamp as timestamp',
        'receipts.document_type as document_type',
      ])
      .where('stores.name', '=', oldReceipt.store)
      .execute();

    const newReceipt = receiptsFromStore.filter(
      r => DateTime.fromJSDate(r.timestamp).toFormat('yyyy-MM-dd') === oldReceipt.dateString
    );

    if (!newReceipt[0]) {
      // get store
      const store = (
        await db.selectFrom('stores').selectAll().where('name', '=', oldReceipt.store).execute()
      )[0];
      console.log(store);

      let storeID = store?.id;

      if (!store) {
        await db.insertInto('stores').values({ name: oldReceipt.store }).execute();
        const newStore = (
          await db.selectFrom('stores').selectAll().where('name', '=', oldReceipt.store).execute()
        )[0];
        storeID = newStore.id;
        console.log('new store');
      }
      console.log('storeID: ', storeID);

      const id = ulid(receiptTimestamp);

      await db
        .replaceInto('receipts')
        .values({
          id,
          store_id: storeID!,
          timestamp: new Date(receiptTimestamp),
          document_type: 'application/pdf',
        })
        .execute();

      const objectKey = s3.objectKey(id, 'application/pdf');

      await s3.copyObject(
        encodeURIComponent(`${oldBucketName}/${oldReceipt.key}`),
        Bucket.ReceiptsBucket.bucketName,
        objectKey
      );
    }
  }
};

export const handler = wrapped(migrateOldReceipts);
