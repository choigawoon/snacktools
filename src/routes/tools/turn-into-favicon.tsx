import { useState, useRef, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Upload, Download, ArrowLeft, Image, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/tools/turn-into-favicon')({
  component: TurnIntoFavicon,
})

const FAVICON_SIZES = [16, 32, 48, 64, 128, 256]

function TurnIntoFavicon() {
  const { t } = useTranslation()
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [generatedIcons, setGeneratedIcons] = useState<{ size: number; dataUrl: string }[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [selectedSizes, setSelectedSizes] = useState<number[]>([16, 32, 48])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setSourceImage(e.target?.result as string)
      generateFavicons(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [selectedSizes])

  const generateFavicons = (imageDataUrl: string) => {
    const img = new window.Image()
    img.onload = () => {
      const icons: { size: number; dataUrl: string }[] = []

      selectedSizes.forEach((size) => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')

        if (ctx) {
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, size, size)
          icons.push({
            size,
            dataUrl: canvas.toDataURL('image/png')
          })
        }
      })

      setGeneratedIcons(icons)
    }
    img.src = imageDataUrl
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const toggleSize = (size: number) => {
    setSelectedSizes((prev) => {
      const newSizes = prev.includes(size)
        ? prev.filter((s) => s !== size)
        : [...prev, size].sort((a, b) => a - b)
      return newSizes
    })
  }

  const downloadIcon = (icon: { size: number; dataUrl: string }) => {
    const link = document.createElement('a')
    link.download = `favicon-${icon.size}x${icon.size}.png`
    link.href = icon.dataUrl
    link.click()
  }

  const downloadAllAsIco = () => {
    // Download all as individual PNGs (ICO would require additional library)
    generatedIcons.forEach((icon) => downloadIcon(icon))
  }

  const regenerate = () => {
    if (sourceImage) {
      generateFavicons(sourceImage)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/tools">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('tools.turn-into-favicon.title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('tools.turn-into-favicon.description')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upload & Settings */}
        <div className="space-y-4">
          {/* Drop Zone */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.common.upload')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragging
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
                {sourceImage ? (
                  <div className="space-y-2">
                    <img
                      src={sourceImage}
                      alt="Source"
                      className="max-h-32 mx-auto rounded"
                    />
                    <p className="text-sm text-gray-500">{t('tools.common.clickToChange')}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('tools.common.dropOrClick')}
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Size Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.turn-into-favicon.selectSizes')}</CardTitle>
              <CardDescription>{t('tools.turn-into-favicon.sizesHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {FAVICON_SIZES.map((size) => (
                  <Badge
                    key={size}
                    variant={selectedSizes.includes(size) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleSize(size)}
                  >
                    {selectedSizes.includes(size) && <Check className="w-3 h-3 mr-1" />}
                    {size}x{size}
                  </Badge>
                ))}
              </div>
              {sourceImage && selectedSizes.length > 0 && (
                <Button
                  onClick={regenerate}
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  {t('tools.common.regenerate')}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* How to Use */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.common.howToUse')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>1. {t('tools.turn-into-favicon.step1')}</p>
              <p>2. {t('tools.turn-into-favicon.step2')}</p>
              <p>3. {t('tools.turn-into-favicon.step3')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              {t('tools.turn-into-favicon.generated')}
              {generatedIcons.length > 0 && (
                <Button onClick={downloadAllAsIco} size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  {t('tools.common.downloadAll')}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generatedIcons.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {generatedIcons.map((icon) => (
                  <div
                    key={icon.size}
                    className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="w-16 h-16 flex items-center justify-center mb-2 bg-white dark:bg-gray-700 rounded border">
                      <img
                        src={icon.dataUrl}
                        alt={`${icon.size}x${icon.size}`}
                        style={{ width: Math.min(icon.size, 48), height: Math.min(icon.size, 48) }}
                        className="pixelated"
                      />
                    </div>
                    <span className="text-xs text-gray-500 mb-2">
                      {icon.size}x{icon.size}
                    </span>
                    <Button
                      onClick={() => downloadIcon(icon)}
                      size="sm"
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      PNG
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Image className="w-12 h-12 mb-3" />
                <p className="text-sm">{t('tools.turn-into-favicon.noImage')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
