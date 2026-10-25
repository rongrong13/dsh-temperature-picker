window.__ModuleLoader__.load({
  id: "dsh-temperature-picker",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    const inject = ["slots", "remote", "remote.settings", "locale"];
    // 与宿主端 loader 行 id 一致：settings 服务以条目 id 作为命名空间
    const NS = 'temperature-picker';

    const MIN = 0, MAX = 1.2, STEP = 0.1;
    const fmt = (n) => Number(n).toFixed(1);
    const clampRound = (v) => Math.round(v * 10) / 10;
    // 刻度：每 0.1 一个次刻度；0 / 0.3 / 0.7 / 1 / 1.2 为主刻度（带数字标签）
    const MARKS = [
      { v: 0, label: '0' },
      { v: 0.3, label: '0.3' },
      { v: 0.7, label: '0.7' },
      { v: 1, label: '1' },
      { v: 1.2, label: '1.2' },
    ];
    const LABELED = new Map(MARKS.map((m) => [m.v, m.label]));
    const TICKS = [];
    for (let i = 0; i <= 12; i++) TICKS.push(i / 10);
    const THUMB = 14; // 滑块拇指直径（px），刻度定位按拇指中心计算
    const markLeft = (v) => {
      const p = (v - MIN) / (MAX - MIN);
      return 'calc(' + (THUMB / 2) + 'px + (100% - ' + THUMB + 'px) * ' + p.toFixed(4) + ')';
    };

    // ── i18n：跟随 DSH 界面语言（zh / en，en 为兜底）────────────────────────
    const DICTS = {
      zh: {
        'trigger': '温度',
        'title': '模型温度',
        'current-default': '当前：默认',
        'current-value': '当前：{value}',
        'tooltip-default': '模型温度（temperature）：默认',
        'tooltip-value': '模型温度（temperature）：{value}',
        'set': '设定',
        'reset': '恢复默认',
        'saving': '保存中…',
        'saved': '已设为 {value} ✓ 立即生效并写入配置',
        'cleared': '已恢复默认（不发送 temperature）',
        'failed': '失败：{message}',
        'conflict': '失败：配置正被其他修改占用，请再试一次',
        'invalid-number': '请输入数字',
        'out-of-range': '超出范围：仅支持 {min} – {max}',
        'status-override': '覆盖生效中：{value}',
        'status-default': '默认（跟随提供方）',
        'loading': '读取状态中…',
      },
      en: {
        'trigger': 'Temp',
        'title': 'Model Temperature',
        'current-default': 'Current: default',
        'current-value': 'Current: {value}',
        'tooltip-default': 'Model temperature: default',
        'tooltip-value': 'Model temperature: {value}',
        'set': 'Set',
        'reset': 'Reset',
        'saving': 'Saving…',
        'saved': 'Set to {value} ✓ applied immediately and saved',
        'cleared': 'Reset to default (no temperature sent)',
        'failed': 'Failed: {message}',
        'conflict': 'Failed: the config changed elsewhere — please try again',
        'invalid-number': 'Please enter a number',
        'out-of-range': 'Out of range: only {min} – {max} is supported',
        'status-override': 'Override active: {value}',
        'status-default': 'Default (follows the provider)',
        'loading': 'Loading…',
      },
    };

    const CSS = `
      .dtp-anchor{position:relative;display:inline-flex;align-items:center}
      .dtp-trigger{border:1px solid var(--dsw-alias-border-l2);height:24px;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);cursor:pointer;background:transparent;border-radius:13px;justify-content:center;align-items:center;gap:4px;padding:2px 10px;font-size:12px;font-weight:400;line-height:18px;display:inline-flex;white-space:nowrap}
      .dtp-trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
      .dtp-trigger.has-override{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
      .dtp-trigger svg{flex:none}
      .dtp-backdrop{position:fixed;inset:0;z-index:9990;background:transparent}
      .dtp-pop{position:absolute;bottom:calc(100% + 10px);right:0;z-index:9991;width:340px;max-width:calc(100vw - 24px);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:12px;color:var(--dsw-alias-label-primary);font-size:12px;line-height:1.5;box-shadow:0 10px 34px rgba(0,0,0,.3)}
      .dtp-pop-title{font-size:13px;font-weight:600;line-height:20px;display:flex;align-items:baseline;gap:8px}
      .dtp-pop-title .dtp-cur{font-weight:400;font-size:11px;color:var(--dsw-alias-label-secondary)}
      .dtp-slider-wrap{padding:2px 0 0}
      .dtp-slider{-webkit-appearance:none;appearance:none;width:100%;height:18px;margin:0;padding:0;background:transparent;cursor:pointer;display:block}
      .dtp-slider::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:var(--dsw-alias-border-l2)}
      .dtp-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-brand-primary);border:none;margin-top:-5px;cursor:pointer}
      .dtp-slider::-moz-range-track{height:4px;border-radius:2px;background:var(--dsw-alias-border-l2)}
      .dtp-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-brand-primary);border:none;cursor:pointer}
      .dtp-marks{position:relative;height:20px;margin-top:2px}
      .dtp-mark{position:absolute;top:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:1px}
      .dtp-mark i{display:block;width:1px;height:4px;background:var(--dsw-alias-label-primary);opacity:.45}
      .dtp-mark.major i{width:2px;height:7px;border-radius:1px;opacity:.9}
      .dtp-mark span{font-size:10px;line-height:12px;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
      .dtp-row{display:flex;align-items:center;gap:12px;margin-top:10px}
      .dtp-num{width:72px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);border-radius:8px;padding:5px 8px;font-size:12px;font-variant-numeric:tabular-nums}
      .dtp-num:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
      .dtp-btn{border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);border-radius:8px;padding:5px 12px;cursor:pointer;font-size:12px}
      .dtp-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
      .dtp-btn.primary{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
      .dtp-err{font-size:11px;color:#e25252}
      .dtp-status{min-height:16px;font-size:11px;opacity:.8;white-space:pre-wrap;word-break:break-all;color:var(--dsw-alias-label-secondary)}
    `;

    function ThermoIcon() {
      return React.createElement('svg', { width: 11, height: 11, viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': true },
        React.createElement('path', {
          d: 'M5 2a1.5 1.5 0 0 1 3 0v4.1a2.8 2.8 0 1 1-3 0V2z',
          stroke: 'currentColor', strokeWidth: 1.1, strokeLinejoin: 'round',
        }),
        React.createElement('circle', { cx: 6.5, cy: 8.8, r: 1.2, fill: 'currentColor' })
      );
    }

    function Panel(props) {
      const remote = props.remote;
      const t = props.t;
      // 语言切换时重渲染（locale snapshot revision 单调递增）
      if (props.localeSubscribe && props.localeRevision) {
        React.useSyncExternalStore(props.localeSubscribe, props.localeRevision);
      }
      const [open, setOpen] = React.useState(false);
      const [current, setCurrent] = React.useState(undefined); // number | undefined（undefined = 跟随默认）
      const [draft, setDraft] = React.useState(0.7);           // 滑条/输入框的本地草稿
      const [inputText, setInputText] = React.useState('0.7');
      const [status, setStatus] = React.useState('');
      const [error, setError] = React.useState('');
      const [loaded, setLoaded] = React.useState(false);

      const fetchNs = React.useCallback(async () => {
        const res = await remote.settings.describe();
        if (res && res.ok) {
          const ns = (res.value.namespaces || []).find((n) => n.ns === NS);
          return ns || null;
        }
        return null;
      }, [remote]);

      const load = React.useCallback(() => {
        fetchNs().then((ns) => {
          if (ns) {
            const v = ns.value || {};
            const val = typeof v.temperature === 'number' ? v.temperature : undefined;
            setCurrent(val);
            if (typeof val === 'number') { setDraft(val); setInputText(fmt(val)); }
          }
          setLoaded(true);
        }).catch(() => setLoaded(true));
      }, [fetchNs]);

      React.useEffect(() => { load(); }, [load]);

      // 写入：每次写前重新拉取最新 revision；遇并发冲突（revision 已被推进）自动重试一次
      const write = async (ops, okText) => {
        setStatus(t('saving'));
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const fresh = await fetchNs();
            const rev = fresh ? fresh.revision : undefined;
            const res = await remote.settings.mutate(NS, ops, rev);
            if (res && res.ok) {
              setStatus(okText);
              load();
              return true;
            }
            const msg = (res && res.error && res.error.message) || 'unknown error';
            if (attempt === 0 && /changed since it was read/.test(msg)) continue;
            setStatus(t('failed', { message: msg }));
            return false;
          } catch (e) {
            const msg = String((e && e.message) || e);
            if (attempt === 0 && /changed since it was read/.test(msg)) continue;
            setStatus(t('failed', { message: msg }));
            return false;
          }
        }
        setStatus(t('conflict'));
        return false;
      };

      const commitValue = (v) => {
        const val = clampRound(v);
        setDraft(val); setInputText(fmt(val)); setError('');
        return write([{ op: 'set', path: ['temperature'], value: val }],
          t('saved', { value: fmt(val) })).then((ok) => { if (ok) setCurrent(val); });
      };

      const clear = () => {
        setError('');
        write([{ op: 'unset', path: ['temperature'] }], t('cleared'))
          .then((ok) => { if (ok) setCurrent(undefined); });
      };

      // 数字输入：范围检查 0–1.2，按 0.1 步长归整
      const commitInput = () => {
        const v = Number(inputText);
        if (inputText.trim() === '' || Number.isNaN(v)) { setError(t('invalid-number')); return; }
        if (v < MIN || v > MAX) { setError(t('out-of-range', { min: fmt(MIN), max: fmt(MAX) })); return; }
        commitValue(v);
      };

      const hasOverride = typeof current === 'number';

      return React.createElement('div', { className: 'dtp-anchor' },
        React.createElement('button', {
          className: 'dtp-trigger' + (hasOverride ? ' has-override' : ''),
          title: hasOverride ? t('tooltip-value', { value: fmt(current) }) : t('tooltip-default'),
          onClick: () => setOpen((v) => !v),
        },
          React.createElement(ThermoIcon, null),
          React.createElement('span', null, hasOverride ? fmt(current) : t('trigger'))
        ),
        open ? React.createElement('div', { className: 'dtp-backdrop', onClick: () => setOpen(false) }) : null,
        open ? React.createElement('div', { className: 'dtp-pop' },
          React.createElement('div', { className: 'dtp-pop-title' },
            t('title') + ' ',
            React.createElement('span', { className: 'dtp-cur' }, hasOverride ? t('current-value', { value: fmt(current) }) : t('current-default'))
          ),

          // 滑条（刻度线 + 标签与拇指中心对齐）
          React.createElement('div', { className: 'dtp-slider-wrap' },
            React.createElement('input', {
              type: 'range', className: 'dtp-slider', min: String(MIN), max: String(MAX), step: String(STEP),
              value: draft,
              onChange: (e) => { const v = Number(e.target.value); setDraft(v); setInputText(fmt(v)); },
              onPointerUp: () => commitValue(draft),
              onKeyUp: (e) => { if (e.key && e.key.startsWith('Arrow')) commitValue(draft); },
            }),
            React.createElement('div', { className: 'dtp-marks' },
              TICKS.map((v) => {
                const label = LABELED.get(v);
                return React.createElement('div', {
                  key: fmt(v), className: 'dtp-mark' + (label !== undefined ? ' major' : ''), style: { left: markLeft(v) },
                },
                  React.createElement('i', null),
                  label !== undefined ? React.createElement('span', null, label) : null
                );
              })
            )
          ),

          // 直接输入（带范围检查）
          React.createElement('div', { className: 'dtp-row' },
            React.createElement('input', {
              type: 'number', className: 'dtp-num', min: String(MIN), max: String(MAX), step: String(STEP),
              value: inputText,
              onChange: (e) => setInputText(e.target.value),
              onKeyDown: (e) => { if (e.key === 'Enter') commitInput(); },
              onBlur: () => { if (inputText.trim() !== '') commitInput(); },
            }),
            React.createElement('button', { className: 'dtp-btn primary', onClick: commitInput }, t('set')),
            React.createElement('button', { className: 'dtp-btn', onClick: clear }, t('reset'))
          ),
          error ? React.createElement('div', { className: 'dtp-err' }, error) : null,
          React.createElement('div', { className: 'dtp-status' }, loaded ? (status || (hasOverride ? t('status-override', { value: fmt(current) }) : t('status-default'))) : t('loading'))
        ) : null
      );
    }

    function apply(ctx) {
      const remote = ctx.remote;
      if (!remote || !remote.settings) {
        console.warn('[temperature-picker] ctx.remote.settings unavailable; button not mounted');
        return;
      }

      // 语言探测：读取宿主 locale 快照跟随界面语言，失败时按浏览器语言兜底。
      // 字典查找在本插件内部完成（不写入宿主注册表），避免客户端 HMR 重挂载时
      // "先挂载后清理"把刚注册的字典误删、最终回退显示成键名的问题。
      const pickDict = () => {
        let active;
        try { active = ctx.locale && ctx.locale.getSnapshot ? ctx.locale.getSnapshot().active : undefined } catch { active = undefined }
        const lang = (active || (typeof navigator !== 'undefined' ? navigator.language : '') || '').toLowerCase();
        return lang.startsWith('zh') ? DICTS.zh : DICTS.en;
      };
      const t = (key, params) => {
        const s = pickDict()[key] ?? DICTS.en[key] ?? key;
        return params ? s.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m)) : s;
      };
      // 仅订阅语言切换用于重渲染（订阅不改动宿主状态，无竞态）
      let localeSubscribe = null;
      let localeRevision = null;
      if (ctx.locale) {
        localeSubscribe = (cb) => ctx.locale.subscribe(cb);
        localeRevision = () => ctx.locale.getSnapshot().revision;
      }

      const tagId = 'dsh-temperature-picker/styles';
      if (typeof document !== 'undefined' && !document.querySelector('style[data-plugin-css="' + tagId + '"]')) {
        const tag = document.createElement('style');
        tag.setAttribute('data-plugin-css', tagId);
        tag.textContent = CSS;
        document.head.appendChild(tag);
      }

      // conversation.input.right 渲染在模型选择按钮左侧（见 ui-conversation 的 composer 布局）
      ctx.slots.inject('conversation.input.right', () => ctx.slots.register(
        { name: 'conversation.input.right', id: 'temperature-picker', order: 0 },
        () => React.createElement(Panel, { remote, t, localeSubscribe, localeRevision }),
      ));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
