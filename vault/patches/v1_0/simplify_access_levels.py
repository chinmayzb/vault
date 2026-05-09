"""
Consolidate the Read / Read + Reveal / Edit access levels down to View / Edit.

Both "Read" and "Read + Reveal" mapped to the same effective behaviour in code
(any group member could reveal a password), so the distinction was confusing
without changing access. This patch rewrites existing data to the simpler
two-level model.
"""

import frappe


def execute():
    if not frappe.db.table_exists("Vault Credential Group Member"):
        return

    # Map both legacy values to the new "View" level.
    frappe.db.sql(
        """
        UPDATE `tabVault Credential Group Member`
        SET access_level = 'View'
        WHERE access_level IN ('Read', 'Read + Reveal')
        """
    )
