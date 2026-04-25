import sharp from 'sharp'

async function removeBg() {
  const input = './public/miron-logo-original.jpg'
  const output = './public/miron-logo.png'

  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = new Uint8ClampedArray(data)

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    if (r > 240 && g > 240 && b > 240) {
      pixels[i + 3] = 0
    }
  }

  await sharp(Buffer.from(pixels.buffer), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(output)

  console.log('Background removed →', output)
}

removeBg().catch(console.error)
