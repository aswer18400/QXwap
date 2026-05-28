#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const fixRules = [
  {
    id: "add-flow-accessible-labels",
    match(issue) {
      return issue.title === "Unlabeled controls found in add flow";
    },
    hypothesis: "ผู้ใช้ assistive tech drop-off เพราะ checkbox/file inputs ใน add flow ยังไม่มี accessible name ที่ runner และ screen reader อ่านได้ชัดพอ",
    files: ["apps/web/src/screens/AddProduct.tsx"],
    async apply() {
      const filePath = path.join(repoRoot, "apps/web/src/screens/AddProduct.tsx");
      let source = await fs.readFile(filePath, "utf8");
      let changed = false;

      const replacements = [
        {
          find: '<input\n                type="checkbox"\n                checked={form.price_cash_unknown}',
          replace: '<input\n                type="checkbox"\n                aria-label="ไม่ทราบราคาสินค้า"\n                checked={form.price_cash_unknown}'
        },
        {
          find: '<input type="checkbox" checked={form.open_to_offers} onChange={(event) => setForm((current) => ({ ...current, open_to_offers: event.target.checked }))} />',
          replace: '<input type="checkbox" aria-label="เปิดรับข้อเสนออื่นเพิ่มเติม" checked={form.open_to_offers} onChange={(event) => setForm((current) => ({ ...current, open_to_offers: event.target.checked }))} />'
        },
        {
          find: '<input ref={pickerInputRef} className="profile-avatar-input" type="file" accept="image/*" multiple onChange={(event) => queuePickerFiles(event.target.files)} />',
          replace: '<input ref={pickerInputRef} className="profile-avatar-input" type="file" aria-label="เลือกรูปสินค้า" accept="image/*" multiple onChange={(event) => queuePickerFiles(event.target.files)} />'
        }
      ];

      for (const step of replacements) {
        if (source.includes(step.replace)) continue;
        if (!source.includes(step.find)) continue;
        source = source.replace(step.find, step.replace);
        changed = true;
      }

      if (changed) await fs.writeFile(filePath, source);
      return {
        changed,
        files: [filePath],
        summary: changed ? "Added deterministic accessible labels to add-flow controls" : "No add-flow label changes were needed"
      };
    }
  },
  {
    id: "profile-edit-initial-focus",
    match(issue) {
      return issue.title === "Keyboard focus does not enter profile_edit predictably";
    },
    hypothesis: "keyboard users lose orientation because profile_edit does not place focus on a meaningful heading after navigation",
    files: [
      "apps/web/src/components/PageHeader.tsx",
      "apps/web/src/screens/ProfileEditPage.tsx"
    ],
    async apply() {
      const headerPath = path.join(repoRoot, "apps/web/src/components/PageHeader.tsx");
      const profilePath = path.join(repoRoot, "apps/web/src/screens/ProfileEditPage.tsx");
      let header = await fs.readFile(headerPath, "utf8");
      let profile = await fs.readFile(profilePath, "utf8");
      let changed = false;

      if (!header.includes('import { useEffect, useRef } from "react";')) {
        header = header.replace('import { BackNavIcon } from "./AppIcons";', 'import { useEffect, useRef } from "react";\nimport { BackNavIcon } from "./AppIcons";');
        changed = true;
      }

      if (!header.includes("autoFocusTitle")) {
        header = header.replace(
          `export function PageHeader({\n  title,\n  onBack,\n  actions\n}: {\n  title: string;\n  onBack: () => void;\n  actions?: React.ReactNode;\n}) {`,
          `export function PageHeader({\n  title,\n  onBack,\n  actions,\n  autoFocusTitle = false\n}: {\n  title: string;\n  onBack: () => void;\n  actions?: React.ReactNode;\n  autoFocusTitle?: boolean;\n}) {\n  const titleRef = useRef<HTMLHeadingElement | null>(null);\n\n  useEffect(() => {\n    if (!autoFocusTitle) return;\n    titleRef.current?.focus();\n  }, [autoFocusTitle]);`
        );
        changed = true;
      }

      if (!header.includes("ref={titleRef}")) {
        header = header.replace("<h1>{title}</h1>", '<h1 ref={titleRef} tabIndex={autoFocusTitle ? -1 : undefined}>{title}</h1>');
        changed = true;
      }

      if (!profile.includes('autoFocusTitle')) {
        profile = profile.replace(
          '<PageHeader title="แก้ไขโปรไฟล์" onBack={onBack} />',
          '<PageHeader title="แก้ไขโปรไฟล์" onBack={onBack} autoFocusTitle />'
        );
        changed = true;
      }

      if (changed) {
        await fs.writeFile(headerPath, header);
        await fs.writeFile(profilePath, profile);
      }

      return {
        changed,
        files: [headerPath, profilePath],
        summary: changed ? "Enabled deterministic heading focus for profile_edit" : "No profile_edit focus changes were needed"
      };
    }
  }
];

export function buildAutoFixQueue(issues) {
  const queue = [];
  const seen = new Set();

  for (const issue of issues) {
    for (const rule of fixRules) {
      if (!rule.match(issue)) continue;
      const taskKey = `${rule.id}:${issue.title}`;
      if (seen.has(taskKey)) continue;
      seen.add(taskKey);
      queue.push({
        id: rule.id,
        title: issue.title,
        hypothesis: rule.hypothesis,
        severity: issue.severity,
        files: rule.files,
        safe: true,
        tags: issue.tags || []
      });
    }
  }

  return queue;
}

export async function applyAutoFixQueue(issues) {
  const queue = buildAutoFixQueue(issues);
  const applied = [];
  const skipped = [];

  for (const task of queue) {
    const rule = fixRules.find((candidate) => candidate.id === task.id);
    if (!rule) {
      skipped.push({ ...task, reason: "missing rule implementation" });
      continue;
    }
    try {
      const result = await rule.apply();
      if (result.changed) applied.push({ ...task, ...result });
      else skipped.push({ ...task, reason: result.summary, files: result.files });
    } catch (error) {
      skipped.push({
        ...task,
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return { queue, applied, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const reportPath = process.argv[2];
  if (!reportPath) {
    console.error("Usage: node scripts/qxwap-product-readiness-autofix.mjs <report-json-path>");
    process.exit(1);
  }
  const report = JSON.parse(await fs.readFile(path.resolve(reportPath), "utf8"));
  const result = await applyAutoFixQueue(report.issues || []);
  console.log(JSON.stringify(result, null, 2));
}
