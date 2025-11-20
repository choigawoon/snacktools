import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Image,
  Crop,
  Maximize2,
  Brush,
  FileImage,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/tools/')({
  component: ToolsIndex,
})

const tools = [
  {
    id: 'turn-into-favicon',
    path: '/tools/turn-into-favicon' as const,
    titleKey: 'tools.turn-into-favicon.title' as const,
    descKey: 'tools.turn-into-favicon.description' as const,
    hintKey: 'tools.turn-into-favicon.hint' as const,
    icon: Image,
    color: 'bg-purple-500',
  },
  {
    id: 'crop-image',
    path: '/tools/crop-image' as const,
    titleKey: 'tools.crop-image.title' as const,
    descKey: 'tools.crop-image.description' as const,
    hintKey: 'tools.crop-image.hint' as const,
    icon: Crop,
    color: 'bg-blue-500',
  },
  {
    id: 'resize-image',
    path: '/tools/resize-image' as const,
    titleKey: 'tools.resize-image.title' as const,
    descKey: 'tools.resize-image.description' as const,
    hintKey: 'tools.resize-image.hint' as const,
    icon: Maximize2,
    color: 'bg-green-500',
  },
  {
    id: 'pbrush',
    path: '/tools/pbrush' as const,
    titleKey: 'tools.pbrush.title' as const,
    descKey: 'tools.pbrush.description' as const,
    hintKey: 'tools.pbrush.hint' as const,
    icon: Brush,
    color: 'bg-orange-500',
  },
  {
    id: 'turn-into-svg',
    path: '/tools/turn-into-svg' as const,
    titleKey: 'tools.turn-into-svg.title' as const,
    descKey: 'tools.turn-into-svg.description' as const,
    hintKey: 'tools.turn-into-svg.hint' as const,
    icon: FileImage,
    color: 'bg-pink-500',
  },
]

function ToolsIndex() {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('tools.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('tools.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Link
              key={tool.id}
              to={tool.path}
              className="group"
            >
              <Card className="h-full transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${tool.color} flex items-center justify-center mb-3`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg flex items-center justify-between">
                    {t(tool.titleKey)}
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardTitle>
                  <CardDescription>
                    {t(tool.descKey)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t(tool.hintKey)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
