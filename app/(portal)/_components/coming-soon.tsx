import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center text-center gap-3 py-20">
        <Construction className="size-10 text-muted-foreground" />
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {description ?? "Bu modül hazırlanıyor."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
