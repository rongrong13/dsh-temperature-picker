import z from '@deepseek-ai/schemastery'

// dsh-temperature-picker（宿主端）
// 通过 agent/request 瀑布把 temperature 合并进每次模型调用的 LlmCallConfig。
// temperature 声明为 volatile 配置字段：界面按钮（经 settings 服务）写入后
// 立即生效、无需重启，并由 config-editor 持久化到当前 profile 的
// cordis.patch.yml。未设置 = 不发送该字段（跟随提供方默认）。

export const name = 'temperature-picker'

export const Config = z.object({
  temperature: z.number().min(0).max(1.2).volatile(),
})

const readVolatile = (v) => (v && typeof v.get === 'function' ? v.get() : v)

export function apply(ctx, config = {}) {
  ctx.on('agent/request', async (payload, next) => {
    const c = await next()
    if (!c || typeof c !== 'object') return c
    const t = readVolatile(config.temperature)
    const out = { ...c }
    if (typeof t === 'number') {
      out.temperature = t
    } else {
      // 关键：未设置时主动删除，而不是原样放行——agent 循环对后续请求从折叠的
      // request/header 快照出发，若只放行，先前注入过的 temperature 会一直残留。
      // 注意：本插件独占 temperature 字段；若其他插件也开始提供温度，这里会一并移除。
      delete out.temperature
    }
    return out
  })
  console.log('[temperature-picker] agent/request 拦截器已激活（volatile 配置，改动即时生效）')
}
