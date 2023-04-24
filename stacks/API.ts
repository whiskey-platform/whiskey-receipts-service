import { StackContext, Api, Config, Bucket, use } from 'sst/constructs';
import { DomainName } from '@aws-cdk/aws-apigatewayv2-alpha';
import { Infra } from './Infra';

export function API({ stack, app }: StackContext) {
  const { DATABASE_URL, bucket } = use(Infra);
  const api = new Api(stack, 'api', {
    routes: {
      'POST /receipts': 'packages/api/src/functions/upload-receipt.handler',
    },
    customDomain: !app.local
      ? {
          path: 'receipts',
          cdk: {
            domainName: DomainName.fromDomainNameAttributes(stack, 'ApiDomain', {
              name: process.env.API_DOMAIN_NAME!,
              regionalDomainName: process.env.API_REGIONAL_DOMAIN_NAME!,
              regionalHostedZoneId: process.env.API_REGIONAL_HOSTED_ZONE_ID!,
            }),
          },
        }
      : undefined,
  });
  api.bind([DATABASE_URL, bucket]);
}
