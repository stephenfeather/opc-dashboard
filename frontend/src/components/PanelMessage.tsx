interface PanelMessageProps {
  title: string;
  description: string;
  tone?: "default" | "error";
}

export function PanelMessage({
  title,
  description,
  tone = "default",
}: PanelMessageProps) {
  return (
    <div className={`panel-message ${tone}`}>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
