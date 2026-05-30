import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { formatDateTimeValue } from "../lib/format";
import type { User } from "../lib/types";
import type { QaChecklistResult, QaChecklistTest } from "../services/qaService";
import { qaChecklistTests } from "../services/qaService";

const qaSections: Array<{ id: string; title: string; subtitle: string; tests: string[] }> = [
  {
    id: "setup",
    title: "Setup",
    subtitle: "รีเซ็ตข้อมูลและเช็ก flow หลักของ feed/follow",
    tests: [
      "reset-seed-data",
      "feed-success",
      "feed-empty-no-following",
      "follow-user",
      "unfollow-user",
      "follow-affects-feed"
    ]
  },
  {
    id: "search-post",
    title: "Search + Post",
    subtitle: "ค้นหา สร้าง item/wanted และจัดการ saved state",
    tests: [
      "search-item-success",
      "search-item-empty",
      "create-item",
      "create-wanted-item",
      "save-item",
      "unsave-item"
    ]
  },
  {
    id: "swap",
    title: "Swap",
    subtitle: "ทดสอบสถานะหลักของดีลแลกแบบ end-to-end",
    tests: [
      "create-swap-request",
      "accept-swap-request",
      "reject-swap-request",
      "counter-offer",
      "swap-expired",
      "swap-cancelled",
      "complete-swap"
    ]
  },
  {
    id: "credit",
    title: "Credit + Reward",
    subtitle: "เช็กเครดิตกิจกรรม ประวัติ และการแลกรางวัล",
    tests: [
      "credit-earned",
      "credit-redeem-success",
      "credit-redeem-insufficient",
      "reward-out-of-stock"
    ]
  },
  {
    id: "chat-notification",
    title: "Chat + Notification",
    subtitle: "เช็ก message จริง, unread count และ network error ผ่าน adapter",
    tests: [
      "send-chat-message",
      "notification-count-zero",
      "notification-count-positive",
      "offline-error-state"
    ]
  },
  {
    id: "profile",
    title: "Profile + Privacy",
    subtitle: "เช็ก public/own profile, credit visibility และ report flow",
    tests: [
      "report-item",
      "public-profile-privacy",
      "own-profile-credit-visibility"
    ]
  }
];

function stringifyPayload(payload: Record<string, unknown> | undefined) {
  if (!payload || !Object.keys(payload).length) return "—";
  return JSON.stringify(payload, null, 2);
}

function resultTimeLabel() {
  return formatDateTimeValue(new Date().toISOString());
}

function statusTone(result?: QaChecklistResult) {
  if (!result) return "empty";
  return result.passed ? "success" : "error";
}

function resolveTestMap() {
  return Object.fromEntries(qaChecklistTests.map((test) => [test.id, test])) as Record<string, QaChecklistTest>;
}

export function QaChecklistPage({
  user,
  onBack,
  onSessionUserChange
}: {
  user: User | null;
  onBack?: () => void;
  onSessionUserChange?: (nextUser: User) => Promise<void> | void;
}) {
  const [results, setResults] = useState<Record<string, QaChecklistResult>>({});
  const [runningId, setRunningId] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string>("");
  const testMap = useMemo(() => resolveTestMap(), []);
  const passCount = useMemo(() => Object.values(results).filter((result) => result.passed).length, [results]);
  const failCount = useMemo(() => Object.values(results).filter((result) => !result.passed).length, [results]);

  async function runTest(test: QaChecklistTest) {
    setRunningId(test.id);
    try {
      const result = await test.run();
      setResults((current) => ({
        ...current,
        [test.id]: result
      }));
      setLastRunAt(resultTimeLabel());
      if (result.sessionUser && onSessionUserChange) {
        await onSessionUserChange(result.sessionUser);
      }
    } finally {
      setRunningId(null);
    }
  }

  return (
    <section className="screen qa-screen">
      <PageHeader
        title="QA Checklist"
        subtitle="หน้านี้เปิดไว้สำหรับ dev/test เท่านั้น ทุกปุ่มจะเรียก service/database จริงและแสดงผลลัพธ์จาก state ที่เปลี่ยนจริง"
        onBack={onBack ?? (() => window.history.back())}
        align="left"
      />

      <Card className="qa-summary-card">
        <div className="qa-summary-card__copy">
          <span className="qa-kicker">Dev route /qa</span>
          <h2>QXwap QA Checklist</h2>
          <p>
            ใช้สำหรับกดตรวจ flow หลักของ feed, search, post, swap, chat, notification, credit, reward, profile
            และ follow โดยไม่ต้องปลอม state ใน component
          </p>
        </div>
        <div className="qa-summary-card__stats">
          <div>
            <small>Session ปัจจุบัน</small>
            <b>{user?.display_name || user?.username || user?.email || "ยังไม่มี session"}</b>
          </div>
          <div>
            <small>Pass / Fail</small>
            <b>
              {passCount} / {failCount}
            </b>
          </div>
          <div>
            <small>รันล่าสุด</small>
            <b>{lastRunAt || "ยังไม่ได้รัน"}</b>
          </div>
        </div>
      </Card>

      {!Object.keys(results).length ? (
        <PageState
          state="empty"
          title="พร้อมเริ่มทดสอบ"
          summary="เลือกปุ่ม test ด้านล่างเพื่อให้ระบบยิง service จริง, เขียนข้อมูลจริง, แล้วสรุปผล pass/fail พร้อมลิงก์กลับไปยังหน้าที่เกี่ยวข้อง"
          align="left"
        />
      ) : null}

      <div className="qa-section-list">
        {qaSections.map((section) => (
          <Card key={section.id} className="qa-section-card">
            <SectionHeader title={section.title} subtitle={section.subtitle} />
            <div className="qa-test-list">
              {section.tests.map((testId) => {
                const test = testMap[testId];
                const result = results[testId];
                const isRunning = runningId === testId;
                return (
                  <article key={test.id} className="qa-test-card" data-testid={`qa-test-card-${test.id}`}>
                    <div className="qa-test-card__header">
                      <div>
                        <h3>{test.label}</h3>
                        <p>{test.description}</p>
                      </div>
                      <Button
                        variant={isRunning ? "secondary" : "primary"}
                        size="sm"
                        disabled={Boolean(runningId)}
                        onClick={() => void runTest(test)}
                        data-testid={`qa-run-${test.id}`}
                      >
                        {isRunning ? "กำลังรัน..." : "Run test"}
                      </Button>
                    </div>

                    <div className="qa-service-tags">
                      {test.services.map((service) => (
                        <span key={service}>{service}</span>
                      ))}
                    </div>

                    {result ? (
                      <div className="qa-test-result" data-testid={`qa-result-${test.id}`}>
                        <PageState
                          state={statusTone(result)}
                          title={result.passed ? "Pass" : "Fail"}
                          summary={result.actual}
                          details={[
                            `Action: ${result.action}`,
                            `Expected: ${result.expected}`,
                            `Services: ${result.services.join(", ")}`
                          ]}
                          note={result.error || undefined}
                          align="left"
                        />
                        <div className="sr-only" data-testid={`qa-result-state-${test.id}`}>
                          {result.passed ? "Pass" : "Fail"}
                        </div>
                        <div className="qa-result-grid">
                          <div>
                            <small>Input test data</small>
                            <pre>{stringifyPayload(result.input)}</pre>
                          </div>
                          <div>
                            <small>Actual result data</small>
                            <pre>{stringifyPayload(result.details)}</pre>
                          </div>
                        </div>
                        {result.link ? (
                          <a className="qa-result-link" href={result.link.href} data-testid={`qa-result-link-${test.id}`}>
                            {result.link.label}
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
