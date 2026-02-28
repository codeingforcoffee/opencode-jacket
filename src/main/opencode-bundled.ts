/**
 * 获取打包的 OpenCode 可执行路径
 * opencode-ai 作为依赖已打包进应用，无需用户单独安装
 */
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { arch, platform } from 'node:os'
import { join, dirname } from 'node:path'

const require = createRequire(import.meta.url)

/**
 * 获取打包的 opencode bin 脚本路径
 * 使用 node 执行该脚本即可运行 opencode
 */
export function getBundledOpencodePath(): string {
  try {
    const pkgPath = require.resolve('opencode-ai/package.json')
    const pkgDir = dirname(pkgPath)
    return join(pkgDir, 'bin', 'opencode')
  } catch {
    return ''
  }
}

const PLATFORM_MAP: Record<string, string> = {
  darwin: 'darwin',
  linux: 'linux',
  win32: 'windows'
}
const ARCH_MAP: Record<string, string> = {
  x64: 'x64',
  arm64: 'arm64',
  arm: 'arm'
}

/**
 * 获取打包的原生 opencode 可执行文件路径（.exe 或 opencode）
 * 直接运行原生二进制可避免 Node 包装器 spawn 时弹出控制台窗口
 */
export function getBundledOpencodeNativePath(): string {
  try {
    const pkgPath = require.resolve('opencode-ai/package.json')
    const pkgDir = dirname(pkgPath)
    const plat = PLATFORM_MAP[platform()] ?? platform()
    const a = ARCH_MAP[arch()] ?? arch()
    const base = `opencode-${plat}-${a}`
    const binary = plat === 'windows' ? 'opencode.exe' : 'opencode'

    // 优先检查 .opencode 缓存（opencode-ai postinstall 可能创建）
    const cached = join(pkgDir, 'bin', '.opencode')
    if (existsSync(cached)) return cached

    // 按 opencode-ai 的查找顺序尝试
    const candidates =
      a === 'x64'
        ? [`${base}-baseline`, base]
        : [base]
    const modulesDir = join(pkgDir, 'node_modules')
    if (existsSync(modulesDir)) {
      for (const name of candidates) {
        const candidate = join(modulesDir, name, 'bin', binary)
        if (existsSync(candidate)) return candidate
      }
    }

    // pnpm 可能将依赖放在上层 node_modules
    let current = dirname(pkgDir)
    for (let i = 0; i < 5; i++) {
      const modules = join(current, 'node_modules')
      if (existsSync(modules)) {
        for (const name of candidates) {
          const candidate = join(modules, name, 'bin', binary)
          if (existsSync(candidate)) return candidate
        }
      }
      const parent = dirname(current)
      if (parent === current) break
      current = parent
    }
  } catch {
    /* ignore */
  }
  return ''
}

/**
 * 检查打包的 OpenCode 是否可用
 */
export function hasBundledOpencode(): boolean {
  return getBundledOpencodePath().length > 0
}
