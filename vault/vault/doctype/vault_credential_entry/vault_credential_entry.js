function toggle_reset_due(frm) {
    const has_interval = !!frm.doc.password_reset_interval;
    frm.set_df_property("password_reset_due", "hidden", !has_interval);
    if (has_interval && frm.doc.password_reset_due) {
        const due = frappe.datetime.str_to_obj(frm.doc.password_reset_due);
        const today = frappe.datetime.str_to_obj(frappe.datetime.get_today());
        const overdue = due < today;
        frm.get_field("password_reset_due").set_description(
            overdue
                ? `<span style="color:var(--red-500)">Overdue — rotate the password now</span>`
                : `<span style="color:var(--green-500)">On schedule</span>`
        );
    }
}

function render_credential_actions(frm) {
    if (frm.is_new()) return;

    // ── Username row ──────────────────────────────────────────────
    const $username_wrap = frm.fields_dict["username"].$wrapper;
    $username_wrap.find(".vault-copy-username").remove();
    $username_wrap.css("position", "relative");

    $(`<button class="vault-copy-username btn btn-xs btn-default"
            title="Copy username"
            style="position:absolute;right:4px;top:50%;transform:translateY(-50%);
                   display:flex;align-items:center;gap:4px;padding:3px 8px;z-index:10">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="4" width="9" height="11" rx="1.5"/>
            <path d="M4 4V3a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-1"/>
        </svg>
        Copy
    </button>`)
        .appendTo($username_wrap)
        .on("click", function () {
            frappe.call({
                method: "vault.api.copy_username",
                args: { credential: frm.doc.name },
                callback(r) {
                    if (r.message?.username) {
                        navigator.clipboard.writeText(r.message.username).then(() => {
                            const $btn = $(this);
                            $btn.html(`<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--green-500)"
                                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                           <polyline points="2 8 6 12 14 4"/>
                                       </svg> Copied!`).css("color", "var(--green-500)");
                            setTimeout(() => $btn.html(`<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                                                              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                                             <rect x="4" y="4" width="9" height="11" rx="1.5"/>
                                                             <path d="M4 4V3a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-1"/>
                                                         </svg> Copy`).css("color", ""), 2000);
                        });
                    }
                }.bind(this),
            });
        });

    // ── Password row ──────────────────────────────────────────────
    const $pw_wrap = frm.fields_dict["password"].$wrapper;
    $pw_wrap.find(".vault-pw-actions").remove();

    const $pw_actions = $(`<div class="vault-pw-actions"
            style="display:flex;gap:6px;margin-top:6px"></div>`).appendTo($pw_wrap);

    // Copy password button
    $(`<button class="btn btn-sm btn-default vault-copy-pw"
            style="display:flex;align-items:center;gap:5px">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="4" width="9" height="11" rx="1.5"/>
            <path d="M4 4V3a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-1"/>
        </svg>
        Copy Password
    </button>`)
        .appendTo($pw_actions)
        .on("click", function () {
            frappe.call({
                method: "vault.api.copy_password",
                args: { credential: frm.doc.name },
                callback(r) {
                    if (r.message?.password) {
                        navigator.clipboard.writeText(r.message.password).then(() => {
                            const $btn = $(this);
                            $btn.html(`<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--green-500)"
                                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                           <polyline points="2 8 6 12 14 4"/>
                                       </svg> Copied!`).css("color", "var(--green-500)");
                            setTimeout(() => $btn.html(`<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                                                              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                                             <rect x="4" y="4" width="9" height="11" rx="1.5"/>
                                                             <path d="M4 4V3a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-1"/>
                                                         </svg> Copy Password`).css("color", ""), 2000);
                        });
                    } else {
                        frappe.show_alert({ message: __("You don't have permission to copy this password"), indicator: "red" });
                    }
                }.bind(this),
            });
        });

    // Reveal / peek button
    $(`<button class="btn btn-sm btn-default vault-reveal-pw"
            style="display:flex;align-items:center;gap:5px">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="8" cy="8" rx="7" ry="4.5"/>
            <circle cx="8" cy="8" r="2"/>
        </svg>
        Reveal
    </button>`)
        .appendTo($pw_actions)
        .on("click", function () {
            const $btn = $(this);
            const already_showing = $pw_wrap.find(".vault-pw-reveal-box").length;

            if (already_showing) {
                $pw_wrap.find(".vault-pw-reveal-box").remove();
                $btn.find("span").text("Reveal");
                return;
            }

            frappe.call({
                method: "vault.api.reveal_password",
                args: { credential: frm.doc.name },
                callback(r) {
                    if (!r.message?.password) {
                        frappe.show_alert({ message: __("You don't have permission to reveal this password"), indicator: "red" });
                        return;
                    }
                    const pw = frappe.utils.escape_html(r.message.password);
                    const ttl = r.message.ttl_seconds || 30;

                    const $box = $(`<div class="vault-pw-reveal-box"
                            style="margin-top:8px;display:flex;align-items:center;gap:8px;
                                   background:var(--fg-color);border:1px solid var(--border-color);
                                   border-radius:6px;padding:8px 12px">
                        <code style="font-size:13px;letter-spacing:0.05em;flex:1;word-break:break-all">${pw}</code>
                        <button class="vault-copy-revealed btn btn-xs btn-default"
                                style="flex-shrink:0;display:flex;align-items:center;gap:4px">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="4" y="4" width="9" height="11" rx="1.5"/>
                                <path d="M4 4V3a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-1"/>
                            </svg> Copy
                        </button>
                        <small style="color:var(--text-muted);flex-shrink:0">hides in <span class="vault-ttl">${ttl}</span>s</small>
                    </div>`).appendTo($pw_wrap);

                    // copy-from-reveal-box
                    $box.find(".vault-copy-revealed").on("click", function () {
                        navigator.clipboard.writeText(r.message.password).then(() => {
                            $(this).html(`<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--green-500)"
                                               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                              <polyline points="2 8 6 12 14 4"/>
                                          </svg> Copied!`).css("color", "var(--green-500)");
                        });
                    });

                    // countdown
                    let remaining = ttl;
                    const timer = setInterval(() => {
                        remaining--;
                        $box.find(".vault-ttl").text(remaining);
                        if (remaining <= 0) {
                            clearInterval(timer);
                            $box.fadeOut(400, () => $box.remove());
                        }
                    }, 1000);
                },
            });
        });
}

frappe.ui.form.on("Vault Credential Entry", {
    refresh(frm) {
        toggle_reset_due(frm);
        render_credential_actions(frm);
    },

    password_reset_interval(frm) {
        toggle_reset_due(frm);
    },
});
