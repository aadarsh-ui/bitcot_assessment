# CI/CD

Pull requests run lint, type checking, tests, builds, and Terraform/SAM validation. A push to `main` runs validation and deploys the SAM Lambda functions, ECS service, and React frontend to the single development environment using GitHub OIDC.

The production workflow is currently a placeholder: it runs checks but does not deploy. The assessment environment is therefore the dev deployment; do not describe it as a separate production deployment. This branch adds a deploy step to set Lambda log groups to 14-day retention and a narrowly scoped `logs:PutRetentionPolicy` permission. Apply the Terraform IAM policy change before running the updated deploy workflow in GitHub.
