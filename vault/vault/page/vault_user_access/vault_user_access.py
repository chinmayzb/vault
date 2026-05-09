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

    return {"removed": removed, "count": len(removed)}


@frappe.whitelist()
def update_access_level(user, group, access_level):
    """Change a user's access level inside a single group."""
    frappe.only_for(["Vault Admin", "System Manager"])

    if access_level not in ("View", "Edit"):
        frappe.throw(f"Invalid access level: {access_level}")

    doc = frappe.get_doc("Vault Credential Group", group)
    changed = False
    for member in doc.members:
        if member.user == user:
            if member.access_level != access_level:
                member.access_level = access_level
                changed = True
            break
    else:
        frappe.throw(f"{user} is not a member of {group}")

    if changed:
        doc.save(ignore_permissions=True)

    return {"updated": changed, "access_level": access_level}


@frappe.whitelist()
def get_user_summary(user):
    """Return a quick summary of a user's Vault footprint."""
    frappe.only_for(["Vault Admin", "System Manager"])

    full_name = frappe.db.get_value("User", user, "full_name") or user
    roles = frappe.get_roles(user) or []
    vault_roles = sorted([r for r in roles if r.startswith("Vault ")])

    owns_groups = frappe.db.count("Vault Credential Group", {"owner_user": user})

    active_grants = frappe.db.count(
        "Vault Access Grant", {"user": user, "is_active": 1}
    )

    return {
        "full_name": full_name,
        "vault_roles": vault_roles,
        "owns_groups": owns_groups,
        "active_grants": active_grants,
    }
