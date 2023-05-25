import { SSTConfig } from 'sst';
import { API } from './stacks/API';
import { Infra } from './stacks/Infra';
import { EventHandling } from './stacks/Events';
import { Housekeeping } from './stacks/Housekeeping';

export default {
  config(_input) {
    return {
      name: 'whiskey-receipts-service',
      region: 'us-east-1',
    };
  },
  stacks(app) {
    app.setDefaultFunctionProps({
      runtime: 'nodejs18.x',
      nodejs: {
        esbuild: {
          external: !app.local ? ['@aws-sdk/*', '@aws-lambda-powertools/*'] : undefined,
        },
      },
      environment: {
        POWERTOOLS_SERVICE_NAME: 'whiskey_receipts_service',
      },
    });

    app.stack(Infra).stack(EventHandling).stack(API).stack(Housekeeping);
  },
} satisfies SSTConfig;
