import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/tools')({
  component: ToolsLayout,
})

function ToolsLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Outlet />
    </div>
  )
}
