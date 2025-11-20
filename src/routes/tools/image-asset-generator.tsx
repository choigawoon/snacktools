import { useState, useRef, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Upload, Download, ArrowLeft, Smartphone, Globe, Apple, Check, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/tools/image-asset-generator')({
  component: ImageAssetGenerator,
})

// Android asset specifications
const ANDROID_ASSETS = {
  icons: [
    { name: 'mdpi', size: 48, folder: 'mipmap-mdpi' },
    { name: 'hdpi', size: 72, folder: 'mipmap-hdpi' },
    { name: 'xhdpi', size: 96, folder: 'mipmap-xhdpi' },
    { name: 'xxhdpi', size: 144, folder: 'mipmap-xxhdpi' },
    { name: 'xxxhdpi', size: 192, folder: 'mipmap-xxxhdpi' },
  ],
  playStore: [
    { name: 'Play Store Icon', size: 512, width: 512, height: 512 },
    { name: 'Feature Graphic', size: 0, width: 1024, height: 500 },
  ],
}

// iOS asset specifications
const IOS_ASSETS = {
  icons: [
    { name: 'iPhone @2x', size: 120, scale: '60@2x' },
    { name: 'iPhone @3x', size: 180, scale: '60@3x' },
    { name: 'iPad', size: 76, scale: '76@1x' },
    { name: 'iPad @2x', size: 152, scale: '76@2x' },
    { name: 'iPad Pro', size: 167, scale: '83.5@2x' },
    { name: 'App Store', size: 1024, scale: '1024@1x' },
  ],
  screenshots: [
    { name: '6.7" iPhone', width: 1290, height: 2796 },
    { name: '6.5" iPhone', width: 1284, height: 2778 },
    { name: '5.5" iPhone', width: 1242, height: 2208 },
    { name: '12.9" iPad Pro', width: 2048, height: 2732 },
  ],
}

// Web asset specifications
const WEB_ASSETS = {
  favicons: [16, 32, 48, 64, 96, 128, 256],
  pwa: [
    { name: 'PWA Icon', size: 192 },
    { name: 'PWA Icon Large', size: 512 },
  ],
  social: [
    { name: 'Apple Touch Icon', size: 180, width: 180, height: 180 },
    { name: 'MS Tile', size: 150, width: 150, height: 150 },
    { name: 'Open Graph', size: 0, width: 1200, height: 630 },
    { name: 'Twitter Card', size: 0, width: 1200, height: 600 },
  ],
}

type GeneratedAsset = {
  name: string
  category: string
  width: number
  height: number
  dataUrl: string
  filename: string
}

type Platform = 'android' | 'ios' | 'web'

function ImageAssetGenerator() {
  const { t } = useTranslation()
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['android', 'ios', 'web'])
  const [isGenerating, setIsGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setSourceImage(e.target?.result as string)
      setGeneratedAssets([])
    }
    reader.readAsDataURL(file)
  }, [])

  const generateAssets = useCallback(() => {
    if (!sourceImage) return

    setIsGenerating(true)
    const img = new window.Image()
    img.onload = () => {
      const assets: GeneratedAsset[] = []

      // Generate Android assets
      if (selectedPlatforms.includes('android')) {
        // Launcher icons
        ANDROID_ASSETS.icons.forEach((icon) => {
          const canvas = document.createElement('canvas')
          canvas.width = icon.size
          canvas.height = icon.size
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, 0, 0, icon.size, icon.size)
            assets.push({
              name: `Android ${icon.name}`,
              category: 'android',
              width: icon.size,
              height: icon.size,
              dataUrl: canvas.toDataURL('image/png'),
              filename: `android-${icon.folder}-${icon.size}x${icon.size}.png`,
            })
          }
        })

        // Play Store assets
        ANDROID_ASSETS.playStore.forEach((asset) => {
          const canvas = document.createElement('canvas')
          canvas.width = asset.width
          canvas.height = asset.height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            // Center and fit the image
            const scale = Math.min(asset.width / img.width, asset.height / img.height)
            const x = (asset.width - img.width * scale) / 2
            const y = (asset.height - img.height * scale) / 2
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, asset.width, asset.height)
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
            assets.push({
              name: asset.name,
              category: 'android',
              width: asset.width,
              height: asset.height,
              dataUrl: canvas.toDataURL('image/png'),
              filename: `android-${asset.name.toLowerCase().replace(/\s+/g, '-')}-${asset.width}x${asset.height}.png`,
            })
          }
        })
      }

      // Generate iOS assets
      if (selectedPlatforms.includes('ios')) {
        IOS_ASSETS.icons.forEach((icon) => {
          const canvas = document.createElement('canvas')
          canvas.width = icon.size
          canvas.height = icon.size
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            // iOS icons should not have transparency
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, icon.size, icon.size)
            ctx.drawImage(img, 0, 0, icon.size, icon.size)
            assets.push({
              name: `iOS ${icon.name}`,
              category: 'ios',
              width: icon.size,
              height: icon.size,
              dataUrl: canvas.toDataURL('image/png'),
              filename: `ios-icon-${icon.size}x${icon.size}.png`,
            })
          }
        })
      }

      // Generate Web assets
      if (selectedPlatforms.includes('web')) {
        // Favicons
        WEB_ASSETS.favicons.forEach((size) => {
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, 0, 0, size, size)
            assets.push({
              name: `Favicon ${size}x${size}`,
              category: 'web',
              width: size,
              height: size,
              dataUrl: canvas.toDataURL('image/png'),
              filename: `favicon-${size}x${size}.png`,
            })
          }
        })

        // PWA Icons
        WEB_ASSETS.pwa.forEach((icon) => {
          const canvas = document.createElement('canvas')
          canvas.width = icon.size
          canvas.height = icon.size
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, 0, 0, icon.size, icon.size)
            assets.push({
              name: icon.name,
              category: 'web',
              width: icon.size,
              height: icon.size,
              dataUrl: canvas.toDataURL('image/png'),
              filename: `pwa-icon-${icon.size}x${icon.size}.png`,
            })
          }
        })

        // Social media assets
        WEB_ASSETS.social.forEach((asset) => {
          const canvas = document.createElement('canvas')
          canvas.width = asset.width
          canvas.height = asset.height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            if (asset.size > 0) {
              // Square icons
              ctx.drawImage(img, 0, 0, asset.width, asset.height)
            } else {
              // Social media images - center and fit
              const scale = Math.min(asset.width / img.width, asset.height / img.height)
              const x = (asset.width - img.width * scale) / 2
              const y = (asset.height - img.height * scale) / 2
              ctx.fillStyle = '#ffffff'
              ctx.fillRect(0, 0, asset.width, asset.height)
              ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
            }
            assets.push({
              name: asset.name,
              category: 'web',
              width: asset.width,
              height: asset.height,
              dataUrl: canvas.toDataURL('image/png'),
              filename: `${asset.name.toLowerCase().replace(/\s+/g, '-')}-${asset.width}x${asset.height}.png`,
            })
          }
        })
      }

      setGeneratedAssets(assets)
      setIsGenerating(false)
    }
    img.src = sourceImage
  }, [sourceImage, selectedPlatforms])

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

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platform)) {
        return prev.filter((p) => p !== platform)
      }
      return [...prev, platform]
    })
  }

  const downloadAsset = (asset: GeneratedAsset) => {
    const link = document.createElement('a')
    link.download = asset.filename
    link.href = asset.dataUrl
    link.click()
  }

  const downloadAllByCategory = (category: string) => {
    generatedAssets
      .filter((asset) => asset.category === category)
      .forEach((asset) => {
        setTimeout(() => downloadAsset(asset), 100)
      })
  }

  const downloadAll = () => {
    generatedAssets.forEach((asset, index) => {
      setTimeout(() => downloadAsset(asset), index * 100)
    })
  }

  const getAssetsByCategory = (category: string) => {
    return generatedAssets.filter((asset) => asset.category === category)
  }

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case 'android':
        return <Smartphone className="w-4 h-4" />
      case 'ios':
        return <Apple className="w-4 h-4" />
      case 'web':
        return <Globe className="w-4 h-4" />
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/tools">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('tools.image-asset-generator.title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('tools.image-asset-generator.description')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
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
                    <p className="text-xs text-gray-400 mt-1">
                      {t('tools.image-asset-generator.recommendedSize')}
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Platform Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.image-asset-generator.selectPlatforms')}</CardTitle>
              <CardDescription>{t('tools.image-asset-generator.platformsHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(['android', 'ios', 'web'] as Platform[]).map((platform) => (
                  <Badge
                    key={platform}
                    variant={selectedPlatforms.includes(platform) ? 'default' : 'outline'}
                    className="cursor-pointer flex items-center gap-1"
                    onClick={() => togglePlatform(platform)}
                  >
                    {selectedPlatforms.includes(platform) && <Check className="w-3 h-3" />}
                    {getPlatformIcon(platform)}
                    {t(`tools.image-asset-generator.platforms.${platform}`)}
                  </Badge>
                ))}
              </div>
              {sourceImage && selectedPlatforms.length > 0 && (
                <Button
                  onClick={generateAssets}
                  className="w-full"
                  disabled={isGenerating}
                >
                  <Package className="w-4 h-4 mr-2" />
                  {isGenerating ? t('common.loading') : t('tools.image-asset-generator.generate')}
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
              <p>1. {t('tools.image-asset-generator.step1')}</p>
              <p>2. {t('tools.image-asset-generator.step2')}</p>
              <p>3. {t('tools.image-asset-generator.step3')}</p>
              <p>4. {t('tools.image-asset-generator.step4')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Generated Assets */}
        <div className="lg:col-span-2 space-y-4">
          {generatedAssets.length > 0 ? (
            <>
              {/* Download All */}
              <div className="flex justify-end">
                <Button onClick={downloadAll}>
                  <Download className="w-4 h-4 mr-2" />
                  {t('tools.common.downloadAll')} ({generatedAssets.length})
                </Button>
              </div>

              {/* Android Assets */}
              {selectedPlatforms.includes('android') && getAssetsByCategory('android').length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        {t('tools.image-asset-generator.platforms.android')}
                      </span>
                      <Button
                        onClick={() => downloadAllByCategory('android')}
                        size="sm"
                        variant="outline"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        {t('tools.common.downloadAll')}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {getAssetsByCategory('android').map((asset) => (
                        <div
                          key={asset.filename}
                          className="flex flex-col items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="w-12 h-12 flex items-center justify-center mb-1 bg-white dark:bg-gray-700 rounded border">
                            <img
                              src={asset.dataUrl}
                              alt={asset.name}
                              style={{
                                width: Math.min(asset.width, 40),
                                height: Math.min(asset.height, 40),
                                objectFit: 'contain'
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 text-center truncate w-full">
                            {asset.width}x{asset.height}
                          </span>
                          <Button
                            onClick={() => downloadAsset(asset)}
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 mt-1"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* iOS Assets */}
              {selectedPlatforms.includes('ios') && getAssetsByCategory('ios').length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Apple className="w-4 h-4" />
                        {t('tools.image-asset-generator.platforms.ios')}
                      </span>
                      <Button
                        onClick={() => downloadAllByCategory('ios')}
                        size="sm"
                        variant="outline"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        {t('tools.common.downloadAll')}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {getAssetsByCategory('ios').map((asset) => (
                        <div
                          key={asset.filename}
                          className="flex flex-col items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="w-12 h-12 flex items-center justify-center mb-1 bg-white dark:bg-gray-700 rounded border">
                            <img
                              src={asset.dataUrl}
                              alt={asset.name}
                              style={{
                                width: Math.min(asset.width, 40),
                                height: Math.min(asset.height, 40),
                                objectFit: 'contain'
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 text-center truncate w-full">
                            {asset.width}x{asset.height}
                          </span>
                          <Button
                            onClick={() => downloadAsset(asset)}
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 mt-1"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Web Assets */}
              {selectedPlatforms.includes('web') && getAssetsByCategory('web').length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        {t('tools.image-asset-generator.platforms.web')}
                      </span>
                      <Button
                        onClick={() => downloadAllByCategory('web')}
                        size="sm"
                        variant="outline"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        {t('tools.common.downloadAll')}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {getAssetsByCategory('web').map((asset) => (
                        <div
                          key={asset.filename}
                          className="flex flex-col items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="w-12 h-12 flex items-center justify-center mb-1 bg-white dark:bg-gray-700 rounded border">
                            <img
                              src={asset.dataUrl}
                              alt={asset.name}
                              style={{
                                width: Math.min(asset.width, 40),
                                height: Math.min(asset.height, 40),
                                objectFit: 'contain'
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 text-center truncate w-full">
                            {asset.width}x{asset.height}
                          </span>
                          <Button
                            onClick={() => downloadAsset(asset)}
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 mt-1"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="h-full min-h-[400px]">
              <CardContent className="flex flex-col items-center justify-center h-full py-12 text-gray-400">
                <Package className="w-16 h-16 mb-4" />
                <p className="text-sm text-center">{t('tools.image-asset-generator.noAssets')}</p>
                <p className="text-xs text-center mt-2">{t('tools.image-asset-generator.noAssetsHint')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Asset Information */}
      <div className="mt-8">
        <Separator className="mb-6" />
        <h2 className="text-lg font-semibold mb-4">{t('tools.image-asset-generator.assetInfo')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Android Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Android
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p className="font-medium">{t('tools.image-asset-generator.androidInfo.icons')}</p>
              <ul className="list-disc list-inside pl-2 space-y-0.5">
                <li>mdpi: 48x48</li>
                <li>hdpi: 72x72</li>
                <li>xhdpi: 96x96</li>
                <li>xxhdpi: 144x144</li>
                <li>xxxhdpi: 192x192</li>
              </ul>
              <p className="font-medium mt-2">{t('tools.image-asset-generator.androidInfo.playStore')}</p>
              <ul className="list-disc list-inside pl-2 space-y-0.5">
                <li>Icon: 512x512</li>
                <li>Feature: 1024x500</li>
              </ul>
            </CardContent>
          </Card>

          {/* iOS Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Apple className="w-4 h-4" />
                iOS
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p className="font-medium">{t('tools.image-asset-generator.iosInfo.icons')}</p>
              <ul className="list-disc list-inside pl-2 space-y-0.5">
                <li>iPhone @2x: 120x120</li>
                <li>iPhone @3x: 180x180</li>
                <li>iPad: 76x76</li>
                <li>iPad @2x: 152x152</li>
                <li>iPad Pro: 167x167</li>
                <li>App Store: 1024x1024</li>
              </ul>
            </CardContent>
          </Card>

          {/* Web Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Web
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p className="font-medium">{t('tools.image-asset-generator.webInfo.favicons')}</p>
              <p className="pl-2">16, 32, 48, 64, 96, 128, 256</p>
              <p className="font-medium mt-2">{t('tools.image-asset-generator.webInfo.pwa')}</p>
              <p className="pl-2">192x192, 512x512</p>
              <p className="font-medium mt-2">{t('tools.image-asset-generator.webInfo.social')}</p>
              <ul className="list-disc list-inside pl-2 space-y-0.5">
                <li>OG: 1200x630</li>
                <li>Twitter: 1200x600</li>
                <li>Apple Touch: 180x180</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
