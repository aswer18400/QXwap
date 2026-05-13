import { asset } from "../lib/api";
import { profileLevel } from "../lib/format";
import type { User } from "../lib/types";

export function FollowRail({
  people,
  selectedPersonId,
  onPerson: _onPerson,
  openProfile,
  showLevels
}: {
  people: User[];
  selectedPersonId: string;
  onPerson: (id: string) => void;
  openProfile: (p: User) => void;
  showLevels: boolean;
}) {
  if (!people.length) return null;
  return (
    <div className="follow-rail" aria-label="คนที่ติดตาม">
      {people.map((person) => (
        <button
          key={person.id}
          className={selectedPersonId === person.id ? "selected" : ""}
          aria-pressed={selectedPersonId === person.id}
          aria-label={`เปิดโปรไฟล์ ${person.display_name || person.username || "ผู้ใช้ QXwap"}`}
          onClick={() => openProfile(person)}
        >
          <img src={asset(person.avatar_url)} alt={person.display_name || person.username || "ผู้ใช้ QXwap"} />
          {showLevels ? (
            <em className={`level-dot ${profileLevel(person).key}`}>
              {profileLevel(person).label.replace("Level ", "L")}
            </em>
          ) : null}
          <small>{person.display_name?.split(" ")[0] || person.username || "QX"}</small>
        </button>
      ))}
    </div>
  );
}
