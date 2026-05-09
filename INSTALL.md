# Installation

## Requirements

- Frappe Framework v15 or v16 (tested on v16.0.0-dev)
- Python 3.10+

## Frappe Cloud (Recommended)

Vault is published on the Frappe Cloud Marketplace. From your site dashboard:

1. **Apps** → search for **Vault**
2. **Install** on your site
3. Open the **Vault** workspace from Desk

That's it — Frappe Cloud handles the install, restart, and migrations for you.

## Self-Hosted

Use the standard Frappe app workflow on your bench:

1. Fetch this app into your bench from `https://github.com/chinmayzb/Frappe-vault` (branch `main`).
2. Install it onto the site you want to use it on.
3. Run a migration on that site.

Refer to the [Frappe Framework documentation](https://docs.frappe.io/framework/user/en/installation) for the exact CLI workflow used by your bench version.

The install creates the `Vault Admin`, `Vault Manager`, and `Vault Member` roles automatically.

## First Steps

1. Open the **Vault** workspace in Frappe Desk
2. Create a **Vault Credential Group** and assign an owner
3. Add members to the group with **View** or **Edit** access
4. Create **Vault Credential Entry** records inside the group
5. (Optional) Issue **Vault Access Grants** to users outside the group for ad-hoc access

## Running Tests

The app ships with 23 integration tests. Use the standard Frappe test runner against your site to execute them. Migrations are idempotent — safe to re-run.
