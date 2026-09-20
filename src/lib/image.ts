const maxEdge = 1280
const quality = 0.82

/** Redimensiona e recomprime a imagem no navegador antes do upload (JPEG, lado máximo 1280px). */
export async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('CANVAS_UNAVAILABLE')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('IMAGE_ENCODE_FAILED'))),
      'image/jpeg',
      quality,
    )
  })
}
