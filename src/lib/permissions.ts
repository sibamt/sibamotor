import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { ADMIN_USERNAME } from "./local-users";

export const BOARD_ACTIONS = [
  { id: "create_card", label: "ایجاد کارت", group: "کارت" },
  { id: "edit_card", label: "ویرایش کارت", group: "کارت" },
  { id: "delete_card", label: "حذف کارت", group: "کارت" },
  { id: "move_card", label: "جابه‌جایی کارت", group: "کارت" },
  { id: "create_list", label: "ایجاد ستون", group: "ستون" },
  { id: "rename_list", label: "تغییر نام ستون", group: "ستون" },
  { id: "delete_list", label: "حذف ستون", group: "ستون" },
  { id: "move_list", label: "جابه‌جایی ستون", group: "ستون" },
  { id: "manage_labels", label: "مدیریت برچسب‌ها", group: "تخته" },
  { id: "manage_checklists", label: "چک‌لیست", group: "کارت" },
  { id: "comment", label: "ثبت نظر", group: "کارت" },
  { id: "assign_people", label: "تخصیص افراد", group: "کارت" },
  { id: "change_dates", label: "تغییر تاریخ", group: "کارت" },
  { id: "change_priority", label: "تغییر اولویت", group: "کارت" },
  { id: "change_progress", label: "تغییر پیشرفت", group: "کارت" },
  { id: "rename_board", label: "تغییر نام تخته", group: "تخته" },
  { id: "archive_board", label: "بایگانی تخته", group: "تخته" },
  { id: "create_board", label: "ایجاد تخته", group: "تخته" },
  { id: "sort_board", label: "مرتب‌سازی تخته", group: "تخته" },
] as const;

export type BoardAction = (typeof BOARD_ACTIONS)[number]["id"];

export const BOARD_ACTION_IDS: BoardAction[] = BOARD_ACTIONS.map((a) => a.id);

function parseDenied(raw: unknown): BoardAction[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(BOARD_ACTION_IDS);
  return raw.filter((x): x is BoardAction => typeof x === "string" && allowed.has(x));
}

export type UserPermissionRow = {
  username: string;
  displayName: string;
  role: string;
  denied: BoardAction[];
};

export const getMyPermissions = createServerFn({ method: "GET" })
  .validator((data: { username: string }) => data)
  .handler(async ({ data }): Promise<{ denied: BoardAction[] }> => {
    const username = data.username.trim().toLowerCase();
    if (!username || username === ADMIN_USERNAME) return { denied: [] };
    const sql = await getSql();
    const rows = await sql<{ denied: unknown }>`
      select denied from user_permissions where username = ${username}
    `;
    return { denied: parseDenied(rows[0]?.denied) };
  });

export const listUserPermissions = createServerFn({ method: "GET" }).handler(
  async (): Promise<UserPermissionRow[]> => {
    const sql = await getSql();
    const users = await sql<{ username: string; display_name: string; role: string }>`
      select username, display_name, role from login_users order by username
    `;
    const perms = await sql<{ username: string; denied: unknown }>`
      select username, denied from user_permissions
    `;
    const map = new Map(perms.map((p) => [p.username, parseDenied(p.denied)]));
    return users.map((u) => ({
      username: u.username,
      displayName: u.display_name,
      role: u.role,
      denied: u.username === ADMIN_USERNAME ? [] : (map.get(u.username) ?? []),
    }));
  },
);

export const saveUserPermissions = createServerFn({ method: "POST" })
  .validator((data: { actor: string; username: string; denied: string[] }) => data)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (data.actor.trim().toLowerCase() !== ADMIN_USERNAME) {
      return { ok: false, error: "فقط مدیر سیستم می‌تواند دسترسی‌ها را تغییر دهد." };
    }
    const username = data.username.trim().toLowerCase();
    if (!username) return { ok: false, error: "کاربر نامعتبر است." };
    if (username === ADMIN_USERNAME) {
      return { ok: false, error: "دسترسی مدیر سیستم قابل قفل شدن نیست." };
    }
    const denied = parseDenied(data.denied);
    const sql = await getSql();
    const now = new Date().toISOString();
    await sql`
      insert into user_permissions (username, denied, updated_at)
      values (${username}, ${JSON.stringify(denied)}::jsonb, ${now})
      on conflict (username) do update set
        denied = excluded.denied,
        updated_at = excluded.updated_at
    `;
    return { ok: true };
  });
