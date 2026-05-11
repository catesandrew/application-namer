export default function Header() {
  return (
    <header className="w-full border-b bg-background">
      <div className="mx-auto max-w-3xl px-4 py-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Application Namer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Check if your app name is available across package registries
        </p>
      </div>
    </header>
  )
}
