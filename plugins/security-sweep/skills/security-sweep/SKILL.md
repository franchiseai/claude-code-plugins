---
name: security-sweep
description: Run a security audit of the codebase and produce a prioritised findings report. Optionally scope to a specific domain (e.g. /security-sweep auth). Outputs to docs/security/.
user_invocable: true
---

# Security Sweep

You are acting as a senior application security engineer performing an internal security sweep of this SaaS codebase. The stack is:

- **Backend:** Node.js / Express, Drizzle ORM, PostgreSQL (Supabase), Redis, Inngest
- **Frontend:** React 19 / Vite, Tailwind CSS, Zustand, TanStack Query
- **Infrastructure:** AWS (S3, SQS, Lambda), Vercel, Supabase
- **Monorepo:** Yarn workspaces + Turborepo

## Scope

{{#if args}}
**Scoped sweep:** Focus on the `{{args}}` domain/area. Search for relevant files in `apps/backend/src/api/{{args}}/`, related SDK services in `packages/sdk/src/services/`, related frontend pages/components, and any shared code touched by this domain.
{{else}}
**Full sweep:** Audit the entire codebase across all categories below. Prioritise `apps/backend/` and `packages/sdk/` but also review frontend apps, infrastructure config, and shared packages.
{{/if}}

## Rules

- **NEVER read `.env` files.** You may read `.env.example` files only.
- **NEVER interact with GitHub** (no PRs, issues, comments, or API calls).
- **NEVER make code changes.** This is a read-only audit.
- **NEVER run destructive commands.**
- Be thorough — don't skip files because they look low-risk.
- If you cannot access a file or directory, note it and move on.

---

## Two-Pass Methodology

This sweep uses a two-pass approach to minimise false positives:

### Pass 1: Breadth Scan

Launch parallel agents to pattern-match across the codebase. Each agent covers a cluster of audit categories (see below). Findings are reported at face value based on code at the point of use.

### Pass 2: Depth Verification

For every High+ finding from Pass 1, launch verification agents to check each finding against six criteria:

1. **Trace data flow upstream** — Where does the input actually originate? Is it user-controlled, admin-only, system-generated, or hardcoded? A `dangerouslySetInnerHTML` with admin-only content is very different from one with user input.
2. **Trace data flow downstream** — Does the output reach a dangerous sink, or is it intercepted by middleware, validation, or sanitisation before it gets there?
3. **Check for parallel/alternative controls** — Is there a separate auth system, upstream WAF, infrastructure-level protection, or compensating control that mitigates the finding? (e.g., a cookie-session vulnerability doesn't matter if auth uses a completely separate token system)
4. **Check if the feature is active** — Is the code vestigial/dead? Is a gate disabled? Is a flag defaulted to safe? Dead code with a vulnerability is Informational, not Critical.
5. **Check production configuration** — Is the env var actually set in production (check `infra/` stacks)? Does infrastructure compensate? A "missing secret" finding is moot if the secret is configured via `config.requireSecret()`.
6. **Assess practical exploitability** — What does an attacker need to exploit this? Auth? Network access? Timing? Multiple steps? How realistic is the full attack chain end-to-end?

After verification, adjust severities. Include both the initial and verified severity in the report so the methodology is transparent.

**Severity scale after verification:**
- **High:** Confirmed exploitable with realistic attack chain
- **Medium:** Real issue but mitigating factors reduce risk or exploitability
- **Low:** Valid concern but impractical to exploit, or compensating controls exist
- **Informational:** Dead code, by-design behaviour, or standard practice flagged by pattern matching

---

## Audit Categories (Pass 1)

Work through each category. For each finding, report:

- **Severity:** Critical / High / Medium / Low
- **Category:** (e.g. Auth, Injection, Secrets, etc.)
- **Location:** File path and line number(s)
- **Description:** What the vulnerability is and why it's dangerous
- **Recommendation:** The specific fix, with a code example where helpful

### 1. Secrets & Credentials

- Search for hardcoded API keys, tokens, passwords, or secrets anywhere in the codebase (JS, TS, JSON, YAML, config files, test files)
- Check `.env.example` files — do they contain real values instead of placeholders?
- Check if any secrets are referenced in committed config or README files
- Verify `.env` and secret files are in `.gitignore`
- Check AWS credentials — are they hardcoded anywhere instead of using IAM roles or environment variables?

### 2. Authentication & Session Management

- Review the auth implementation (JWT, session cookies, OAuth, Supabase Auth, etc.)
  - Are JWTs verified with a strong secret? Is `alg: none` rejected?
  - Are JWT expiry times reasonable (not excessively long)?
  - Are refresh tokens stored and rotated securely?
- Check for missing or weak password hashing (must be bcrypt, argon2, or scrypt — not MD5/SHA1/plain)
- Review session cookie flags: `HttpOnly`, `Secure`, `SameSite` should all be set
- Check for account enumeration vulnerabilities in login/signup endpoints
- Look for missing rate limiting on login, signup, and password reset endpoints
- Check password reset flows — are tokens single-use, time-limited, and cryptographically random?

### 3. Authorisation & Access Control

- Review API routes — does every protected route have authentication middleware applied?
- Check for Broken Object Level Authorisation (BOLA/IDOR): when a user fetches `/api/resource/:id`, does the code verify the resource belongs to that user/org?
- Check for Broken Function Level Authorisation: are admin-only endpoints protected separately from user endpoints?
- Review multi-tenancy logic — can a user from Org A access data from Org B?
- Check if user roles/permissions are validated server-side (not just in the frontend)

### 4. Injection Vulnerabilities

- **SQL Injection:** Review database queries — are they using Drizzle ORM parameterised queries? Flag any raw string concatenation in SQL or `sql.raw()` with user input
- **Command Injection:** Check for any use of `exec`, `spawn`, `eval` with user-supplied input
- **XSS:** Review React components — is `dangerouslySetInnerHTML` used anywhere? If so, is it sanitised?
- **Template Injection:** Check any server-side templating (email templates, etc.) for unsanitised input

### 5. Input Validation & Data Handling

- Are all API request bodies validated (schema validation with zod, joi, etc.)?
- Are file upload endpoints restricted by file type and size?
- Are there any endpoints that accept and process arbitrary JSON without validation?
- Check for mass assignment vulnerabilities — can users update fields they shouldn't (e.g. `role`, `isAdmin`)?

### 6. API Security

- Review CORS configuration — is `Access-Control-Allow-Origin: *` set in production?
- Check for missing security headers: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`
- Are internal/admin API routes on a separate path or service, unexposed to the public?
- Check rate limiting — is it applied globally and/or on sensitive endpoints?
- Review error responses — do they leak stack traces, SQL errors, or internal paths in production?

### 7. Dependency Vulnerabilities

- Flag any packages in `package.json` files with known critical or high CVEs based on your training knowledge
- Highlight any packages that are significantly outdated (major versions behind)
- Note any packages that appear abandoned or unmaintained
- Check if `yarn.lock` is committed (it should be)

### 8. AWS & Cloud Configuration

- Check Infrastructure-as-Code files (CDK, CloudFormation, Terraform, serverless config) for:
  - S3 buckets — are any configured as publicly readable/writable?
  - Security groups — are any overly permissive?
  - IAM roles — do they follow least-privilege?
  - Secrets Manager / SSM usage vs hardcoded secrets
- Check environment variable handling in Lambda or ECS task definitions
- Look for AWS account IDs, ARNs, or region info hardcoded in frontend bundles

### 9. Database Security

- Is the database connection using SSL/TLS in production?
- Are database credentials stored securely (not hardcoded)?
- Review database schemas — is sensitive data (passwords, PII, payment info) stored appropriately?
- Check if any database admin interfaces are exposed publicly

### 10. Logging & Monitoring

- Check logging implementations — are passwords, tokens, or PII being logged?
- Are errors in production returning sanitised messages to the client?
- Is there any logging of sensitive request bodies (e.g. login payloads)?

### 11. Frontend Security (Vite / React)

- Check Vite config (`vite.config.ts`) — are any security-relevant settings misconfigured?
- Review client-side storage — are JWTs or sensitive tokens stored in `localStorage` (vulnerable to XSS) rather than HttpOnly cookies?
- Check for exposed environment variables — are any `VITE_` prefixed vars leaking secrets?
- Look for any sensitive logic or API keys bundled into the client-side JS
- Check for `dangerouslySetInnerHTML` usage and whether input is sanitised

---

## Output

When you have completed both passes, do two things:

### 1. Write the report

Save the full report to `docs/security/YYYY-MM-DD-security-sweep.md` using today's date. Use this format:

```markdown
# Security Sweep Report — YYYY-MM-DD
{{#if args}}
**Scope:** {{args}}
{{else}}
**Scope:** Full codebase
{{/if}}
**Methodology:** Two-pass analysis — breadth scan followed by depth verification

## Summary
- **High:** X | **Medium:** X | **Low:** X | **Informational:** X
- **Top 3 issues to address:**
  1. ...
  2. ...
  3. ...

> **Methodology note:** Initial breadth scan identified X High+ findings.
> Depth verification reduced most severities. This report reflects verified severities.

## Findings

### [VERIFIED SEVERITY] Category — Short Title
**Location:** `path/to/file.ts:line`
**Description:** ...
**Mitigating factors:** ... (what the verification pass found)
**Recommendation:** ...

---

(repeat for each finding)

## What Looks Good
List areas where the implementation appears solid.

## Suggested Next Steps
Prioritised list of remediation actions grouped by priority.

## Verification Methodology
Include the Pass 1 → Pass 2 severity change table showing how findings shifted after verification.
```

### 2. Tell the user

After writing the report, tell the user:
- The file path where the report was saved
- The summary counts by severity
- The top 3 issues to address
- How many findings were downgraded during verification (e.g., "Initial scan found 3 Critical + 10 High; after verification: 0 Critical, 1 High")
