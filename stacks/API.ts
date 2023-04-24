import { StackContext, Api, use, ApiDomainProps } from 'sst/constructs';
import { DomainName } from '@aws-cdk/aws-apigatewayv2-alpha';
import { Infra } from './Infra';

export function API({ stack, app }: StackContext) {
  const { DATABASE_URL, bucket, AUTH_BASE_URL } = use(Infra);
  let customDomain: ApiDomainProps | undefined;
  if (!app.local && app.stage !== 'local') {
    customDomain = {
      path: 'receipts',
      cdk: {
        domainName: DomainName.fromDomainNameAttributes(stack, 'ApiDomain', {
          name: process.env.API_DOMAIN_NAME!,
          regionalDomainName: process.env.API_REGIONAL_DOMAIN_NAME!,
          regionalHostedZoneId: process.env.API_REGIONAL_HOSTED_ZONE_ID!,
        }),
      },
    };
  }
  const api = new Api(stack, 'api', {
    routes: {
      'POST /receipts': 'packages/api/src/functions/upload-receipt.handler',
      'GET /receipts': 'packages/api/src/functions/get-receipts.handler',
      'GET /receipts/download-url': 'packages/api/src/functions/get-download-url.handler',
    },
    customDomain,
  });

  api.bind([DATABASE_URL, AUTH_BASE_URL, bucket]);
}
