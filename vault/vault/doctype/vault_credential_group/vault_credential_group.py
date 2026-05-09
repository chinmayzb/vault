import frappe
from frappe.model.document import Document

def _ensure_vault_roles(members):
    for row in members:
        required_role = _ACCESS_ROLE.get(row.access_level, "Vault Member")
        user_doc = frappe.get_doc("User", row.user)
        existing = {r.role for r in user_doc.roles}
        if required_role not in existing:
            user_doc.append("roles", {"role": required_role})
            user_doc.save(ignore_permissions=True)
            frappe.msgprint(
                f"Role <b>{required_role}</b> assigned to {row.user}",
                indicator="green",
                alert=True,
            )


_ACCESS_ROLE = {
    "View": "Vault Member",
    "Edit": "Vault Manager",
    # Legacy values still supported in old data until the migration patch runs
    "Read": "Vault Member",
    "Read + Reveal": "Vault Member",
}


class VaultCredentialGroup(Document):
    def validate(self):
        seen = set()
        for row in (self.members or []):
            if row.user in seen:
                frappe.throw(f"Duplicate member: {row.user}")
            seen.add(row.user)

    def on_update(self):
        _ensure_vault_roles(self.members or [])
