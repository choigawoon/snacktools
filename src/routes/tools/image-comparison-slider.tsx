import { useState, useRef, useCallback, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Upload, Download, ArrowLeft, SplitSquareVertical, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const Route = createFileRoute('/tools/image-comparison-slider')({
  component: ImageComparisonSlider,
})

interface ImageData {
  src: string
  width: number
  height: number
}

function ImageComparisonSlider() {
  const { t } = useTranslation()
  const [beforeImage, setBeforeImage] = useState<ImageData | null>(null)
  const [afterImage, setAfterImage] = useState<ImageData | null>(null)
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingBefore, setIsDraggingBefore] = useState(false)
  const [isDraggingAfter, setIsDraggingAfter] = useState(false)
  const beforeInputRef = useRef<HTMLInputElement>(null)
  const afterInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Calculate unified dimensions (fit to larger image)
  const getUnifiedDimensions = useCallback(() => {
    if (!beforeImage && !afterImage) return { width: 0, height: 0 }

    const maxWidth = Math.max(beforeImage?.width || 0, afterImage?.width || 0)
    const maxHeight = Math.max(beforeImage?.height || 0, afterImage?.height || 0)

    return { width: maxWidth, height: maxHeight }
  }, [beforeImage, afterImage])

  const handleFile = useCallback((file: File, type: 'before' | 'after') => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        const imageData: ImageData = {
          src: e.target?.result as string,
          width: img.width,
          height: img.height,
        }
        if (type === 'before') {
          setBeforeImage(imageData)
        } else {
          setAfterImage(imageData)
        }
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, type: 'before' | 'after') => {
    e.preventDefault()
    if (type === 'before') setIsDraggingBefore(false)
    else setIsDraggingAfter(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file, type)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent, type: 'before' | 'after') => {
    e.preventDefault()
    if (type === 'before') setIsDraggingBefore(true)
    else setIsDraggingAfter(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent, type: 'before' | 'after') => {
    e.preventDefault()
    if (type === 'before') setIsDraggingBefore(false)
    else setIsDraggingAfter(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0]
    if (file) handleFile(file, type)
  }, [handleFile])

  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPosition(percentage)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    handleSliderMove(e.clientX)
  }, [handleSliderMove])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    handleSliderMove(e.clientX)
  }, [isDragging, handleSliderMove])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true)
    handleSliderMove(e.touches[0].clientX)
  }, [handleSliderMove])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    handleSliderMove(e.touches[0].clientX)
  }, [isDragging, handleSliderMove])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const downloadComparison = () => {
    if (!beforeImage || !afterImage || !canvasRef.current) return

    const { width, height } = getUnifiedDimensions()
    const canvas = canvasRef.current
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    const beforeImg = new window.Image()
    const afterImg = new window.Image()

    beforeImg.onload = () => {
      afterImg.onload = () => {
        // Calculate scaling to fit each image to unified dimensions
        const beforeScale = Math.min(width / beforeImage.width, height / beforeImage.height)
        const afterScale = Math.min(width / afterImage.width, height / afterImage.height)

        const beforeDrawWidth = beforeImage.width * beforeScale
        const beforeDrawHeight = beforeImage.height * beforeScale
        const afterDrawWidth = afterImage.width * afterScale
        const afterDrawHeight = afterImage.height * afterScale

        const beforeX = (width - beforeDrawWidth) / 2
        const beforeY = (height - beforeDrawHeight) / 2
        const afterX = (width - afterDrawWidth) / 2
        const afterY = (height - afterDrawHeight) / 2

        // Draw after image first (full)
        ctx.drawImage(afterImg, afterX, afterY, afterDrawWidth, afterDrawHeight)

        // Draw before image clipped
        const clipWidth = (width * sliderPosition) / 100
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, clipWidth, height)
        ctx.clip()
        ctx.drawImage(beforeImg, beforeX, beforeY, beforeDrawWidth, beforeDrawHeight)
        ctx.restore()

        // Draw slider line
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(clipWidth, 0)
        ctx.lineTo(clipWidth, height)
        ctx.stroke()

        const link = document.createElement('a')
        link.download = `comparison-${Date.now()}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
      afterImg.src = afterImage.src
    }
    beforeImg.src = beforeImage.src
  }

  const { width: unifiedWidth, height: unifiedHeight } = getUnifiedDimensions()
  const hasComparison = beforeImage && afterImage

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
            {t('tools.image-comparison-slider.title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('tools.image-comparison-slider.description')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Upload Cards */}
        <div className="space-y-4">
          {/* Before Image Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.image-comparison-slider.beforeImage')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onClick={() => beforeInputRef.current?.click()}
                onDrop={(e) => handleDrop(e, 'before')}
                onDragOver={(e) => handleDragOver(e, 'before')}
                onDragLeave={(e) => handleDragLeave(e, 'before')}
                className={`
                  border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                  ${isDraggingBefore
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                  }
                `}
              >
                <input
                  ref={beforeInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileInput(e, 'before')}
                  className="hidden"
                />
                {beforeImage ? (
                  <div className="space-y-2">
                    <img
                      src={beforeImage.src}
                      alt="Before"
                      className="max-h-24 mx-auto rounded"
                    />
                    <p className="text-xs text-gray-500">
                      {beforeImage.width} x {beforeImage.height}
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {t('tools.common.dropOrClick')}
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* After Image Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.image-comparison-slider.afterImage')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onClick={() => afterInputRef.current?.click()}
                onDrop={(e) => handleDrop(e, 'after')}
                onDragOver={(e) => handleDragOver(e, 'after')}
                onDragLeave={(e) => handleDragLeave(e, 'after')}
                className={`
                  border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                  ${isDraggingAfter
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                  }
                `}
              >
                <input
                  ref={afterInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileInput(e, 'after')}
                  className="hidden"
                />
                {afterImage ? (
                  <div className="space-y-2">
                    <img
                      src={afterImage.src}
                      alt="After"
                      className="max-h-24 mx-auto rounded"
                    />
                    <p className="text-xs text-gray-500">
                      {afterImage.width} x {afterImage.height}
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {t('tools.common.dropOrClick')}
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* How to Use */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.common.howToUse')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>1. {t('tools.image-comparison-slider.step1')}</p>
              <p>2. {t('tools.image-comparison-slider.step2')}</p>
              <p>3. {t('tools.image-comparison-slider.step3')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview & Comparison */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.common.preview')}</CardTitle>
              {hasComparison && (
                <CardDescription>
                  {t('tools.image-comparison-slider.unifiedSize')}: {unifiedWidth} x {unifiedHeight}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {hasComparison ? (
                <div className="space-y-4">
                  {/* Comparison Slider */}
                  <div
                    ref={containerRef}
                    className="relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 cursor-ew-resize select-none"
                    style={{
                      aspectRatio: `${unifiedWidth} / ${unifiedHeight}`,
                      maxHeight: '400px',
                    }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={() => setIsDragging(false)}
                  >
                    {/* After Image (Background) */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src={afterImage.src}
                        alt="After"
                        className="max-w-full max-h-full object-contain"
                        draggable={false}
                      />
                    </div>

                    {/* Before Image (Clipped) */}
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <img
                          src={beforeImage.src}
                          alt="Before"
                          className="max-w-full max-h-full object-contain"
                          draggable={false}
                        />
                      </div>
                    </div>

                    {/* Slider Handle */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                      style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                        <GripVertical className="w-4 h-4 text-gray-600" />
                      </div>
                    </div>

                    {/* Labels */}
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {t('tools.image-comparison-slider.before')}
                    </div>
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {t('tools.image-comparison-slider.after')}
                    </div>
                  </div>

                  {/* Download Button */}
                  <Button onClick={downloadComparison} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    {t('tools.common.download')}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <SplitSquareVertical className="w-12 h-12 mb-3" />
                  <p className="text-sm">{t('tools.image-comparison-slider.noComparison')}</p>
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
