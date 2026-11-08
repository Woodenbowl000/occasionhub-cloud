// Re-mounts on every navigation, giving each route a soft fade-in.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
