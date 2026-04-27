function toggle_reset_due(frm) {
    var has_interval = !!frm.doc.password_reset_interval;
    frm.set_df_property("password_reset_due", "hidden", !has_interval);
    if (has_interval && frm.doc.password_reset_due) {
        var due = frappe.datetime.str_to_obj(frm.doc.password_reset_due);
        var today = frappe.datetime.str_to_obj(frappe.datetime.get_today());
        var overdue = due < today;
        frm.get_field("password_reset_due").set_description(
            overdue
                ? '<span style="color:var(--red-500)">&#9888; Overdue — rotate the password now</span>'
                : '<span style="color:var(--green-500)">&#10003; On schedule</span>'
        );
    }
}

var ICON_COPY = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="9" height="11" rx="1.5"/><path d="M4 4V3a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-1"/></svg>';
var ICON_CHECK = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--green-500)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 8 6 12 14 4"/></svg>';
var ICON_EYE = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="8" cy="8" rx="7" ry="4.5"/><circle cx="8" cy="8" r="2"/></svg>';

function flash_copied($btn, original_html) {
    $btn.html(ICON_CHECK + " Copied!").css("color", "var(--green-500)");
    setTimeout(function () { $btn.html(original_html).css("color", ""); }, 2000);
}

function render_credential_actions(frm) {
    if (frm.is_new()) return;

    // ── Username: inline Copy button ──────────────────────────────
    var $uw = frm.fields_dict["username"].$wrapper;
    $uw.find(".vault-copy-username").remove();
    $uw.css("position", "relative");

    var $copy_un = $('<button class="vault-copy-username btn btn-xs btn-default" title="Copy username" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:4px;padding:3px 8px;z-index:10">' + ICON_COPY + " Copy</button>");
    $copy_un.appendTo($uw).on("click", function () {
        var $btn = $(this);
        frappe.call({
            method: "vault.api.copy_username",
            args: { credential: frm.doc.name },
            callback: function (r) {
                if (r.message && r.message.username) {
                    frappe.utils.copy_to_clipboard(r.message.username);
                    flash_copied($btn, ICON_COPY + " Copy");
                }
            }
        });
    });

    // ── Password: Copy + Reveal buttons ──────────────────────────
    var $pw = frm.fields_dict["password"].$wrapper;
    $pw.find(".vault-pw-actions").remove();

    var $actions = $('<div class="vault-pw-actions" style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"></div>').appendTo($pw);

    // Copy Password
    var $copy_pw = $('<button class="vault-copy-pw btn btn-sm btn-default" style="display:flex;align-items:center;gap:5px">' + ICON_COPY + " Copy Password</button>");
    $copy_pw.appendTo($actions).on("click", function () {
        var $btn = $(this);
        frappe.call({
            method: "vault.api.copy_password",
            args: { credential: frm.doc.name },
            callback: function (r) {
                if (r.message && r.message.password) {
                    frappe.utils.copy_to_clipboard(r.message.password);
                    flash_copied($btn, ICON_COPY + " Copy Password");
                } else {
                    frappe.show_alert({ message: __("You don't have permission to copy this password"), indicator: "red" });
                }
            }
        });
    });

    // Reveal / hide toggle
    var $reveal = $('<button class="vault-reveal-pw btn btn-sm btn-default" style="display:flex;align-items:center;gap:5px">' + ICON_EYE + " Reveal</button>");
    $reveal.appendTo($actions).on("click", function () {
        var $existing = $pw.find(".vault-pw-reveal-box");
        if ($existing.length) {
            $existing.remove();
            $reveal.html(ICON_EYE + " Reveal").css("color", "");
            return;
        }
        frappe.call({
            method: "vault.api.reveal_password",
            args: { credential: frm.doc.name },
            callback: function (r) {
                if (!r.message || !r.message.password) {
                    frappe.show_alert({ message: __("You don't have permission to reveal this password"), indicator: "red" });
                    return;
                }
                var pw = frappe.utils.escape_html(r.message.password);
                var ttl = r.message.ttl_seconds || 30;

                var $box = $('<div class="vault-pw-reveal-box" style="margin-top:8px;display:flex;align-items:center;gap:8px;background:var(--fg-color);border:1px solid var(--border-color);border-radius:6px;padding:8px 12px">'
                    + '<code style="font-size:13px;letter-spacing:0.05em;flex:1;word-break:break-all">' + pw + '</code>'
                    + '<button class="vault-copy-revealed btn btn-xs btn-default" style="flex-shrink:0;display:flex;align-items:center;gap:4px">' + ICON_COPY + ' Copy</button>'
                    + '<small class="vault-ttl-wrap" style="color:var(--text-muted);flex-shrink:0">hides in <span class="vault-ttl">' + ttl + '</span>s</small>'
                    + '</div>');
                $box.appendTo($pw);

                $reveal.html(ICON_EYE + " Hide").css("color", "var(--blue-500)");

                var plain_pw = r.message.password;
                $box.find(".vault-copy-revealed").on("click", function () {
                    frappe.utils.copy_to_clipboard(plain_pw);
                    flash_copied($(this), ICON_COPY + " Copy");
                });

                var remaining = ttl;
                var timer = setInterval(function () {
                    remaining--;
                    $box.find(".vault-ttl").text(remaining);
                    if (remaining <= 0) {
                        clearInterval(timer);
                        $box.fadeOut(400, function () { $box.remove(); });
                        $reveal.html(ICON_EYE + " Reveal").css("color", "");
                    }
                }, 1000);
            }
        });
    });
}

frappe.ui.form.on("Vault Credential Entry", {
    refresh: function (frm) {
        toggle_reset_due(frm);
        render_credential_actions(frm);
    },
    password_reset_interval: function (frm) {
        toggle_reset_due(frm);
    }
});
