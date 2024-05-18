import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class KthwcdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const vpc = new ec2.Vpc(this, 'vpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 1,
      natGateways: 0,
      restrictDefaultSecurityGroup: true,
      vpcName: "kubethehardway",
    })
    const ami = new ec2.LookupMachineImage({
      name: 'debian-12-arm64*',
      filters: {
        architecture: ['arm64'],
      },
      owners: ['amazon'],
      windows: false,
    })
    const userData = ec2.UserData.forLinux()
    userData.addCommands(
      'mkdir /tmp/ssm',
      'cd /tmp/ssm',
      `wget https://s3.${cdk.Stack.of(this).region}.amazonaws.com/amazon-ssm-${cdk.Stack.of(this).region}/latest/debian_arm64/amazon-ssm-agent.deb`,
      'sudo dpkg -i amazon-ssm-agent.deb',
      'sudo systemctl enable amazon-ssm-agent',
      'sudo systemctl start amazon-ssm-agent',
    );
    const jumpbox = new ec2.Instance(this, 'jumpbox', {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.A1, ec2.InstanceSize.MEDIUM),
      machineImage: ami,
      associatePublicIpAddress: true,
      allowAllOutbound: true,
      instanceName: 'jumpbox',
      requireImdsv2: true,
      ssmSessionPermissions: true,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      userData: userData,
    });
    const server = new ec2.Instance(this, 'server', {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.A1, ec2.InstanceSize.MEDIUM),
      machineImage: ami,
      associatePublicIpAddress: true,
      allowAllOutbound: true,
      instanceName: 'server',
      requireImdsv2: true,
      ssmSessionPermissions: true,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      userData: userData,
    });
    const node0 = new ec2.Instance(this, 'node0', {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.A1, ec2.InstanceSize.MEDIUM),
      machineImage: ami,
      associatePublicIpAddress: true,
      allowAllOutbound: true,
      instanceName: 'node-0',
      requireImdsv2: true,
      ssmSessionPermissions: true,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      userData: userData,
    });
    const node1 = new ec2.Instance(this, 'node1', {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.A1, ec2.InstanceSize.MEDIUM),
      machineImage: ami,
      associatePublicIpAddress: true,
      allowAllOutbound: true,
      instanceName: 'node-1',
      requireImdsv2: true,
      ssmSessionPermissions: true,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      userData: userData,
    });
  }
}
