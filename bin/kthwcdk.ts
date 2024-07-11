#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KthwcdkStack } from '../lib/kthwcdk-stack';
import { getPublicIpAddress } from "../lib/get_public_ip"

const app = new cdk.App();
const ipCidr = getPublicIpAddress().then(function (IpAddress: string) {
  new KthwcdkStack(app, 'KthwcdkStack', IpAddress + "/32", {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION
    },
  });
});

