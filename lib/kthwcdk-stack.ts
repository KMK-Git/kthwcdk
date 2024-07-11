import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class KthwcdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, publicIpCidr: string, props?: cdk.StackProps) {
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
    const keyPair = ec2.KeyPair.fromKeyPairName(this, 'KubeKeyPair', 'KubeKeyPair');
    const userData = ec2.UserData.forLinux()
    userData.addCommands(
      'mkdir /tmp/ssm',
      'cd /tmp/ssm',
      `wget https://s3.${cdk.Stack.of(this).region}.amazonaws.com/amazon-ssm-${cdk.Stack.of(this).region}/latest/debian_arm64/amazon-ssm-agent.deb`,
      'sudo dpkg -i amazon-ssm-agent.deb',
      'sudo systemctl enable amazon-ssm-agent',
      'sudo systemctl start amazon-ssm-agent',
      'curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_arm64/session-manager-plugin.deb" -o "session-manager-plugin.deb"',
      'sudo dpkg -i session-manager-plugin.deb',
    );
    const jumpboxRootVolume: ec2.BlockDevice = {
      deviceName: '/dev/xvda',
      volume: ec2.BlockDeviceVolume.ebs(10),
    };
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
      keyPair: keyPair,
      blockDevices: [jumpboxRootVolume],
    });
    jumpbox.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:StartSession'],
      effect: iam.Effect.ALLOW,
      resources: ['*'],
    }));
    const rootVolume: ec2.BlockDevice = {
      deviceName: '/dev/xvda',
      volume: ec2.BlockDeviceVolume.ebs(20),
    };
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
      keyPair: keyPair,
      blockDevices: [rootVolume],
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
      keyPair: keyPair,
      blockDevices: [rootVolume],
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
      keyPair: keyPair,
      blockDevices: [rootVolume],
    });

    jumpbox.connections.allowFrom(server.connections, ec2.Port.allTraffic());
    jumpbox.connections.allowFrom(node0.connections, ec2.Port.allTraffic());
    jumpbox.connections.allowFrom(node1.connections, ec2.Port.allTraffic());
    jumpbox.connections.allowFrom(ec2.Peer.ipv4(publicIpCidr), ec2.Port.SSH);


    server.connections.allowFrom(jumpbox.connections, ec2.Port.allTraffic());
    server.connections.allowFrom(node0.connections, ec2.Port.allTraffic());
    server.connections.allowFrom(node1.connections, ec2.Port.allTraffic());
    server.connections.allowFrom(ec2.Peer.ipv4(publicIpCidr), ec2.Port.SSH);


    node0.connections.allowFrom(jumpbox.connections, ec2.Port.allTraffic());
    node0.connections.allowFrom(server.connections, ec2.Port.allTraffic());
    node0.connections.allowFrom(node1.connections, ec2.Port.allTraffic());
    node0.connections.allowFrom(ec2.Peer.ipv4(publicIpCidr), ec2.Port.SSH);


    node1.connections.allowFrom(jumpbox.connections, ec2.Port.allTraffic());
    node1.connections.allowFrom(server.connections, ec2.Port.allTraffic());
    node1.connections.allowFrom(node0.connections, ec2.Port.allTraffic());
    node1.connections.allowFrom(ec2.Peer.ipv4(publicIpCidr), ec2.Port.SSH);

    const script = `tmux split-window -h  "ssh -J admin@${jumpbox.instancePublicDnsName} admin@${server.instancePublicDnsName}"
    tmux select-layout tiled > /dev/null
    tmux split-window -h  "ssh -J admin@${jumpbox.instancePublicDnsName} admin@${node0.instancePublicDnsName}"
    tmux select-layout tiled > /dev/null
    tmux split-window -h  "ssh -J admin@${jumpbox.instancePublicDnsName} admin@${node1.instancePublicDnsName}"
    tmux select-layout tiled > /dev/null
    tmux select-pane -t 0
    ssh -A admin@${jumpbox.instancePublicDnsName}`;
    new cdk.CfnOutput(this, 'connectScript', { value: script });
  }
}
