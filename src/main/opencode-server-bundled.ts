/**
 * 使用打包的 OpenCode 启动 serve 服务
 * 优先直接运行原生 exe（可隐藏控制台窗口），否则回退到 node + bin 脚本
 */
import { spawn } from 'node:child_process'
import { platform } from 'node:os'
import {
  getBundledOpencodePath,
  getBundledOpencodeNativePath
} from './opencode-bundled'

export interface BundledServerOptions {
  hostname?: string
  port?: number
  timeout?: number
  signal?: AbortSignal
  config?: { logLevel?: string; model?: string; [key: string]: unknown }
}

/**
 * 使用打包的 opencode 启动 serve，返回 server url 和 close 方法
 */
export async function createBundledOpencodeServer(
  options: BundledServerOptions = {}
): Promise<{ url: string; close: () => void }> {
  const opts = Object.assign(
    { hostname: '127.0.0.1', port: 4096, timeout: 5000 },
    options ?? {}
  )
  const args = ['serve', `--hostname=${opts.hostname}`, `--port=${opts.port}`]
  if (opts.config?.logLevel) {
    args.push(`--log-level=${opts.config.logLevel}`)
  }

  const isWin = platform() === 'win32'
  const nativePath = getBundledOpencodeNativePath()
  const useNative = nativePath.length > 0

  if (!useNative && !getBundledOpencodePath()) {
    throw new Error('打包的 OpenCode 未找到，请确保 opencode-ai 已正确安装')
  }

  // 优先直接运行原生 exe，可避免 Node 包装器 spawn 时弹出控制台窗口
  const proc = useNative
    ? spawn(nativePath, args, {
        signal: opts.signal,
        stdio: ['ignore', 'pipe', 'pipe'],
        ...(isWin && { windowsHide: true }),
        env: {
          ...process.env,
          OPENCODE_CONFIG_CONTENT: JSON.stringify(opts.config ?? {})
        }
      })
    : spawn(process.execPath, [getBundledOpencodePath(), ...args], {
        signal: opts.signal,
        shell: isWin,
        stdio: ['ignore', 'pipe', 'pipe'],
        ...(isWin && { windowsHide: true }),
        env: {
          ...process.env,
          OPENCODE_CONFIG_CONTENT: JSON.stringify(opts.config ?? {})
        }
      })

  const url = await new Promise<string>((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new Error(`服务器启动超时 ${opts.timeout}ms`))
    }, opts.timeout)

    let output = ''
    const handleOutput = (chunk: Buffer | string) => {
      output += chunk.toString()
      const lines = output.split('\n')
      for (const line of lines) {
        if (line.startsWith('opencode server listening')) {
          const match = line.match(/on\s+(https?:\/\/[^\s]+)/)
          if (match) {
            clearTimeout(id)
            resolve(match[1])
            return
          }
        }
      }
    }

    proc.stdout?.on('data', handleOutput)
    proc.stderr?.on('data', handleOutput)
    proc.on('exit', (code) => {
      clearTimeout(id)
      reject(new Error(`服务器退出 code=${code}\n${output.trim()}`))
    })
    proc.on('error', (err) => {
      clearTimeout(id)
      reject(err)
    })
    opts.signal?.addEventListener('abort', () => {
      clearTimeout(id)
      reject(new Error('Aborted'))
    })
  })

  return {
    url,
    close() {
      proc.kill()
    }
  }
}
