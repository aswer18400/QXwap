import { useEffect, useMemo, useState } from "react";
import type { RequireLogin, User } from "../lib/types";
import { ApiError } from "../lib/api";
import { GuestAccessScreen } from "../components/GuestAccessScreen";
import { PageHeader } from "../components/PageHeader";
import { profileService } from "../services";

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

  if (!user) {
    return (
      <GuestAccessScreen
        requireLogin={requireLogin}
        title="แก้ไขหน้าร้าน"
        subtitle="เข้าสู่ระบบก่อนแก้ไขหน้าร้าน"
        onBack={onBack}
        hideDefaultDetails
      />
    );
  }

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
      const profile = await profileService.updateCurrentProfile({
        display_name: form.display_name.trim(),
        username: form.username.trim(),
        city: form.city.trim(),
        bio: form.bio.trim()
      });
      onSaved(profile);
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
    <section className="screen profile-edit-screen">
      <PageHeader title="แก้ไขหน้าร้าน" subtitle="แก้ข้อมูลที่แสดงบนโปรไฟล์" onBack={onBack} align="left" />
      <form className="form profile-edit-form" onSubmit={save}>
        <div className="panel profile-edit-panel">
          <label className="form-stack">
            <span>ชื่อที่แสดง</span>
            <input
              aria-invalid={Boolean(fieldErrors.display_name)}
              aria-describedby={fieldErrors.display_name ? "profile-edit-display-name-error" : undefined}
              value={form.display_name}
              placeholder="เช่น Raynee Vintage Camera"
              onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))}
            />
            {fieldErrors.display_name ? <small id="profile-edit-display-name-error" className="field-error">{fieldErrors.display_name}</small> : null}
          </label>
          <label className="form-stack">
            <span>ชื่อผู้ใช้</span>
            <input
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={fieldErrors.username ? "profile-edit-username-error" : undefined}
              value={form.username}
              placeholder="raynee.camera"
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            />
            {fieldErrors.username ? <small id="profile-edit-username-error" className="field-error">{fieldErrors.username}</small> : null}
          </label>
          <label className="form-stack">
            <span>พื้นที่ใช้งาน</span>
            <input
              aria-invalid={Boolean(fieldErrors.city)}
              aria-describedby={fieldErrors.city ? "profile-edit-city-error" : undefined}
              value={form.city}
              placeholder="เช่น อารีย์ / รังสิต / ส่งทั่วไทย"
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            />
            {fieldErrors.city ? <small id="profile-edit-city-error" className="field-error">{fieldErrors.city}</small> : null}
          </label>
          <label className="form-stack">
            <span>แนะนำตัว</span>
            <textarea
              aria-invalid={Boolean(fieldErrors.bio)}
              aria-describedby={fieldErrors.bio ? "profile-edit-bio-error" : undefined}
              value={form.bio}
              placeholder="บอกแนวของที่คุณลงบ่อย วิธีนัดรับ หรือสิ่งที่เปิดรับแลก เพื่อให้คนอ่านตัดสินใจได้ง่ายขึ้น"
              onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
            />
            {fieldErrors.bio ? <small id="profile-edit-bio-error" className="field-error">{fieldErrors.bio}</small> : null}
          </label>
        </div>
        {error ? <p className="err" role="alert">{error}</p> : null}
        <div className="publish-action-bar inline">
          <button type="submit" className="primary publish-primary" disabled={!canSave || saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกหน้าร้าน"}
          </button>
        </div>
      </form>
    </section>
  );
}
