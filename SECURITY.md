# Security Policy

## Reporting a Vulnerability

Security vulnerabilities in Galacius should be reported responsibly and confidentially. We appreciate your help in keeping our project secure.

### Primary Reporting Channel

Please use GitHub's private vulnerability reporting feature for the `galacius/galacius` repository:

1. Go to the [Security tab](https://github.com/galacius/galacius/security) on the repository
2. Select **"Report a vulnerability"**
3. Fill out the vulnerability report form

This ensures your report reaches maintainers confidentially and initiates a coordinated disclosure process.

### Do Not Report Publicly

**Please do not report security vulnerabilities through public GitHub Issues.** Public disclosure can put the entire user base at risk before a fix is available.

### What to Include

When reporting a vulnerability, please provide:

- A clear description of the vulnerability and its impact
- Steps to reproduce the issue (if applicable)
- Affected version(s) of Galacius
- Any suggested remediation or fix (optional but helpful)

## Response Expectations

Once you submit a vulnerability report via GitHub Security Advisories:

- We will acknowledge receipt within a few business days
- We will investigate and assess the severity
- We will work with you to coordinate disclosure timing and release of a patch
- We will keep you informed throughout the process

## Supported Versions

<!-- update this table as release policy evolves -->

Currently, only the latest released version of Galacius is actively supported with security updates. As the project matures, a more detailed version support policy may be established.

## Security Considerations for Developers

If you are contributing code to Galacius:

- Avoid hardcoding secrets or API keys; use environment variables
- Apply the principle of least privilege (e.g., Kubernetes RBAC, file permissions)
- Follow Go and TypeScript security best practices
- Review the `CONTRIBUTING.md` file for coding standards and patterns

## Questions or Concerns?

If you have general security questions or feedback on this policy, please contact the maintainers through the GitHub repository. As the project grows, we may establish a dedicated security contact email.

Thank you for helping to keep Galacius secure!
