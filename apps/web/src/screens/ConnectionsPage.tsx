import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/Card";
import { GuestAccessScreen } from "../components/GuestAccessScreen";
import { PageHeader } from "../components/PageHeader";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { UserMiniCard } from "../components/UserMiniCard";
import { formatIntegerValue, profileLevel } from "../lib/format";
import type { RequireLogin, User } from "../lib/types";
import { followService } from "../services";

type ConnectionsTab = "followers" | "following";

export function ConnectionsPage({
  user,
  viewedUser,
  activeTab,
  requireLogin,
  onChangeTab,
  onOpenProfile,
  onBack
}: {
  user: User | null;
  viewedUser?: User | null;
  activeTab: ConnectionsTab;
  requireLogin: RequireLogin;
  onChangeTab: (tab: ConnectionsTab) => void;
  onOpenProfile: (profile: User) => void;
  onBack: () => void;
}) {
  const profile = viewedUser || user;
  const isOwn = Boolean(profile?.id && user?.id === profile.id) || (!viewedUser && Boolean(user));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);

  useEffect(() => {
    let live = true;
    if (!profile?.id) return;
    setLoading(true);
    setError("");
    Promise.all([
      followService.listFollowers(profile.id),
      followService.listFollowingByUser(profile.id)
    ])
      .then(([nextFollowers, nextFollowing]) => {
        if (!live) return;
        setFollowers(nextFollowers);
        setFollowing(nextFollowing);
      })
      .catch((nextError: any) => {
        if (!live) return;
        setError(nextError?.message || "โหลดรายชื่อผู้ติดตามไม่สำเร็จ");
      })
      .finally(() => {
        if (!live) return;
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [profile?.id]);

  const activeList = activeTab === "followers" ? followers : following;
  const profileName = profile?.display_name || profile?.username || "QXwap user";
  const summary = useMemo(() => {
    if (!profile) return "";
    if (activeTab === "followers") {
      return isOwn ? "คนที่ติดตามร้านของคุณอยู่ตอนนี้" : `คนที่ติดตาม ${profileName}`;
    }
    return isOwn ? "ร้านและผู้ใช้ที่คุณกำลังติดตาม" : `${profileName} กำลังติดตามใครอยู่`;
  }, [activeTab, isOwn, profile, profileName]);

  if (!profile) {
    return (
      <GuestAccessScreen
        requireLogin={requireLogin}
        title="เครือข่าย"
        subtitle="เข้าสู่ระบบก่อนเพื่อดูรายชื่อผู้ติดตามและร้านที่คุณกำลังติดตาม"
      />
    );
  }

  return (
    <section className="screen profile-screen">
      <PageHeader
        title={activeTab === "followers" ? "ผู้ติดตาม" : "กำลังติดตาม"}
        subtitle={summary}
        onBack={onBack}
        align="left"
      />

      <Card className="profile-section-card">
        <div className="profile-social-grid">
          <button
            type="button"
            className={`profile-social-card profile-social-card--interactive${activeTab === "followers" ? " is-active" : ""}`}
            onClick={() => onChangeTab("followers")}
          >
            <small>ผู้ติดตาม</small>
            <b>{formatIntegerValue(followers.length || profile.follower_count || 0)}</b>
            <span>{isOwn ? "ดูคนที่กำลังติดตามร้านของคุณ" : `คนที่ติดตาม ${profileName}`}</span>
          </button>
          <button
            type="button"
            className={`profile-social-card profile-social-card--interactive${activeTab === "following" ? " is-active" : ""}`}
            onClick={() => onChangeTab("following")}
          >
            <small>กำลังติดตาม</small>
            <b>{formatIntegerValue(following.length || profile.following_count || 0)}</b>
            <span>{isOwn ? "ดูร้านและผู้ใช้ที่คุณติดตามอยู่" : `${profileName} ติดตามอยู่ตอนนี้`}</span>
          </button>
        </div>
      </Card>

      <Card className="profile-section-card">
        <SectionHeader
          title={activeTab === "followers" ? "รายชื่อผู้ติดตาม" : "รายชื่อที่กำลังติดตาม"}
          subtitle={activeTab === "followers" ? "เปิดดูโปรไฟล์สาธารณะของแต่ละคนได้จากรายการนี้" : "เปิดดูร้านและโปรไฟล์ที่เกี่ยวข้องได้จากรายการนี้"}
        />

        {loading ? (
          <PageState
            state="loading"
            title="กำลังโหลดเครือข่าย"
            summary="ดึงข้อมูลจาก follow service จริงอยู่ตอนนี้"
            align="left"
          />
        ) : error ? (
          <PageState
            state="error"
            title="โหลดรายชื่อไม่สำเร็จ"
            summary={error}
            actions={[{ label: "ลองใหม่", onClick: () => window.location.reload() }]}
            align="left"
          />
        ) : !activeList.length ? (
          <PageState
            state="empty"
            title={activeTab === "followers" ? "ยังไม่มีผู้ติดตาม" : "ยังไม่ได้ติดตามใคร"}
            summary={
              activeTab === "followers"
                ? (isOwn ? "เมื่อมีคนกดติดตามร้านของคุณ รายชื่อจะขึ้นตรงนี้" : "โปรไฟล์นี้ยังไม่มีรายชื่อผู้ติดตามที่เปิดเผยได้")
                : (isOwn ? "ลองไปดูร้านอื่นแล้วกดติดตาม เพื่อให้ฟีดหน้าแรกเริ่มมีโพสต์จากคนที่คุณสนใจ" : "โปรไฟล์นี้ยังไม่ได้ติดตามร้านอื่นเพิ่มเติม")
            }
            align="left"
          />
        ) : (
          <div className="profile-connections-list">
            {activeList.map((entry) => {
              const level = profileLevel(entry);
              const meta = entry.city || level.title;
              const submeta = level.label;
              return (
                <UserMiniCard
                  key={entry.id}
                  user={{
                    id: entry.id,
                    display_name: entry.display_name,
                    avatar_url: entry.avatar_url,
                    rating: entry.rating,
                    city: entry.city
                  }}
                  meta={meta}
                  submeta={submeta}
                  onClick={() => onOpenProfile(entry)}
                />
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
}
