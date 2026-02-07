export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh w-dvw overflow-hidden bg-[#1e1e1e] text-[#cccccc]">
      {children}
    </div>
  );
}
