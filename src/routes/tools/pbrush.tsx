import { useState, useRef, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Download, ArrowLeft, Brush, Eraser, Trash2, Undo, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/tools/pbrush')({
  component: PBrush,
})

const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#FFC0CB', '#A52A2A', '#808080', '#000080', '#008000',
]

const BRUSH_SIZES = [2, 4, 8, 12, 16, 24, 32]

function PBrush() {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(4)
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const lastPos = useRef({ x: 0, y: 0 })

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set white background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Save initial state
    const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory([initialState])
    setHistoryIndex(0)
  }, [])

  const saveState = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const state = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Remove any redo states
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(state)

    // Keep only last 50 states
    if (newHistory.length > 50) {
      newHistory.shift()
    }

    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex <= 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const newIndex = historyIndex - 1
    ctx.putImageData(history[newIndex], 0, 0)
    setHistoryIndex(newIndex)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveState()
  }

  const getPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const pos = getPosition(e)
    lastPos.current = pos
    setIsDrawing(true)
    draw(pos.x, pos.y)
  }

  const draw = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(x, y)
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    lastPos.current = { x, y }
  }

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return

    const pos = getPosition(e)
    draw(pos.x, pos.y)
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      saveState()
    }
  }

  const downloadImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = 'drawing.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
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
            {t('tools.pbrush.title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('tools.pbrush.description')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left: Tools */}
        <div className="space-y-4">
          {/* Tool Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.pbrush.tools')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={tool === 'brush' ? 'default' : 'outline'}
                onClick={() => setTool('brush')}
                className="w-full justify-start"
              >
                <Brush className="w-4 h-4 mr-2" />
                {t('tools.pbrush.brush')}
              </Button>
              <Button
                variant={tool === 'eraser' ? 'default' : 'outline'}
                onClick={() => setTool('eraser')}
                className="w-full justify-start"
              >
                <Eraser className="w-4 h-4 mr-2" />
                {t('tools.pbrush.eraser')}
              </Button>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                {t('tools.pbrush.color')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded border-2 ${
                      color === c ? 'border-blue-500' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="mt-3">
                <Label className="text-xs">{t('tools.pbrush.custom')}</Label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full h-8 cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>

          {/* Brush Size */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.pbrush.size')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {BRUSH_SIZES.map((size) => (
                  <Badge
                    key={size}
                    variant={brushSize === size ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setBrushSize(size)}
                  >
                    {size}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.pbrush.actions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={undo} variant="outline" className="w-full" disabled={historyIndex <= 0}>
                <Undo className="w-4 h-4 mr-2" />
                {t('tools.pbrush.undo')}
              </Button>
              <Button onClick={clearCanvas} variant="outline" className="w-full">
                <Trash2 className="w-4 h-4 mr-2" />
                {t('tools.pbrush.clear')}
              </Button>
              <Button onClick={downloadImage} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                {t('tools.common.download')}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Canvas */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.pbrush.canvas')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 overflow-auto">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  onMouseDown={startDrawing}
                  onMouseMove={handleMouseMove}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={handleMouseMove}
                  onTouchEnd={stopDrawing}
                  className="border border-gray-300 bg-white cursor-crosshair touch-none w-full"
                  style={{ maxHeight: '500px' }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {t('tools.pbrush.hint')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
