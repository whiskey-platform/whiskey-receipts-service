import { Kysely } from 'kysely';
import { PlanetScaleDialect } from 'kysely-planetscale';
import { Config } from 'sst/node/config';
import { fetch } from 'undici';
import { StoreTable } from './model/store';
import { ReceiptTable } from './model/receipt';

interface Database {
  stores: StoreTable;
  receipts: ReceiptTable;
}

export const db = new Kysely<Database>({
  dialect: new PlanetScaleDialect({
    url: Config.DATABASE_URL,
    fetch,
  }),
});
