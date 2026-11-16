/** Auth route segment loading: thin top bar only, never a brand splash. */
export default function AuthLoading() {
  return (
    <div className="relative min-h-dvh bg-white" aria-busy="true" aria-label="Loading">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] bg-[#1D5CE5]"
        data-testid="route-progress-bar"
      />
    </div>
  )
}
