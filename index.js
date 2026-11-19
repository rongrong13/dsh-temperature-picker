import z from '@deepseek-ai/schemastery'

// dsh-temperature-picker（宿主端）— 适配 DSH 0.2.2-rc.x
//
// 通过 `agent/request` 瀑布把 temperature 合并进每次模型调用的 LlmCallConfig。
// 兼容依据（DSH 0.2.2-rc.3 源码）：
//   - `agent/request` 瀑布：dsh-agent/src/runtime-types.ts:374，
//     next(): Promise<LlmCallConfig>
//   - `LlmCallConfig.temperature?: number`：dsh-llm/src/call-config.ts:18，
//     由 dsh-llm-deepseek/src/serialize.ts:158 与 dsh-llm-pi-ai/src/adapter.ts:477
//     按 options 透传给提供方
//   - volatile 配置字段：schemastery `Schema.prototype.volatile()`，运行时值被包成
//     `{ get(), [Symbol.for('cosmokit.volatile.write')](next) }`（dsh-settings/src/schema.ts:10
//     的 plainConfig 用的就是这个形态），所以读取时统一走 get()
//
// temperature 声明为 volatile：界面按钮（经 settings 服务）写入后立即生效、无需重启，
// 并由 config-editor 持久化到当前 profile 的 cordis.patch.yml。
// 未设置 = 不发送该字段（跟随提供方默认）。

export const name = 'temperature-picker'

export const Config = z.object({
  temperature: z.number().min(0).max(1.2).volatile(),
})

/** 读取 volatile 配置字段：volatile 包装器用 get()，普通值直接返回。 */
const readVolatile = (value) => {
  if (value && typeof value === 'object' && typeof value.get === 'function') return value.get()
  return value
}

/** 可用的温度值：有限数字且落在 schema 允许区间内。 */
const usableTemperature = (value) => {
  const t = readVolatile(value)
  return typeof t === 'number' && Number.isFinite(t) && t >= 0 && t <= 1.2 ? t : undefined
}

export function apply(ctx, config = {}) {
  ctx.on('agent/request', async (_payload, next) => {
    const call = await next()
    if (!call || typeof call !== 'object') return call

    // 复制再改：LlmCallConfig 可能是被上游折叠/缓存共享的对象，就地改写会污染快照。
    const out = { ...call }
    const temperature = usableTemperature(config.temperature)

    if (temperature === undefined) {
      // 关键：未设置时主动删除，而不是原样放行——agent 循环对后续请求从折叠的
      // request/header 快照出发，若只放行，先前注入过的 temperature 会一直残留。
      // 注意：本插件独占 temperature 字段；若其他插件也开始提供温度，这里会一并移除。
      delete out.temperature
    } else {
      out.temperature = temperature
    }

    return out
  })

  console.log('[temperature-picker] 已激活：agent/request 会按 volatile 配置写入 temperature'
    + '（当前：' + (usableTemperature(config.temperature) ?? '默认，不发送') + '）')
}
