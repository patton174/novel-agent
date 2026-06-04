/** Split buffered SSE text on frame boundaries without losing a partial trailing frame. */
export function splitSseBuffer(buffer: string): { frames: string[]; remainder: string } {
  const parts = buffer.split(/\r?\n\r?\n/)
  const remainder = parts.pop() ?? ''
  return { frames: parts, remainder }
}

export function parseSseFrame(frame: string): { event: string; data: string } | null {
  const lines = frame.split(/\r?\n/)
  const eventLine = lines.find((line) => line.startsWith('event: '))
  const dataLines = lines.filter((line) => line.startsWith('data: '))
  if (!eventLine || dataLines.length === 0) {
    return null
  }
  return {
    event: eventLine.slice(7).trim(),
    data: dataLines.map((line) => line.slice(6)).join('\n'),
  }
}
