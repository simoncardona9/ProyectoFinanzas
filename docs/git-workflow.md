# Git and GitHub Workflow

## Ownership and current scope

- The repository will be hosted under the GitHub account **`simoncardona9`**.
- The repository name and remote URL will be configured when the repository is created.
- Until then, no code is pushed to GitHub and no cloud deployment is performed.
- All testing is performed locally during the current development phase.

## Protected long-lived branches

| Branch | Purpose | Who can merge into it |
|---|---|---|
| `main` | Approved, stable source of truth. | **Simon (`simoncardona9`) only.** |
| `qa` | Candidate changes ready for final local quality review. | Simon or an explicitly authorized maintainer. |
| `dev` | Integration branch for completed, locally tested features. | Project contributors through pull requests. |

## Short-lived working branches

Every implementation task starts from `dev` in a short-lived branch:

```text
feature/<short-description>
fix/<short-description>
docs/<short-description>
chore/<short-description>
```

Examples:

```text
feature/transaction-register
fix/usd-debt-balance
docs/api-contracts
```

Never develop directly on `main`, `qa`, or `dev`.

## Change flow

```text
feature or fix branch
        |
        | Pull request + local tests
        v
       dev
        |
        | Pull request + local QA review
        v
       qa
        |
        | Pull request approved by Simon; Simon performs merge
        v
      main
```

### 1. Working branch to `dev`

- The task is implemented on a feature/fix/docs/chore branch.
- Required local checks must pass before a pull request is opened.
- The pull request targets `dev` and describes the user outcome, tests run, and documentation changed.
- Only completed, scoped work enters `dev`.

### 2. `dev` to `qa`

- A pull request from `dev` to `qa` groups one or more completed slices for local quality review.
- The reviewer verifies the documented acceptance criteria using local test data.
- Financial calculations, authorization, and regression behavior must be specifically reviewed when affected.

### 3. `qa` to `main`

- **Nothing is pushed directly to `main`.**
- A pull request from `qa` to `main` is mandatory for every change.
- The pull request must be explicitly approved by **Simon (`simoncardona9`)**.
- **Simon is the only person who merges the pull request into `main`.**
- No agent, automation, or contributor may merge into `main`.

## Mandatory local checks

Before any pull request, run the project commands for:

1. Unit tests.
2. Type checking.
3. Linting and formatting checks.
4. Relevant manual functional test using local data.
5. Database migration validation, if the change includes a migration.

The exact commands will be added when the Node.js project is initialized. A pull request must state which commands were run and whether they passed.

## Pull-request requirements

Every pull request must include:

- Clear title and concise description.
- Linked development step or task.
- Summary of behavior and API/model changes.
- Tests added or updated, plus local commands executed.
- Financial-calculation impact, if any.
- Database migration and rollback/backup note, if any.
- Documentation updates, when architecture, API, business rules, or workflow change.

## GitHub configuration to apply when the repository is created

1. Create the repository under `simoncardona9`.
2. Set `main` as the default branch.
3. Create `dev` and `qa` branches.
4. Protect `main`: require pull requests, require Simon's approval, prohibit direct pushes, prohibit force pushes, and restrict merging to Simon.
5. Protect `qa`: require a pull request and prevent force pushes.
6. Protect `dev`: prevent force pushes and prefer pull requests for shared changes.
7. Do not enable automatic deployment workflows yet.
8. Do not commit `.env` files, credentials, real financial exports, or production data.

## Local-only phase

The project is intentionally in a local-development phase. It may be pushed to GitHub for source control, but it will not be deployed to a cloud environment until Simon explicitly approves a future deployment decision. GitHub Actions or other CI can be considered later; they are not required now and do not replace the mandatory local test process.
