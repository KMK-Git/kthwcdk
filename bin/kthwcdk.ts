#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KthwcdkStack } from '../lib/kthwcdk-stack';

const app = new cdk.App();
new KthwcdkStack(app, 'KthwcdkStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION
  },
});
