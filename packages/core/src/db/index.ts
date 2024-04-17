import { Kysely, PostgresDialect } from 'kysely';
import { Config } from 'sst/node/config';
import { fetch } from 'undici';
import { Store as StoreTable } from './model/store';
import { Receipt as ReceiptTable } from './model/receipt';
import { Pool } from 'pg';

interface Database {
  'whiskey-receipts.stores': StoreTable;
  'whiskey-receipts.receipts': ReceiptTable;
}

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: Config.DATABASE_URL,
    }),
  }),
});
