import { readFileSync, writeFileSync } from 'fs'

const targetVersion = process.argv[2]
if (!targetVersion) {
    console.error('Please provide a target version as a command line argument.')
    process.exit(1)
}

// read minAppVersion from manifest.json and bump version to target version
let manifest = JSON.parse(readFileSync('manifest.json', 'utf8'))
const { minAppVersion } = manifest
manifest.version = targetVersion
writeFileSync('manifest.json', JSON.stringify(manifest, null, 2))

// update versions.json with target version and minAppVersion from manifest.json
let versions = JSON.parse(readFileSync('versions.json', 'utf8'))
versions[targetVersion] = minAppVersion
writeFileSync('versions.json', JSON.stringify(versions, null, 2))

// update package.json with target version
let packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
packageJson.version = targetVersion
writeFileSync('package.json', JSON.stringify(packageJson, null, 2))
