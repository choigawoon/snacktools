import { useState, useRef, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Upload, ArrowLeft, FileJson, Copy, Check, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/tools/json-schema-converter')({
  component: JsonSchemaConverter,
})

// Helper function to infer JSON Schema type from a value
function inferType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number'
  }
  return typeof value
}

// Helper function to generate description based on key name and type
function generateDescription(key: string, type: string): string {
  const formattedKey = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .toLowerCase()
    .trim()

  switch (type) {
    case 'string':
      return `The ${formattedKey}.`
    case 'integer':
    case 'number':
      return `The ${formattedKey} value.`
    case 'boolean':
      return `Whether ${formattedKey} is enabled.`
    case 'array':
      return `List of ${formattedKey}.`
    case 'object':
      return `The ${formattedKey} object.`
    default:
      return `The ${formattedKey}.`
  }
}

// Recursive function to convert JSON value to JSON Schema
function valueToSchema(value: unknown, key?: string): Record<string, unknown> {
  const type = inferType(value)
  const schema: Record<string, unknown> = { type }

  if (key) {
    schema.description = generateDescription(key, type)
  }

  if (type === 'object' && value !== null) {
    const properties: Record<string, unknown> = {}
    const obj = value as Record<string, unknown>

    for (const [propKey, propValue] of Object.entries(obj)) {
      properties[propKey] = valueToSchema(propValue, propKey)
    }

    schema.properties = properties
  } else if (type === 'array' && Array.isArray(value)) {
    if (value.length > 0) {
      // Infer items schema from first element
      schema.items = valueToSchema(value[0])
    } else {
      schema.items = {}
    }
  } else if (type === 'integer' || type === 'number') {
    // Add minimum constraint for numeric values if they're positive
    if (typeof value === 'number' && value >= 0) {
      schema.minimum = 0
    }
  }

  return schema
}

// Main function to convert JSON to JSON Schema
function jsonToSchema(json: unknown, title: string = 'Generated'): Record<string, unknown> {
  const rootType = inferType(json)

  const schema: Record<string, unknown> = {
    $id: `https://example.com/${title.toLowerCase()}.schema.json`,
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title,
    type: rootType,
  }

  if (rootType === 'object' && json !== null) {
    const properties: Record<string, unknown> = {}
    const obj = json as Record<string, unknown>

    for (const [key, value] of Object.entries(obj)) {
      properties[key] = valueToSchema(value, key)
    }

    schema.properties = properties
  } else if (rootType === 'array' && Array.isArray(json)) {
    if (json.length > 0) {
      schema.items = valueToSchema(json[0])
    } else {
      schema.items = {}
    }
  }

  return schema
}

function JsonSchemaConverter() {
  const { t } = useTranslation()
  const [inputJson, setInputJson] = useState('')
  const [outputSchema, setOutputSchema] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const [schemaTitle, setSchemaTitle] = useState('Generated')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleConvert = useCallback(() => {
    if (!inputJson.trim()) {
      setError(t('tools.json-schema-converter.emptyInput'))
      setOutputSchema('')
      return
    }

    try {
      const parsed = JSON.parse(inputJson)
      const schema = jsonToSchema(parsed, schemaTitle)
      setOutputSchema(JSON.stringify(schema, null, 2))
      setError(null)
    } catch {
      setError(t('tools.json-schema-converter.invalidJson'))
      setOutputSchema('')
    }
  }, [inputJson, schemaTitle, t])

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setError(t('tools.json-schema-converter.invalidFile'))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setInputJson(content)
      setError(null)

      // Auto-generate title from filename
      const fileName = file.name.replace('.json', '')
      const title = fileName.charAt(0).toUpperCase() + fileName.slice(1)
      setSchemaTitle(title)
    }
    reader.readAsText(file)
  }, [t])

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

  const handleCopy = useCallback(async () => {
    if (!outputSchema) return

    try {
      await navigator.clipboard.writeText(outputSchema)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = outputSchema
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [outputSchema])

  const handleClear = useCallback(() => {
    setInputJson('')
    setOutputSchema('')
    setError(null)
    setSchemaTitle('Generated')
  }, [])

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
            {t('tools.json-schema-converter.title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('tools.json-schema-converter.description')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: JSON Input */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                {t('tools.json-schema-converter.input')}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    {t('tools.json-schema-converter.uploadFile')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClear}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    {t('tools.json-schema-converter.clear')}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileInput}
                className="hidden"
              />
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                  relative rounded-lg transition-colors
                  ${isDragging ? 'ring-2 ring-blue-500' : ''}
                `}
              >
                <textarea
                  value={inputJson}
                  onChange={(e) => {
                    setInputJson(e.target.value)
                    setError(null)
                  }}
                  placeholder={t('tools.json-schema-converter.placeholder')}
                  className={`
                    w-full h-80 p-4 font-mono text-sm rounded-lg border resize-none
                    bg-gray-50 dark:bg-gray-900
                    ${error
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                    }
                    focus:outline-none focus:ring-2
                  `}
                />
                {isDragging && (
                  <div className="absolute inset-0 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <div className="text-blue-500 font-medium">
                      {t('tools.json-schema-converter.dropHere')}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              )}

              <div className="mt-4 space-y-3">
                <div>
                  <Label className="text-xs">{t('tools.json-schema-converter.schemaTitle')}</Label>
                  <input
                    type="text"
                    value={schemaTitle}
                    onChange={(e) => setSchemaTitle(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    placeholder="Person"
                  />
                </div>

                <Button onClick={handleConvert} className="w-full">
                  <FileJson className="w-4 h-4 mr-2" />
                  {t('tools.json-schema-converter.convert')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* How to Use */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tools.common.howToUse')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>1. {t('tools.json-schema-converter.step1')}</p>
              <p>2. {t('tools.json-schema-converter.step2')}</p>
              <p>3. {t('tools.json-schema-converter.step3')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Schema Output */}
        <div className="space-y-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                {t('tools.json-schema-converter.output')}
                {outputSchema && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-1 text-green-500" />
                        {t('tools.json-schema-converter.copied')}
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        {t('tools.json-schema-converter.copy')}
                      </>
                    )}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {outputSchema ? (
                <pre className="w-full h-[480px] p-4 font-mono text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 overflow-auto">
                  <code>{outputSchema}</code>
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-[480px] text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <FileJson className="w-12 h-12 mb-3" />
                  <p className="text-sm">{t('tools.json-schema-converter.noOutput')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
