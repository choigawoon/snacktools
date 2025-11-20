import { useState, useRef, useCallback, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Upload, Download, ArrowLeft, SplitSquareVertical, GripVertical, ZoomIn, ZoomOut, RotateCcw, Layers, GitCompare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

type ViewMode = 'slider' | 'opacity' | 'diff'
type Interpolation = 'point' | 'linear'

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
  const [viewMode, setViewMode] = useState<ViewMode>('slider')
  const [opacity, setOpacity] = useState(50)
  const [interpolation, setInterpolation] = useState<Interpolation>('linear')
  const [zoom, setZoom] = useState(100)
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [diffImageUrl, setDiffImageUrl] = useState<string | null>(null)
  const beforeInputRef = useRef<HTMLInputElement>(null)
  const afterInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const diffCanvasRef = useRef<HTMLCanvasElement>(null)

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

  // Generate diff image when both images are loaded
  const generateDiffImage = useCallback(() => {
    if (!beforeImage || !afterImage || !diffCanvasRef.current) return

    const { width, height } = getUnifiedDimensions()
    const canvas = diffCanvasRef.current
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const beforeImg = new window.Image()
    const afterImg = new window.Image()

    beforeImg.onload = () => {
      afterImg.onload = () => {
        // Create temporary canvases to get pixel data
        const tempCanvas1 = document.createElement('canvas')
        const tempCanvas2 = document.createElement('canvas')
        tempCanvas1.width = width
        tempCanvas1.height = height
        tempCanvas2.width = width
        tempCanvas2.height = height
        const tempCtx1 = tempCanvas1.getContext('2d')
        const tempCtx2 = tempCanvas2.getContext('2d')
        if (!tempCtx1 || !tempCtx2) return

        // Draw images centered
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

        tempCtx1.drawImage(beforeImg, beforeX, beforeY, beforeDrawWidth, beforeDrawHeight)
        tempCtx2.drawImage(afterImg, afterX, afterY, afterDrawWidth, afterDrawHeight)

        // Get pixel data
        const imgData1 = tempCtx1.getImageData(0, 0, width, height)
        const imgData2 = tempCtx2.getImageData(0, 0, width, height)
        const diffData = ctx.createImageData(width, height)

        // Calculate diff
        for (let i = 0; i < imgData1.data.length; i += 4) {
          const rDiff = Math.abs(imgData1.data[i] - imgData2.data[i])
          const gDiff = Math.abs(imgData1.data[i + 1] - imgData2.data[i + 1])
          const bDiff = Math.abs(imgData1.data[i + 2] - imgData2.data[i + 2])
          const totalDiff = (rDiff + gDiff + bDiff) / 3

          if (totalDiff > 10) {
            // Highlight differences in red/magenta
            diffData.data[i] = 255
            diffData.data[i + 1] = 0
            diffData.data[i + 2] = 255
            diffData.data[i + 3] = Math.min(255, totalDiff * 3)
          } else {
            // Show original as grayscale
            const gray = (imgData1.data[i] + imgData1.data[i + 1] + imgData1.data[i + 2]) / 3
            diffData.data[i] = gray
            diffData.data[i + 1] = gray
            diffData.data[i + 2] = gray
            diffData.data[i + 3] = 128
          }
        }

        ctx.putImageData(diffData, 0, 0)
        setDiffImageUrl(canvas.toDataURL('image/png'))
      }
      afterImg.src = afterImage.src
    }
    beforeImg.src = beforeImage.src
  }, [beforeImage, afterImage, getUnifiedDimensions])

  // Generate diff when images change
  useEffect(() => {
    if (beforeImage && afterImage) {
      generateDiffImage()
    }
  }, [beforeImage, afterImage, generateDiffImage])

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 400))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 25))
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoom(100)
    setPanPosition({ x: 0, y: 0 })
  }, [])

  // Pan handlers for zoomed view
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (zoom <= 100) return
    setIsPanning(true)
    setPanStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y })
  }, [zoom, panPosition])

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || zoom <= 100) return
    setPanPosition({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    })
  }, [isPanning, panStart, zoom])

  const handlePanEnd = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      setZoom(prev => Math.min(prev + 10, 400))
    } else {
      setZoom(prev => Math.max(prev - 10, 25))
    }
  }, [])

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

          {/* View Controls */}
          {hasComparison && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t('tools.image-comparison-slider.viewControls')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* View Mode Toggle */}
                <div className="space-y-2">
                  <Label className="text-xs">{t('tools.image-comparison-slider.viewMode')}</Label>
                  <div className="flex gap-1">
                    <Button
                      variant={viewMode === 'slider' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('slider')}
                      className="flex-1 text-xs"
                    >
                      <SplitSquareVertical className="w-3 h-3 mr-1" />
                      {t('tools.image-comparison-slider.slider')}
                    </Button>
                    <Button
                      variant={viewMode === 'opacity' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('opacity')}
                      className="flex-1 text-xs"
                    >
                      <Layers className="w-3 h-3 mr-1" />
                      {t('tools.image-comparison-slider.overlay')}
                    </Button>
                    <Button
                      variant={viewMode === 'diff' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('diff')}
                      className="flex-1 text-xs"
                    >
                      <GitCompare className="w-3 h-3 mr-1" />
                      {t('tools.image-comparison-slider.diff')}
                    </Button>
                  </div>
                </div>

                {/* Opacity Slider (only in opacity mode) */}
                {viewMode === 'opacity' && (
                  <div className="space-y-2">
                    <Label className="text-xs">{t('tools.image-comparison-slider.opacity')}: {opacity}%</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={opacity}
                      onChange={(e) => setOpacity(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{t('tools.image-comparison-slider.before')}</span>
                      <span>{t('tools.image-comparison-slider.after')}</span>
                    </div>
                  </div>
                )}

                {/* Interpolation Toggle */}
                <div className="space-y-2">
                  <Label className="text-xs">{t('tools.image-comparison-slider.interpolation')}</Label>
                  <div className="flex gap-1">
                    <Button
                      variant={interpolation === 'point' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setInterpolation('point')}
                      className="flex-1 text-xs"
                    >
                      {t('tools.image-comparison-slider.point')}
                    </Button>
                    <Button
                      variant={interpolation === 'linear' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setInterpolation('linear')}
                      className="flex-1 text-xs"
                    >
                      {t('tools.image-comparison-slider.linear')}
                    </Button>
                  </div>
                </div>

                {/* Zoom Controls */}
                <div className="space-y-2">
                  <Label className="text-xs">{t('tools.image-comparison-slider.zoom')}: {zoom}%</Label>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleZoomOut}
                      disabled={zoom <= 25}
                      className="flex-1"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetZoom}
                      className="flex-1"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleZoomIn}
                      disabled={zoom >= 400}
                      className="flex-1"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                  {/* Comparison View */}
                  <div
                    ref={containerRef}
                    className={`relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 select-none ${
                      viewMode === 'slider' ? 'cursor-ew-resize' : zoom > 100 ? 'cursor-grab' : 'cursor-default'
                    } ${isPanning ? 'cursor-grabbing' : ''}`}
                    style={{
                      aspectRatio: `${unifiedWidth} / ${unifiedHeight}`,
                      maxHeight: '400px',
                    }}
                    onMouseDown={viewMode === 'slider' ? handleMouseDown : handlePanStart}
                    onMouseMove={viewMode !== 'slider' ? handlePanMove : undefined}
                    onMouseUp={handlePanEnd}
                    onMouseLeave={handlePanEnd}
                    onTouchStart={viewMode === 'slider' ? handleTouchStart : undefined}
                    onTouchMove={viewMode === 'slider' ? handleTouchMove : undefined}
                    onTouchEnd={() => setIsDragging(false)}
                    onWheel={handleWheel}
                  >
                    {/* Slider Mode */}
                    {viewMode === 'slider' && (
                      <>
                        {/* After Image (Background) */}
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{
                            transform: `scale(${zoom / 100}) translate(${panPosition.x / (zoom / 100)}px, ${panPosition.y / (zoom / 100)}px)`,
                          }}
                        >
                          <img
                            src={afterImage.src}
                            alt="After"
                            className="max-w-full max-h-full object-contain"
                            style={{ imageRendering: interpolation === 'point' ? 'pixelated' : 'auto' }}
                            draggable={false}
                          />
                        </div>

                        {/* Before Image (Clipped) */}
                        <div
                          className="absolute inset-0 overflow-hidden"
                          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                        >
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{
                              transform: `scale(${zoom / 100}) translate(${panPosition.x / (zoom / 100)}px, ${panPosition.y / (zoom / 100)}px)`,
                            }}
                          >
                            <img
                              src={beforeImage.src}
                              alt="Before"
                              className="max-w-full max-h-full object-contain"
                              style={{ imageRendering: interpolation === 'point' ? 'pixelated' : 'auto' }}
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
                      </>
                    )}

                    {/* Opacity/Overlay Mode */}
                    {viewMode === 'opacity' && (
                      <>
                        {/* After Image (Background) */}
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{
                            transform: `scale(${zoom / 100}) translate(${panPosition.x / (zoom / 100)}px, ${panPosition.y / (zoom / 100)}px)`,
                          }}
                        >
                          <img
                            src={afterImage.src}
                            alt="After"
                            className="max-w-full max-h-full object-contain"
                            style={{ imageRendering: interpolation === 'point' ? 'pixelated' : 'auto' }}
                            draggable={false}
                          />
                        </div>

                        {/* Before Image (Overlay with opacity) */}
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{
                            opacity: opacity / 100,
                            transform: `scale(${zoom / 100}) translate(${panPosition.x / (zoom / 100)}px, ${panPosition.y / (zoom / 100)}px)`,
                          }}
                        >
                          <img
                            src={beforeImage.src}
                            alt="Before"
                            className="max-w-full max-h-full object-contain"
                            style={{ imageRendering: interpolation === 'point' ? 'pixelated' : 'auto' }}
                            draggable={false}
                          />
                        </div>

                        {/* Labels */}
                        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                          {t('tools.image-comparison-slider.overlay')} ({opacity}%)
                        </div>
                      </>
                    )}

                    {/* Diff Mode */}
                    {viewMode === 'diff' && (
                      <>
                        {diffImageUrl ? (
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{
                              transform: `scale(${zoom / 100}) translate(${panPosition.x / (zoom / 100)}px, ${panPosition.y / (zoom / 100)}px)`,
                            }}
                          >
                            <img
                              src={diffImageUrl}
                              alt="Diff"
                              className="max-w-full max-h-full object-contain"
                              style={{ imageRendering: interpolation === 'point' ? 'pixelated' : 'auto' }}
                              draggable={false}
                            />
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                            {t('common.loading')}
                          </div>
                        )}

                        {/* Labels */}
                        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                          {t('tools.image-comparison-slider.diff')}
                        </div>
                        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                          <span className="inline-block w-2 h-2 bg-fuchsia-500 mr-1 rounded-sm"></span>
                          {t('tools.image-comparison-slider.diffHighlight')}
                        </div>
                      </>
                    )}
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
      <canvas ref={diffCanvasRef} className="hidden" />
    </div>
  )
}
