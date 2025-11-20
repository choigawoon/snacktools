import { useState, useRef, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Upload, Download, ArrowLeft, Maximize2, Link as LinkIcon, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/tools/resize-image')({
  component: ResizeImage,
})

const PRESET_SIZES = [
  { label: '800x600', width: 800, height: 600 },
  { label: '1280x720', width: 1280, height: 720 },
  { label: '1920x1080', width: 1920, height: 1080 },
  { label: '500x500', width: 500, height: 500 },
  { label: '1000x1000', width: 1000, height: 1000 },
]

function ResizeImage() {
  const { t } = useTranslation()
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 })
  const [targetSize, setTargetSize] = useState({ width: 800, height: 600 })
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true)
  const [resizedImage, setResizedImage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const aspectRatio = originalSize.width / originalSize.height || 1

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        setOriginalSize({ width: img.width, height: img.height })
        setTargetSize({ width: img.width, height: img.height })
        setResizedImage(null)
      }
      img.src = e.target?.result as string
      setSourceImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

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

  const handleWidthChange = (newWidth: number) => {
    if (maintainAspectRatio) {
      const newHeight = Math.round(newWidth / aspectRatio)
      setTargetSize({ width: newWidth, height: newHeight })
    } else {
      setTargetSize({ ...targetSize, width: newWidth })
    }
  }

  const handleHeightChange = (newHeight: number) => {
    if (maintainAspectRatio) {
      const newWidth = Math.round(newHeight * aspectRatio)
      setTargetSize({ width: newWidth, height: newHeight })
    } else {
      setTargetSize({ ...targetSize, height: newHeight })
    }
  }

  const applyPreset = (preset: { width: number; height: number }) => {
    setTargetSize({ width: preset.width, height: preset.height })
    setMaintainAspectRatio(false)
  }

  const resizeImage = () => {
    if (!sourceImage || !canvasRef.current) return

    const img = new window.Image()
    img.onload = () => {
      const canvas = canvasRef.current!
      canvas.width = targetSize.width
      canvas.height = targetSize.height
      const ctx = canvas.getContext('2d')

      if (ctx) {
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, targetSize.width, targetSize.height)
        setResizedImage(canvas.toDataURL('image/png'))
      }
    }
    img.src = sourceImage
  }

  const downloadImage = () => {
    if (!resizedImage) return
    const link = document.createElement('a')
    link.download = `resized-${targetSize.width}x${targetSize.height}.png`
    link.href = resizedImage
    link.click()
  }

  const scaleByPercent = (percent: number) => {
    const newWidth = Math.round(originalSize.width * (percent / 100))
    const newHeight = Math.round(originalSize.height * (percent / 100))
    setTargetSize({ width: newWidth, height: newHeight })
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
            {t('tools.resize-image.title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('tools.resize-image.description')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upload & Settings */}
        <div className="space-y-4">
          {/* Upload */}
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
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                  ${isDragging
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
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
                    <p className="text-sm text-gray-500">
                      {t('tools.common.original')}: {originalSize.width} x {originalSize.height}
                    </p>
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

          {/* Size Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.resize-image.targetSize')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Width & Height */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t('tools.common.width')}</Label>
                  <Input
                    type="number"
                    value={targetSize.width}
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t('tools.common.height')}</Label>
                  <Input
                    type="number"
                    value={targetSize.height}
                    onChange={(e) => handleHeightChange(Number(e.target.value))}
                    className="h-8"
                  />
                </div>
              </div>

              {/* Aspect Ratio Toggle */}
              <Button
                variant={maintainAspectRatio ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMaintainAspectRatio(!maintainAspectRatio)}
                className="w-full"
              >
                {maintainAspectRatio ? (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    {t('tools.resize-image.aspectLocked')}
                  </>
                ) : (
                  <>
                    <Unlink className="w-4 h-4 mr-2" />
                    {t('tools.resize-image.aspectFree')}
                  </>
                )}
              </Button>

              {/* Scale Buttons */}
              <div>
                <Label className="text-xs mb-2 block">{t('tools.resize-image.scale')}</Label>
                <div className="flex gap-2 flex-wrap">
                  {[25, 50, 75, 100, 150, 200].map((percent) => (
                    <Badge
                      key={percent}
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => scaleByPercent(percent)}
                    >
                      {percent}%
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Presets */}
              <div>
                <Label className="text-xs mb-2 block">{t('tools.resize-image.presets')}</Label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_SIZES.map((preset) => (
                    <Badge
                      key={preset.label}
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => applyPreset(preset)}
                    >
                      {preset.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button onClick={resizeImage} disabled={!sourceImage} className="w-full">
                <Maximize2 className="w-4 h-4 mr-2" />
                {t('tools.resize-image.resize')}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview & Download */}
        <div className="space-y-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.common.preview')}</CardTitle>
              <CardDescription>
                {resizedImage && `${targetSize.width} x ${targetSize.height}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resizedImage ? (
                <div className="space-y-4">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded p-4 flex items-center justify-center min-h-[200px]">
                    <img
                      src={resizedImage}
                      alt="Resized"
                      className="max-w-full max-h-[300px]"
                    />
                  </div>
                  <Button onClick={downloadImage} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    {t('tools.common.download')}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Maximize2 className="w-12 h-12 mb-3" />
                  <p className="text-sm">{t('tools.resize-image.noResize')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* How to Use */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.common.howToUse')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>1. {t('tools.resize-image.step1')}</p>
              <p>2. {t('tools.resize-image.step2')}</p>
              <p>3. {t('tools.resize-image.step3')}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
