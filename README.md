Pulumi Deployment and Destruction with GitHub Actions

This guide provides instructions for deploying and destroying your Pulumi stack using GitHub Actions in a monorepo.

## Prerequisites

- Ensure you have the following configured in your GitHub repository:
  - Pulumi Access Token stored as a GitHub secret (`PULUMI_ACCESS_TOKEN`)
  - Node.js and Yarn configured in your Pulumi project

## GitHub Actions Workflow

The workflow is defined in the `.github/workflows/pulumi-deploy.yml` file.

### Workflow Structure

The workflow consists of two jobs:

1. **pulumi-deploy**: Deploys the Pulumi stack on pushes to the `master` branch.
2. **pulumi-destroy**: Destroys the Pulumi stack on pushes to the `destroy` branch or manual trigger.

## Deployment Instructions

1. **Push to `master`**: Push your changes to the `master` branch to trigger the deployment workflow.

   ```sh
   git add .
   git commit -m "Deploy to master"
   git push origin master
   ```

2. **GitHub Actions**: The workflow defined above will automatically run the `pulumi-deploy` job, which deploys the Pulumi stack.

## Destruction Instructions

1. **Push to `destroy`**: Push an empty commit to the `destroy` branch to trigger the destruction workflow.

   ```sh
   git checkout -b destroy
   git commit --allow-empty -m "Trigger destroy"
   git push origin destroy
   ```

2. **Manual Trigger**: You can also manually trigger the `pulumi-destroy` job from the GitHub Actions UI.
