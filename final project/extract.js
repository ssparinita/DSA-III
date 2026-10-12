// Turn any uploaded file into plain text. Supports: txt/csv/md/json/log/html/xml, PDF, DOCX, images (OCR).
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

const IMG = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp', '.tif', '.tiff'])
let ocrWorkers = {}

async function ocr(buf, lang) {
  const { createWorker } = await import('tesseract.js')
  try {
    if (!ocrWorkers[lang]) ocrWorkers[lang] = createWorker(lang, 1, { cachePath: path.join(path.dirname(new URL(import.meta.url).pathname), '.ocr-cache'), errorHandler: () => {} })
    const w = await ocrWorkers[lang]
    const run = w.recognize(buf).then((r) => r.data.text)
    const timeout = new Promise((_, no) => setTimeout(() => no(new Error('timed out')), 120000))
    return await Promise.race([run, timeout])
  } catch (e) {
    delete ocrWorkers[lang] // retry fresh next time
    throw new Error('Image text recognition (OCR) failed: ' + e.message + '. The first image needs an internet connection to download the language data.')
  }
}

export async function extractText(buf, filename, lang = 'eng') {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.pdf') {
    const pdfjs = require('pdfjs-dist/legacy/build/pdf.js')
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true, verbosity: 0 }).promise
    let out = ''
    for (let i = 1; i <= doc.numPages; i++) {
      const tc = await (await doc.getPage(i)).getTextContent()
      let y = null
      for (const it of tc.items) {
        const ny = it.transform[5]
        if (y !== null && Math.abs(ny - y) > 2) out += '\n'
        out += it.str; y = ny
      }
      out += '\n'
    }
    return { type: 'PDF', text: out }
  }
  if (ext === '.docx') {
    const mammoth = require('mammoth')
    return { type: 'Word', text: (await mammoth.extractRawText({ buffer: buf })).value }
  }
  if (IMG.has(ext)) return { type: 'Image (OCR)', text: await ocr(buf, lang) }
  // everything else: treat as text if it really is text
  if (buf.subarray(0, 4000).includes(0)) throw new Error('Unsupported binary file type: ' + (ext || 'unknown'))
  let text
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf) } catch { text = new TextDecoder('windows-1252').decode(buf) }
  text = text.replace(/^\uFEFF/, '')
  if (ext === '.html' || ext === '.htm' || ext === '.xml') text = text.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
  return { type: 'Text', text }
}
