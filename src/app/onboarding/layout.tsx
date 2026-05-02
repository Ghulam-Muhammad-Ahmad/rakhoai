export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-6">
      {children}
    </div>
  );
}
