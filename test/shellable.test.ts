import { expect as assert, haveResource, ResourcePart } from '@aws-cdk/assert';
import cdk = require('@aws-cdk/cdk');
import { Stack } from '@aws-cdk/cdk';
import path = require('path');
import { Shellable, ShellPlatform } from '../lib';

// tslint:disable:max-line-length

test('minimal configuration', () => {
  const stack = new cdk.Stack();

  new Shellable(stack, 'MyShellable', {
    scriptDirectory: path.join(__dirname, 'delivlib-tests/linux'),
    entrypoint: 'test.sh'
  });

  assert(stack).to(haveResource('AWS::CodeBuild::Project'));
});

test('assume role', () => {
  const stack = new cdk.Stack();

  new Shellable(stack, 'MyShellable', {
    scriptDirectory: path.join(__dirname, 'delivlib-tests/linux'),
    entrypoint: 'test.sh',
    assumeRole: {
      roleArn: 'arn:aws:role:to:assume',
      sessionName: 'my-session-name'
    }
  });

  const template = stack.toCloudFormation();
  const buildSpec = JSON.parse(template.Resources.MyShellableB2FFD397.Properties.Source.BuildSpec);

  expect(buildSpec.phases.pre_build.commands)
    .toContain('aws sts assume-role --role-arn \"arn:aws:role:to:assume\" --role-session-name \"my-session-name\"  > $creds');
});

test('assume role with external-id', () => {
  const stack = new cdk.Stack();

  new Shellable(stack, 'MyShellable', {
    scriptDirectory: path.join(__dirname, 'delivlib-tests/linux'),
    entrypoint: 'test.sh',
    assumeRole: {
      roleArn: 'arn:aws:role:to:assume',
      sessionName: 'my-session-name',
      externalId: 'my-externa-id',
    }
  });

  const template = stack.toCloudFormation();
  const buildSpec = JSON.parse(template.Resources.MyShellableB2FFD397.Properties.Source.BuildSpec);

  expect(buildSpec.phases.pre_build.commands)
    .toContain('aws sts assume-role --role-arn \"arn:aws:role:to:assume\" --role-session-name \"my-session-name\" --external-id \"my-externa-id\" > $creds');
});

test('assume role not supported on windows', () => {
  const stack = new Stack();

  expect(() => new Shellable(stack, 'MyShellable', {
    scriptDirectory: path.join(__dirname, 'delivlib-tests/linux'),
    platform: ShellPlatform.Windows,
    entrypoint: 'test.sh',
    assumeRole: {
      roleArn: 'arn:aws:role:to:assume',
      sessionName: 'my-session-name'
    }
  })).toThrow('assumeRole is not supported on Windows');
});

test('alarm options - defaults', () => {
  const stack = new Stack();

  new Shellable(stack, 'MyShellable', {
    scriptDirectory: path.join(__dirname, 'delivlib-tests/linux'),
    entrypoint: 'test.sh',
  });

  assert(stack).to(haveResource('AWS::CloudWatch::Alarm', {
    EvaluationPeriods: 1,
    Threshold: 1,
    Period: 300
  }));
});

test('alarm options - custom', () => {
  const stack = new Stack();

  new Shellable(stack, 'MyShellable', {
    scriptDirectory: path.join(__dirname, 'delivlib-tests/linux'),
    entrypoint: 'test.sh',
    alarmEvaluationPeriods: 2,
    alarmThreshold: 5,
    alarmPeriodSec: 60 * 60
  });

  assert(stack).to(haveResource('AWS::CloudWatch::Alarm', {
    EvaluationPeriods: 2,
    Threshold: 5,
    Period: 3600
  }));
});

test('privileged mode', () => {
  const stack = new Stack();

  new Shellable(stack, 'AllowDocker', {
    scriptDirectory: path.join(__dirname, 'delivlib-tests/linux'),
    entrypoint: 'test.sh',
    privileged: true
  });

  assert(stack).to(haveResource('AWS::CodeBuild::Project', {
    Environment: {
      PrivilegedMode: true
    }
  }, ResourcePart.Properties, true));
});