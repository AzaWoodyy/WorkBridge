const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const pkgPath = path.join(__dirname, '..', 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

const baseMajorMinor = '0.1'

let count = null
let hash = null

try {
  count = execSync('git rev-list --count HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
  hash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
} catch (error) {
  const stamp = new Date()
  const day = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(
    stamp.getDate()
  ).padStart(2, '0')}`
  count = `${day}`
  hash = 'local'
}

const nextVersion = `${baseMajorMinor}.${count}`
const nextBuild = `${nextVersion}+${hash}`

pkg.version = nextVersion
pkg.build = pkg.build || {}
pkg.build.buildVersion = nextBuild

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
console.log(`Version set to ${nextVersion} (${nextBuild})`)
