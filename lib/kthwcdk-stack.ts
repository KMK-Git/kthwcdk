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
      'mkdir /tmp/userdata',
      'cd /tmp/userdata',
      `wget https://s3.${cdk.Stack.of(this).region}.amazonaws.com/amazon-ssm-${cdk.Stack.of(this).region}/latest/debian_arm64/amazon-ssm-agent.deb`,
      'sudo dpkg -i amazon-ssm-agent.deb',
      'sudo systemctl enable amazon-ssm-agent',
      'sudo systemctl start amazon-ssm-agent',
      'curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_arm64/session-manager-plugin.deb" -o "session-manager-plugin.deb"',
      'sudo dpkg -i session-manager-plugin.deb',
      'wget https://go.dev/dl/go1.22.5.linux-arm64.tar.gz',
      'sudo rm -rf /usr/local/go && tar -C /usr/local -xzf go1.22.5.linux-arm64.tar.gz',
      'sudo apt-get update',
      'sudo apt-get install -y ca-certificates curl',
      'sudo install -m 0755 -d /etc/apt/keyrings',
      'sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc',
      'sudo chmod a+r /etc/apt/keyrings/docker.asc',
      'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null',
      'sudo apt-get update',
      'sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin',
      'curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.23.0/kind-linux-arm64',
      'chmod +x ./kind',
      'sudo mv ./kind /usr/local/bin/kind'
    );
    const mainServerRootVolume: ec2.BlockDevice = {
      deviceName: '/dev/xvda',
      volume: ec2.BlockDeviceVolume.ebs(10),
    };
    new ec2.Instance(this, 'mainServer', {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.A1, ec2.InstanceSize.MEDIUM),
      machineImage: ami,
      associatePublicIpAddress: true,
      allowAllOutbound: true,
      instanceName: 'mainServer',
      requireImdsv2: true,
      ssmSessionPermissions: true,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      userData: userData,
      keyPair: keyPair,
      blockDevices: [mainServerRootVolume],
    });
    // mainServer.connections.allowFrom(ec2.Peer.ipv4(publicIpCidr), ec2.Port.SSH);
  }
}
