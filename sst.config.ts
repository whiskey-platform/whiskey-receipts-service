import { SSTConfig } from 'sst';
import { API } from './stacks/API';
import { Infra } from './stacks/Infra';
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
      layers: [`arn:aws:lambda:${app.region}:094274105915:layer:AWSLambdaPowertoolsTypeScript:11`],
    });

    app.stack(Infra).stack(API).stack(Housekeeping);
  },
} satisfies SSTConfig;
