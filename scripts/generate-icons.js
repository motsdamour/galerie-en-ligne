const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const svgBuffer = fs.readFileSync(path.join(__dirname, '../public/logo.svg'))

async function generate() {
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(__dirname, '../public/icon-192.png'))
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(__dirname, '../public/icon-512.png'))
  await sharp(svgBuffer).resize(200, 200).png().toFile(path.join(__dirname, '../public/apple-splash.png'))
  console.log('Icons generated: icon-192.png, icon-512.png, apple-splash.png')
}

generate()
