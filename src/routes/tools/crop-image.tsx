import { useState, useRef, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Upload, Download, ArrowLeft, Crop, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/tools/crop-image')({
  component: CropImage,
})

function CropImage() {
  const { t } = useTranslation()
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 })
  const [croppedImage, setCroppedImage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height })
        setCropArea({ x: 0, y: 0, width: img.width, height: img.height })
        setCroppedImage(null)
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || !imageRef.current) return

    const rect = imageRef.current.getBoundingClientRect()
    const scaleX = imageSize.width / rect.width
    const scaleY = imageSize.height / rect.height

    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    setIsSelecting(true)
    setSelectionStart({ x, y })
    setCropArea({ x, y, width: 0, height: 0 })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !imageRef.current) return

    const rect = imageRef.current.getBoundingClientRect()
    const scaleX = imageSize.width / rect.width
    const scaleY = imageSize.height / rect.height

    const currentX = Math.max(0, Math.min((e.clientX - rect.left) * scaleX, imageSize.width))
    const currentY = Math.max(0, Math.min((e.clientY - rect.top) * scaleY, imageSize.height))

    const x = Math.min(selectionStart.x, currentX)
    const y = Math.min(selectionStart.y, currentY)
    const width = Math.abs(currentX - selectionStart.x)
    const height = Math.abs(currentY - selectionStart.y)

    setCropArea({ x, y, width, height })
  }

  const handleMouseUp = () => {
    setIsSelecting(false)
  }

  const cropImage = () => {
    if (!sourceImage || !canvasRef.current) return

    const img = new window.Image()
    img.onload = () => {
      const canvas = canvasRef.current!
      canvas.width = cropArea.width
      canvas.height = cropArea.height
      const ctx = canvas.getContext('2d')

      if (ctx) {
        ctx.drawImage(
          img,
          cropArea.x, cropArea.y, cropArea.width, cropArea.height,
          0, 0, cropArea.width, cropArea.height
        )
        setCroppedImage(canvas.toDataURL('image/png'))
      }
    }
    img.src = sourceImage
  }

  const downloadImage = () => {
    if (!croppedImage) return
    const link = document.createElement('a')
    link.download = 'cropped-image.png'
    link.href = croppedImage
    link.click()
  }

  const resetCrop = () => {
    setCropArea({ x: 0, y: 0, width: imageSize.width, height: imageSize.height })
    setCroppedImage(null)
  }

  // Calculate selection overlay position
  const getSelectionStyle = () => {
    if (!imageRef.current || !imageSize.width) return {}

    const rect = imageRef.current.getBoundingClientRect()
    const scaleX = rect.width / imageSize.width
    const scaleY = rect.height / imageSize.height

    return {
      left: `${cropArea.x * scaleX}px`,
      top: `${cropArea.y * scaleY}px`,
      width: `${cropArea.width * scaleX}px`,
      height: `${cropArea.height * scaleY}px`,
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/tools">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('tools.crop-image.title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('tools.crop-image.description')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Image Upload & Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.common.selectArea')}</CardTitle>
            </CardHeader>
            <CardContent>
              {sourceImage ? (
                <div
                  ref={containerRef}
                  className="relative inline-block cursor-crosshair"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <img
                    ref={imageRef}
                    src={sourceImage}
                    alt="Source"
                    className="max-w-full max-h-[400px] select-none"
                    draggable={false}
                  />
                  {/* Selection overlay */}
                  {cropArea.width > 0 && cropArea.height > 0 && (
                    <div
                      className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
                      style={getSelectionStyle()}
                    />
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`
                    border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                    ${isDragging
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
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
                  <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('tools.common.dropOrClick')}
                  </p>
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
              <p>1. {t('tools.crop-image.step1')}</p>
              <p>2. {t('tools.crop-image.step2')}</p>
              <p>3. {t('tools.crop-image.step3')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Controls & Preview */}
        <div className="space-y-4">
          {/* Crop Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.crop-image.cropArea')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">X</Label>
                  <Input
                    type="number"
                    value={Math.round(cropArea.x)}
                    onChange={(e) => setCropArea({ ...cropArea, x: Number(e.target.value) })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Y</Label>
                  <Input
                    type="number"
                    value={Math.round(cropArea.y)}
                    onChange={(e) => setCropArea({ ...cropArea, y: Number(e.target.value) })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t('tools.common.width')}</Label>
                  <Input
                    type="number"
                    value={Math.round(cropArea.width)}
                    onChange={(e) => setCropArea({ ...cropArea, width: Number(e.target.value) })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t('tools.common.height')}</Label>
                  <Input
                    type="number"
                    value={Math.round(cropArea.height)}
                    onChange={(e) => setCropArea({ ...cropArea, height: Number(e.target.value) })}
                    className="h-8"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={cropImage} disabled={!sourceImage} className="flex-1">
                  <Crop className="w-4 h-4 mr-2" />
                  {t('tools.crop-image.crop')}
                </Button>
                <Button onClick={resetCrop} variant="outline" disabled={!sourceImage}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.common.preview')}</CardTitle>
            </CardHeader>
            <CardContent>
              {croppedImage ? (
                <div className="space-y-3">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 flex items-center justify-center">
                    <img
                      src={croppedImage}
                      alt="Cropped"
                      className="max-w-full max-h-40"
                    />
                  </div>
                  <Button onClick={downloadImage} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    {t('tools.common.download')}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Crop className="w-8 h-8 mb-2" />
                  <p className="text-xs">{t('tools.crop-image.noCrop')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
