export function AppLoadingSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-2xl animate-pulse space-y-5">
        <div className="h-7 w-40 rounded bg-muted" />
        <div className="space-y-3">
          <div className="h-24 rounded-lg border bg-card" />
          <div className="h-24 rounded-lg border bg-card" />
          <div className="h-24 rounded-lg border bg-card" />
        </div>
      </div>
    </div>
  );
}

export function EditorLoadingSkeleton() {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b bg-card px-6 py-3">
        <div className="h-6 w-56 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-7 w-16 animate-pulse rounded bg-muted" />
          <div className="h-7 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-3xl animate-pulse space-y-4">
          <div className="h-8 w-2/3 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted/70" />
          <div className="h-4 w-11/12 rounded bg-muted/70" />
          <div className="h-4 w-4/5 rounded bg-muted/70" />
          <div className="pt-4">
            <div className="h-24 rounded-lg bg-muted/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
