import { useState, useRef, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Upload, Download, ArrowLeft, FileImage, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/tools/turn-into-svg')({
  component: TurnIntoSvg,
})

function TurnIntoSvg() {
  const { t } = useTranslation()
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [svgOutput, setSvgOutput] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const [threshold, setThreshold] = useState(128)
  const [simplify, setSimplify] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height })
        setSvgOutput(null)
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

  const convertToSvg = () => {
    if (!sourceImage || !canvasRef.current) return

    const img = new window.Image()
    img.onload = () => {
      const canvas = canvasRef.current!
      // Use smaller canvas for performance
      const maxSize = 200
      const scale = Math.min(maxSize / img.width, maxSize / img.height)
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // Convert to SVG using simple pixel-based approach
      let paths: string[] = []
      const pixelSize = simplify ? 2 : 1

      for (let y = 0; y < canvas.height; y += pixelSize) {
        for (let x = 0; x < canvas.width; x += pixelSize) {
          const i = (y * canvas.width + x) * 4
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]

          if (a < 128) continue // Skip transparent pixels

          const brightness = (r + g + b) / 3

          // Simple thresholding for now
          if (brightness < threshold) {
            const scaledX = (x / canvas.width) * imageSize.width
            const scaledY = (y / canvas.height) * imageSize.height
            const scaledSize = (pixelSize / canvas.width) * imageSize.width

            const color = `rgb(${r},${g},${b})`
            paths.push(
              `<rect x="${scaledX.toFixed(1)}" y="${scaledY.toFixed(1)}" width="${scaledSize.toFixed(1)}" height="${scaledSize.toFixed(1)}" fill="${color}"/>`
            )
          }
        }
      }

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imageSize.width} ${imageSize.height}" width="${imageSize.width}" height="${imageSize.height}">
  <rect width="100%" height="100%" fill="white"/>
  ${paths.join('\n  ')}
</svg>`

      setSvgOutput(svg)
    }
    img.src = sourceImage
  }

  const downloadSvg = () => {
    if (!svgOutput) return
    const blob = new Blob([svgOutput], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'converted.svg'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  const copySvg = async () => {
    if (!svgOutput) return
    await navigator.clipboard.writeText(svgOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
            {t('tools.turn-into-svg.title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('tools.turn-into-svg.description')}
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
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-pink-400'
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
                      {imageSize.width} x {imageSize.height}
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

          {/* Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.turn-into-svg.settings')}</CardTitle>
              <CardDescription>{t('tools.turn-into-svg.settingsHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">{t('tools.turn-into-svg.threshold')}: {threshold}</Label>
                <Input
                  type="range"
                  min="0"
                  max="255"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">{t('tools.turn-into-svg.simplify')}</Label>
                <Button
                  variant={simplify ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSimplify(!simplify)}
                >
                  {simplify ? t('common.yes') : t('common.no')}
                </Button>
              </div>

              <Button onClick={convertToSvg} disabled={!sourceImage} className="w-full">
                <FileImage className="w-4 h-4 mr-2" />
                {t('tools.turn-into-svg.convert')}
              </Button>
            </CardContent>
          </Card>

          {/* How to Use */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.common.howToUse')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>1. {t('tools.turn-into-svg.step1')}</p>
              <p>2. {t('tools.turn-into-svg.step2')}</p>
              <p>3. {t('tools.turn-into-svg.step3')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              {t('tools.common.preview')}
              {svgOutput && (
                <div className="flex gap-2">
                  <Button onClick={copySvg} size="sm" variant="outline">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button onClick={downloadSvg} size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {svgOutput ? (
              <div className="space-y-4">
                <div className="bg-gray-100 dark:bg-gray-800 rounded p-4 flex items-center justify-center min-h-[200px]">
                  <div
                    dangerouslySetInnerHTML={{ __html: svgOutput }}
                    className="max-w-full max-h-[300px]"
                    style={{ width: '100%', height: 'auto' }}
                  />
                </div>
                <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono overflow-auto max-h-[150px]">
                  <pre>{svgOutput.substring(0, 500)}...</pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FileImage className="w-12 h-12 mb-3" />
                <p className="text-sm">{t('tools.turn-into-svg.noSvg')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
