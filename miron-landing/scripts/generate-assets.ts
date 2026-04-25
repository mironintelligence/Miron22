import sharp from 'sharp'

async function generateAssets() {
  const logo = './public/miron-logo.png'

  await sharp(logo).resize(16, 16).png().toFile('./public/favicon-16.png')
  await sharp(logo).resize(32, 32).png().toFile('./public/favicon-32.png')
  await sharp(logo).resize(180, 180).png().toFile('./public/apple-touch-icon.png')
  console.log('Favicons generated')

  const ogSvg = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#000000"/>
      <rect x="0" y="0" width="1200" height="2" fill="#FFD700"/>
      <rect x="0" y="628" width="1200" height="2" fill="#FFD700"/>
    </svg>
  `)

  const logoBuffer = await sharp(logo)
    .resize(400, undefined, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  await sharp(ogSvg)
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png()
    .toFile('./public/og-image.png')

  console.log('OG image generated')
}

generateAssets().catch(console.error)
