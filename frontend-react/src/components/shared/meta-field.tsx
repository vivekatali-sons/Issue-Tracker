interface MetaFieldProps {
  label: string;
  value: string;
}

export function MetaField({ label, value }: MetaFieldProps) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}
