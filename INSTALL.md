# Installation

## Requirements

- Frappe Framework v15 or v16 (tested on v16.0.0-dev)
- Python 3.10+
- Bench CLI

## Frappe Cloud (Recommended)

Vault is published on the Frappe Cloud Marketplace. From your site dashboard:

1. **Apps** → search for **Vault**
2. **Install** on your site
3. Open the **Vault** workspace from Desk

That's it — Frappe Cloud handles the install, restart, and migrations for you.

## Self-Hosted Bench

From the root of your bench directory:

```
bench get-app https://github.com/chinmayzb/Frappe-vault --branch main
bench --site <your-site> install-app vault
```

The install creates the `Vault Admin`, `Vault Manager`, and `Vault Member` roles automatically.

## First Steps

1. Open the **Vault** workspace in Frappe Desk
2. Create a **Vault Credential Group** and assign an owner
3. Add members to the group with **View** or **Edit** access
4. Create **Vault Credential Entry** records inside the group
5. (Optional) Issue **Vault Access Grants** to users outside the group for ad-hoc access

## Running Tests

After installation, from your bench directory:

```
bench --site <site> run-tests --app vault
```

## Upgrading

```
bench update --apps vault
bench --site <your-site> migrate
```

Migrations are idempotent — safe to re-run.
