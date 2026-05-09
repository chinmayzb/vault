frappe.pages["vault-user-access"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("User Access Manager"),
		single_column: true,
	});

	new VaultUserAccessPage(page, wrapper);
};

function VaultUserAccessPage(page, wrapper) {
	this.page = page;
	this.wrapper = wrapper;
	this.current_user = null;
	this.groups = [];
	this.selected = {};
	this._make();
}

VaultUserAccessPage.prototype._make = function () {
	var me = this;

	$(this.wrapper)
		.find(".page-content")
		.html(
			'<div class="vault-ua-wrap" style="padding:24px;max-width:920px;margin:0 auto">' +
				'<p class="text-muted" style="margin-bottom:16px">' +
				__(
					"Search for any user to see all Vault Credential Groups they belong to, change their access level, or revoke access — all in one place."
				) +
				"</p>" +
				'<div style="max-width:420px">' +
				'<label class="control-label" style="font-weight:600">' +
				__("User / Employee") +
				"</label>" +
				'<div id="vua-user-field"></div>' +
				"</div>" +
				'<div id="vua-summary" style="display:none;margin-top:24px"></div>' +
				'<div id="vua-results" style="display:none;margin-top:16px"></div>' +
				"</div>"
		);

	var last_loaded = null;
	var trigger_load = function () {
		var val = field.get_value();
		if (val && val !== last_loaded) {
			last_loaded = val;
			me._load(val);
		} else if (!val) {
			last_loaded = null;
			me._clear();
		}
	};

	var field = frappe.ui.form.make_control({
		df: {
			fieldtype: "Link",
			fieldname: "user",
			options: "User",
			placeholder: __("Type a name or email…"),
			// Frappe fires this AFTER Link validation succeeds — most reliable hook.
			change: trigger_load,
		},
		parent: $(me.wrapper).find("#vua-user-field")[0],
		render_input: true,
	});
	field.refresh();

	// Belt-and-braces: listen on the underlying input too, so any of
	// (autocomplete select, Tab/blur, Enter-without-selecting) all work.
	field.$input.on("change awesomplete-selectcomplete", trigger_load);
	field.$input.on("blur", function () {
		// Give Frappe's Link validator a tick to settle before reading value.
		setTimeout(trigger_load, 150);
	});

	this.field = field;
};

VaultUserAccessPage.prototype._load = function (user) {
	var me = this;
	me.current_user = user;
	me.selected = {};

	frappe.call({
		method: "vault.vault.page.vault_user_access.vault_user_access.get_user_summary",
		args: { user: user },
		callback: function (r) {
			me._render_summary(r.message || {});
		},
	});

	frappe.call({
		method: "vault.vault.page.vault_user_access.vault_user_access.get_user_groups",
		args: { user: user },
		freeze: true,
		freeze_message: __("Loading groups…"),
		callback: function (r) {
			me.groups = r.message || [];
			me._render(me.groups);
		},
	});
};

VaultUserAccessPage.prototype._render_summary = function (s) {
	var me = this;
	var $s = $(me.wrapper).find("#vua-summary");
	var roles_html = (s.vault_roles || []).map(function (r) {
		return '<span class="indicator-pill green" style="margin-right:4px">' + frappe.utils.escape_html(r) + "</span>";
	}).join("");
	if (!roles_html) {
		roles_html = '<span class="text-muted">' + __("No Vault roles assigned") + "</span>";
	}
	$s.html(
		'<div style="background:var(--bg-light-gray);border:1px solid var(--border-color);border-radius:8px;padding:14px 18px">' +
			'<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">' +
				"<div>" +
					'<div style="font-weight:600;font-size:14px">' +
					frappe.utils.escape_html(s.full_name || me.current_user) +
					'</div><div class="text-muted" style="font-size:12px">' +
					frappe.utils.escape_html(me.current_user) +
					"</div>" +
				"</div>" +
				'<div style="text-align:right;font-size:12px">' +
					'<div>' + __("Vault roles") + ":  " + roles_html + "</div>" +
					'<div class="text-muted" style="margin-top:4px">' +
					__("Owns {0} group(s) · {1} active grant(s)", [s.owns_groups || 0, s.active_grants || 0]) +
					"</div>" +
				"</div>" +
			"</div>" +
		"</div>"
	).show();
};

VaultUserAccessPage.prototype._render = function (groups) {
	var me = this;
	var $r = $(me.wrapper).find("#vua-results");

	if (!groups.length) {
		$r.html(
			'<div class="alert alert-warning">' +
				__("This user is not a member of any active Vault Credential Group.") +
				"</div>"
		).show();
		return;
	}

	var rows = groups
		.map(function (g) {
			var view_sel = g.access_level === "View" ? " selected" : "";
			var edit_sel = g.access_level === "Edit" ? " selected" : "";
			var legacy = (g.access_level === "Read" || g.access_level === "Read + Reveal");
			var legacy_note = legacy
				? '<div class="text-muted" style="font-size:11px;margin-top:2px">' +
				  __("legacy: {0}", [frappe.utils.escape_html(g.access_level)]) +
				  "</div>"
				: "";
			return (
				"<tr>" +
				'<td style="width:36px;text-align:center;vertical-align:middle">' +
				'<input type="checkbox" class="vua-cb" data-group="' +
				frappe.utils.escape_html(g.group_name) +
				'" />' +
				"</td>" +
				'<td style="vertical-align:middle"><b>' +
				frappe.utils.escape_html(g.group_label || g.group_name) +
				"</b></td>" +
				'<td style="vertical-align:middle;width:160px">' +
				'<select class="form-control input-sm vua-access" data-group="' +
				frappe.utils.escape_html(g.group_name) +
				'" data-original="' +
				frappe.utils.escape_html(g.access_level) +
				'">' +
				'<option value="View"' + view_sel + ">View</option>" +
				'<option value="Edit"' + edit_sel + ">Edit</option>" +
				"</select>" +
				legacy_note +
				"</td>" +
				'<td style="vertical-align:middle;width:160px">' +
				'<a href="/app/vault-credential-group/' +
				encodeURIComponent(g.group_name) +
				'" target="_blank" class="btn btn-xs btn-default">' +
				__("Open Group") +
				"</a>" +
				"</td>" +
				"</tr>"
			);
		})
		.join("");

	$r.html(
		'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
			"<span>" +
			__("Group memberships") +
			' &nbsp;<span class="badge">' + groups.length + "</span>" +
			"</span>" +
			'<div style="display:flex;gap:8px">' +
			'<button class="btn btn-sm btn-danger" id="vua-remove-sel" disabled>' +
			__("Remove from Selected") +
			"</button>" +
			'<button class="btn btn-sm btn-outline-danger" id="vua-remove-all">' +
			__("Remove from All ({0})", [groups.length]) +
			"</button>" +
			"</div>" +
			"</div>" +
			'<table class="table table-bordered table-sm">' +
			"<thead><tr>" +
			'<th style="width:36px;text-align:center">' +
			'<input type="checkbox" id="vua-sel-all" title="' + __("Select All") + '" />' +
			"</th>" +
			"<th>" + __("Group") + "</th>" +
			"<th>" + __("Access Level") + "</th>" +
			"<th></th>" +
			"</tr></thead>" +
			"<tbody>" + rows + "</tbody>" +
			"</table>" +
			'<p class="text-muted" style="font-size:12px">' +
			__("Tip: change the access level inline — it saves automatically. <b>View</b> = read & copy passwords. <b>Edit</b> = also modify credentials.") +
			"</p>"
	).show();

	// Select all
	$r.find("#vua-sel-all").on("change", function () {
		var checked = $(this).prop("checked");
		$r.find(".vua-cb").prop("checked", checked);
		me.selected = {};
		if (checked) {
			groups.forEach(function (g) {
				me.selected[g.group_name] = true;
			});
		}
		me._update_btn();
	});

	// Individual checkbox
	$r.on("change", ".vua-cb", function () {
		var g = $(this).data("group");
		if ($(this).prop("checked")) {
			me.selected[g] = true;
		} else {
			delete me.selected[g];
			$r.find("#vua-sel-all").prop("checked", false);
		}
		me._update_btn();
	});

	// Inline access-level change
	$r.on("change", ".vua-access", function () {
		var $sel = $(this);
		var group = $sel.data("group");
		var original = $sel.data("original");
		var new_level = $sel.val();
		if (new_level === original) return;
		me._update_access(group, new_level, $sel, original);
	});

	// Remove selected
	$r.find("#vua-remove-sel").on("click", function () {
		var sel = Object.keys(me.selected);
		if (!sel.length) return;
		me._confirm_remove(sel);
	});

	// Remove all
	$r.find("#vua-remove-all").on("click", function () {
		me._confirm_remove(groups.map(function (g) { return g.group_name; }));
	});
};

VaultUserAccessPage.prototype._update_btn = function () {
	var count = Object.keys(this.selected).length;
	var $btn = $(this.wrapper).find("#vua-remove-sel");
	if (count > 0) {
		$btn.prop("disabled", false).text(__("Remove from Selected ({0})", [count]));
	} else {
		$btn.prop("disabled", true).text(__("Remove from Selected"));
	}
};

VaultUserAccessPage.prototype._update_access = function (group, new_level, $sel, original) {
	var me = this;
	frappe.call({
		method: "vault.vault.page.vault_user_access.vault_user_access.update_access_level",
		args: {
			user: me.current_user,
			group: group,
			access_level: new_level,
		},
		callback: function (r) {
			if (r.message && r.message.updated) {
				$sel.data("original", new_level);
				frappe.show_alert({
					message: __("Access level updated to <b>{0}</b>", [new_level]),
					indicator: "green",
				});
			}
		},
		error: function () {
			$sel.val(original);
			frappe.show_alert({
				message: __("Failed to update access level"),
				indicator: "red",
			});
		},
	});
};

VaultUserAccessPage.prototype._confirm_remove = function (group_names) {
	var me = this;
	frappe.confirm(
		__(
			"Remove <b>{0}</b> from <b>{1}</b> group(s)?<br><br>" +
			"Their access to credentials in those groups will be revoked immediately.",
			[frappe.utils.escape_html(me.current_user), group_names.length]
		),
		function () {
			frappe.call({
				method: "vault.vault.page.vault_user_access.vault_user_access.remove_user_from_groups",
				args: {
					user: me.current_user,
					groups: JSON.stringify(group_names),
				},
				freeze: true,
				freeze_message: __("Removing access…"),
				callback: function (r) {
					var res = r.message || {};
					frappe.show_alert({
						message: __("Removed from {0} group(s) successfully.", [res.count || 0]),
						indicator: "green",
					});
					me._load(me.current_user);
				},
			});
		}
	);
};

VaultUserAccessPage.prototype._clear = function () {
	$(this.wrapper).find("#vua-summary").hide().empty();
	$(this.wrapper).find("#vua-results").hide().empty();
	this.current_user = null;
	this.groups = [];
	this.selected = {};
};
