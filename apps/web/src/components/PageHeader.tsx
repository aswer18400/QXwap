import { AppHeader } from "./AppHeader";

export function PageHeader({
  title,
  subtitle,
  onBack,
  actions,
  align = "center"
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  actions?: React.ReactNode;
  align?: "left" | "center";
}) {
  return <AppHeader title={title} subtitle={subtitle} onBack={onBack} actions={actions} align={align} />;
}
