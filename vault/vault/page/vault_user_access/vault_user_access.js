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
			'<div class="vault-ua-wrap" style="padding:24px;max-width:860px;margin:0 auto">' +
				'<p class="text-muted" style="margin-bottom:16px">' +
				__("Search for a user to view and manage all their Vault Credential Group memberships.") +
				"</p>" +
				'<div style="max-width:420px">' +
				'<label class="control-label" style="font-weight:600">' + __("User / Employee") + "</label>" +
				'<div id="vua-user-field"></div>' +
				"</div>" +
				'<div id="vua-results" style="display:none;margin-top:28px"></div>' +
				"</div>"
		);

	var field = frappe.ui.form.make_control({
		df: {
			fieldtype: "Link",
			fieldname: "user",
			options: "User",
			placeholder: __("Type a name or email…"),
		},
		parent: $(me.wrapper).find("#vua-user-field")[0],
		render_input: true,
	});
	field.refresh();

	field.$input.on("change", function () {
		var val = field.get_value();
		if (val) {
			me._load(val);
		} else {
			me._clear();
		}
	});

	this.field = field;
};

VaultUserAccessPage.prototype._load = function (user) {
	var me = this;
	me.current_user = user;
	me.selected = {};

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

VaultUserAccessPage.prototype._render = function (groups) {
	var me = this;
	var $r = $(me.wrapper).find("#vua-results");

	if (!groups.length) {
		$r.html(
			'<div class="alert alert-warning">' +
				__("{0} does not belong to any active Vault Credential Group.", [
					"<b>" + frappe.utils.escape_html(me.current_user) + "</b>",
				]) +
				"</div>"
		).show();
		return;
	}

	var ACCESS_COLOR = { "Read": "grey", "Read + Reveal": "blue", "Edit": "orange" };

	var rows = groups
		.map(function (g) {
			var color = ACCESS_COLOR[g.access_level] || "grey";
			return (
				"<tr>" +
				'<td style="width:36px;text-align:center">' +
				'<input type="checkbox" class="vua-cb" data-group="' +
				frappe.utils.escape_html(g.group_name) +
				'" />' +
				"</td>" +
				"<td><b>" + frappe.utils.escape_html(g.group_label || g.group_name) + "</b></td>" +
				'<td><span class="indicator-pill ' + color + '">' +
				frappe.utils.escape_html(g.access_level) +
				"</span></td>" +
				"<td>" +
				'<a href="/app/vault-credential-group/' +
				encodeURIComponent(g.group_name) +
				'" target="_blank" class="btn btn-xs btn-default">' +
				__("Open") +
				"</a>" +
				"</td>" +
				"</tr>"
			);
		})
		.join("");

	$r.html(
		'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
			"<span>" +
			__("Groups for") +
			" <b>" + frappe.utils.escape_html(me.current_user) + "</b>" +
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
			"</table>"
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
	$(this.wrapper).find("#vua-results").hide().empty();
	this.current_user = null;
	this.groups = [];
	this.selected = {};
};
