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
          external: !app.local ? ['@aws-sdk/*'] : undefined,
        },
      },
    });

    app.stack(Infra).stack(API).stack(EventHandling).stack(Housekeeping);
  },
} satisfies SSTConfig;
