# Security

- ECS has no public IP and RDS is private and encrypted.
- Database security groups allow only the ECS/Lambda application security groups, either directly or through the optional RDS Proxy.
- Browser-supplied identity is never trusted; JWT `sub` is derived server-side.
- The RDS-managed credential is stored in Secrets Manager, encrypted with KMS, and not embedded in Terraform state; runtime roles retrieve it by ARN.
- S3 is private and CloudFront uses OAC.
- GitHub Actions uses OIDC, never static AWS access keys.
- The deployment role is limited to trusted deployment refs. Same-repository Terraform pull-request plans use a separate read-only role with a pull-request-specific OIDC subject; forked pull requests do not receive AWS credentials.
- ECS containers run as a non-root user and CloudWatch logs expire after 7 days in dev.
