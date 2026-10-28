import { useEffect, useRef, useState } from 'react'
import type { Material } from '../types.ts'
import { cleanText, MAX_TEXT_BYTES, sentencesFromLines, splitIntoSentences, validateText } from '../lib/segmentText.ts'
import { LANGUAGES, makeMaterial } from '../lib/workspace.ts'
import { Icon } from './Icon.tsx'

export function ImportDialog({ material, initialText, initialLanguage, onClose, onSave }: {
  material?: Material; initialText?: string; initialLanguage?: string; onClose: () => void; onSave: (material: Material) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(material?.title ?? '')
  const [language, setLanguage] = useState(material?.language ?? initialLanguage ?? 'en-US')
  const [source, setSource] = useState(material?.sourceText ?? initialText ?? '')
  const [preview, setPreview] = useState(() => {
    if (material) return material.sentences.map(sentence => sentence.text).join('\n')
    if (initialText) { try { return splitIntoSentences(initialText, initialLanguage ?? 'en-US').join('\n') } catch { return '' } }
    return ''
  })
  const [error, setError] = useState('')
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])

  const segment = () => {
    try { setPreview(splitIntoSentences(source, language).join('\n')); setError('') }
    catch (error) { setError((error as Error).message) }
  }
  const submit = () => {
    try {
      const text = validateText(source)
      const lines = preview.trim() ? sentencesFromLines(preview) : splitIntoSentences(text, language)
      if (lines.length > 2000) throw new Error('句子超过 2,000 句，请拆成较短材料。')
      const next = makeMaterial(title, language, text, lines)
      if (material) { next.id = material.id; next.draftText = material.draftText }
      onSave(next)
    } catch (error) { setError((error as Error).message) }
  }
  const readFile = async (file?: File) => {
    if (!file) return
    try {
      if (!/\.txt$/i.test(file.name)) throw new Error('请选择 .txt 文件，或直接把文字粘贴到输入框。')
      if (file.size > MAX_TEXT_BYTES) throw new Error('文件超过 100 KB，请先分成较短材料。')
      let text: string
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()) }
      catch { throw new Error('请将文件另存为 UTF-8 编码后重新导入。') }
      setSource(validateText(text)); setPreview('')
      if (!title.trim()) setTitle(file.name.replace(/\.txt$/i, '').slice(0, 120))
      setError('')
    } catch (error) { setError((error as Error).message) }
    finally { if (fileInput.current) fileInput.current.value = '' }
  }
  return <dialog ref={dialog} className="import-dialog" onCancel={onClose} aria-labelledby="import-title">
    <div className="dialog-heading">
      <div><h2 id="import-title">{material ? '调整这篇材料' : '导入练习材料'}</h2><p>放进你想听的文字，从一句开始。</p></div>
      <button className="icon-button" onClick={onClose} aria-label="关闭导入窗口"><Icon name="close" /></button>
    </div>
    <div className="import-fields">
      <label>材料标题<input maxLength={120} value={title} placeholder="例如：今天的阅读片段" onChange={event => setTitle(event.target.value)} /></label>
      <label>语言<select value={language} onChange={event => { setLanguage(event.target.value); setPreview('') }}>
        {LANGUAGES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select></label>
    </div>
    <div className="field-heading"><label htmlFor="source-input">原始文字</label>
      <button className="text-button" onClick={() => fileInput.current?.click()}><Icon name="upload" size={15} />选择 TXT</button>
      <input ref={fileInput} type="file" accept=".txt,text/plain" hidden onChange={event => void readFile(event.target.files?.[0])} />
    </div>
    <textarea id="source-input" className="source-input" value={source} maxLength={20_001}
      placeholder="在这里粘贴英文或日文。也可以选择 UTF-8 编码的 TXT 文件。"
      onChange={event => { setSource(event.target.value); setPreview('') }} />
    <div className="field-heading"><span className="muted">{cleanText(source).length.toLocaleString()} / 20,000 字符</span>
      <button className="secondary-button" onClick={segment}>自动断句</button>
    </div>
    <label className="preview-label" htmlFor="sentence-preview">分句预览 <span>每个非空行是一句，可用换行拆分、删除换行合并</span></label>
    <textarea id="sentence-preview" className="preview-input" value={preview}
      placeholder="点击“自动断句”生成预览，也可以在这里手动整理成一行一句。"
      onChange={event => setPreview(event.target.value)} maxLength={22_000} />
    {preview && <p className="muted">共 {preview.split('\n').filter(line => line.trim()).length} 句{preview.split('\n').some(line => line.length > 250) ? '；有较长句子，可以再拆成短句练习。' : '，可在开始前检查断句。'}</p>}
    {material && <p className="muted">保存后回到第一句，保留已有听写。</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="dialog-actions"><button className="secondary-button" onClick={onClose}>取消</button>
      <button className="primary-button" onClick={submit}>{material ? '保存调整' : '开始练习'}</button></div>
  </dialog>
}
