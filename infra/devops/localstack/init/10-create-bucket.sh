#!/bin/sh
set -eu

BUCKET_NAME="${S3_BUCKET_NAME:-split-bill-local}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

if awslocal s3api head-bucket --bucket "$BUCKET_NAME" >/dev/null 2>&1; then
  echo "Bucket already exists: $BUCKET_NAME"
  exit 0
fi

awslocal s3api create-bucket \
  --bucket "$BUCKET_NAME" \
  --region "$REGION" >/dev/null

echo "Created bucket: $BUCKET_NAME"
