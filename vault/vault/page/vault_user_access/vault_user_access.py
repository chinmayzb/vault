import frappe
import json


@frappe.whitelist()
def get_user_groups(user):
    """Return all active Vault Credential Groups the given user belongs to."""
    frappe.only_for(["Vault Admin", "System Manager"])

    rows = frappe.db.sql(
        """
        SELECT
            vcg.name        AS group_name,
            vcg.group_name  AS group_label,
            vcgm.name       AS member_row,
            vcgm.access_level
        FROM `tabVault Credential Group Member` vcgm
        INNER JOIN `tabVault Credential Group` vcg
            ON vcg.name = vcgm.parent
        WHERE vcgm.user = %s
          AND vcg.is_active = 1
        ORDER BY vcg.group_name
        """,
        user,
        as_dict=True,
    )
    return rows


@frappe.whitelist()
def remove_user_from_groups(user, groups):
    """Remove user from each of the listed Vault Credential Groups."""
    frappe.only_for(["Vault Admin", "System Manager"])

    if isinstance(groups, str):
        groups = json.loads(groups)

    removed = []
    for group_name in groups:
        doc = frappe.get_doc("Vault Credential Group", group_name)
        before = len(doc.members)
        doc.members = [m for m in doc.members if m.user != user]
        if len(doc.members) < before:
            doc.save(ignore_permissions=True)
            removed.append(group_name)

    frappe.db.commit()
    return {"removed": removed, "count": len(removed)}
