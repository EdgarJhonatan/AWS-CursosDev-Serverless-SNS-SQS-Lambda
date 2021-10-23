import type { AWS } from "@serverless/typescript";

import destination from "@functions/destination";
import notify from "@functions/notify";

const serverlessConfiguration: AWS = {
  service: "snssqslambdav2",
  frameworkVersion: "2",
  custom: {
    webpack: {
      webpackConfig: "./webpack.config.js",
      includeModules: true,
    },
    sns: {
      arn: {
        Ref: "SNSSQS",
      },
      topicName: {
        "Fn::GetAtt": ["SNSSQS", "TopicName"],
      },
    },
  },
  plugins: ["serverless-webpack"],
  provider: {
    name: "aws",
    runtime: "nodejs14.x",
    region: "us-east-2",
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      SNS_PUBLISH: "${self:custom.sns.arn}",
      SNS_TOPIC_NAME: "${self:custom.sns.topicName}",
    },
    lambdaHashingVersion: "20201221",
    iam: {
      role: {
        statements: [
          {
            Effect: "Allow",
            Action: "SNS:Publish",
            Resource: "${self:custom.sns.arn}",
          },
        ],
      },
    },
  },
  // import the function via paths
  functions: { destination, notify },
  resources: {
    Resources: {
      SQSLambda: {
        Type: "AWS::SQS::Queue",
        Properties: {
          QueueName: "SQSLambda",
        },
      },
      SNSSQS: {
        Type: "AWS::SNS::Topic",
        Properties: {
          Subscription: [
            {
              Endpoint: { "Fn::GetAtt": ["SQSLambda", "Arn"] },
              Protocol: "sqs",
            },
          ],
          TopicName: "SNSSQS",
        },
      },
      SQSQueuePolicy: {
        Type: "AWS::SQS::QueuePolicy",
        Properties: {
          Queues: [{ Ref: "SQSLambda" }],
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: ["sqs:SendMessage"],
                Resource: "*",
                Principal: "*",
                Condition: {
                  ArnEquals: {
                    "aws:SourceArn": {
                      Ref: "SNSSQS",
                    },
                  },
                },
              },
            ],
          },
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
