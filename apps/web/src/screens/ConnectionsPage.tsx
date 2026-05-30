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
        subtitle="ดูคนที่ติดตามและคนที่คุณติดตาม"
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

      <div className="profile-tab-rail profile-section-card">
        <button type="button" className={activeTab === "followers" ? "on" : ""} onClick={() => onChangeTab("followers")}>
          ผู้ติดตาม {formatIntegerValue(followers.length || profile.follower_count || 0)}
        </button>
        <button type="button" className={activeTab === "following" ? "on" : ""} onClick={() => onChangeTab("following")}>
          กำลังติดตาม {formatIntegerValue(following.length || profile.following_count || 0)}
        </button>
      </div>

      <Card className="profile-section-card">
        <SectionHeader
          title={activeTab === "followers" ? "รายชื่อผู้ติดตาม" : "รายชื่อที่กำลังติดตาม"}
        />

        {loading ? (
          <PageState
            state="loading"
            title="กำลังโหลดเครือข่าย"
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
                ? (isOwn ? "เมื่อมีคนติดตาม รายชื่อจะขึ้นที่นี่" : "โปรไฟล์นี้ยังไม่มีผู้ติดตาม")
                : (isOwn ? "ติดตามร้านที่สนใจ แล้วรายชื่อจะขึ้นที่นี่" : "โปรไฟล์นี้ยังไม่ได้ติดตามใคร")
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
