import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { RequireLogin, User } from "../lib/types";
import { ApiError } from "../lib/api";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";

type FieldErrors = Partial<Record<"display_name" | "username" | "city" | "bio", string>>;

export function ProfileEditPage({
  user,
  requireLogin,
  onBack,
  onSaved
}: {
  user: User | null;
  requireLogin: RequireLogin;
  onBack: () => void;
  onSaved: (user: User) => void;
}) {
  const [form, setForm] = useState({
    display_name: user?.display_name || "",
    username: user?.username || "",
    city: user?.city || "",
    bio: user?.bio || ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setForm({
      display_name: user?.display_name || "",
      username: user?.username || "",
      city: user?.city || "",
      bio: user?.bio || ""
    });
    setFieldErrors({});
    setError("");
  }, [user]);

  const canSave = useMemo(() => form.display_name.trim().length > 0 && form.username.trim().length > 0, [form]);

  if (!user) return <LoginCTA requireLogin={requireLogin} title="แก้ไขโปรไฟล์" />;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const nextFieldErrors: FieldErrors = {};
    if (!form.display_name.trim()) nextFieldErrors.display_name = "กรอกชื่อที่แสดง";
    if (!form.username.trim()) nextFieldErrors.username = "กรอกชื่อผู้ใช้";
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) return;
    setSaving(true);
    setError("");
    try {
      const data = await api<{ profile: User }>("/profiles/me", {
        method: "PATCH",
        body: JSON.stringify({
          display_name: form.display_name.trim(),
          username: form.username.trim(),
          city: form.city.trim(),
          bio: form.bio.trim()
        })
      });
      onSaved(data.profile);
      onBack();
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR" && err.details && typeof err.details === "object") {
        const details = err.details as { fieldErrors?: Record<string, string[]> };
        const mapped: FieldErrors = {};
        if (details.fieldErrors?.display_name?.[0]) mapped.display_name = details.fieldErrors.display_name[0];
        if (details.fieldErrors?.username?.[0]) mapped.username = details.fieldErrors.username[0];
        if (details.fieldErrors?.city?.[0]) mapped.city = details.fieldErrors.city[0];
        if (details.fieldErrors?.bio?.[0]) mapped.bio = details.fieldErrors.bio[0];
        setFieldErrors(mapped);
      }
      setError(err instanceof Error ? err.message : "บันทึกโปรไฟล์ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="screen">
      <PageHeader title="แก้ไขโปรไฟล์" subtitle="อัปเดตชื่อ เมือง และคำแนะนำตัว" onBack={onBack} />
      <form className="form panel profile-edit-panel" onSubmit={save}>
        <label className="form-stack">
          <span>ชื่อที่แสดง</span>
          <input value={form.display_name} onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))} />
          {fieldErrors.display_name ? <small className="field-error">{fieldErrors.display_name}</small> : null}
        </label>
        <label className="form-stack">
          <span>ชื่อผู้ใช้</span>
          <input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} />
          {fieldErrors.username ? <small className="field-error">{fieldErrors.username}</small> : null}
        </label>
        <label className="form-stack">
          <span>พื้นที่ใช้งาน</span>
          <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
          {fieldErrors.city ? <small className="field-error">{fieldErrors.city}</small> : null}
        </label>
        <label className="form-stack">
          <span>แนะนำตัว</span>
          <textarea value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} />
          {fieldErrors.bio ? <small className="field-error">{fieldErrors.bio}</small> : null}
        </label>
        {error ? <p className="err">{error}</p> : null}
        <button type="submit" className="primary wide" disabled={!canSave || saving}>
          {saving ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
        </button>
      </form>
    </section>
  );
}
