export default function LoadingState({ label = 'Loading analytics…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
      <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}
