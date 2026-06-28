# Mercado Libre API Proxy — Railway.app 部署指南

## 特点
- **零依赖**：仅使用 Node.js 原生 http/https 模块，无需 npm install
- **轻量**：单个 server.js 文件，约 130 行
- **安全**：只透传必要的认证信息，不存储任何数据

## 一键部署
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/Jl9JXb)

## 手动部署步骤
1. 将 `proxy-server/` 目录上传到你的 GitHub 仓库（可单独建库，也可放本项目内）
2. 登录 [Railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. 选择包含本代码的仓库
4. Railway 会自动检测到 `package.json` 并运行 `npm start`（零依赖，秒部署）
5. 部署完成后，Railway 会提供一个 `https://xxx.railway.app` 的域名
6. 在软件 **API 配置** 弹窗中填入该域名，点击 **保存配置** → **测试代理**

## 本地测试
```bash
node server.js
# 服务运行在 http://localhost:3000
# 测试: curl http://localhost:3000/health
```

## 代理地址说明
部署后得到域名 `https://your-app.railway.app`：

| 用途 | 原始地址 | 代理地址 |
|------|---------|---------|
| ML API 搜索 | `https://api.mercadolibre.com/sites/MLM/search?q=xxx` | `https://your-app.railway.app/api/ml/sites/MLM/search?q=xxx` |
| ML Auth | `https://auth.mercadolibre.com/authorization?...` | `https://your-app.railway.app/auth/ml/authorization?...` |
| 健康检查 | - | `https://your-app.railway.app/health` |

## 注意事项
- 代理地址只需在软件 **API 配置** 弹窗中**填入一次**，会保存到 localStorage
- 留空 = 直连 ML API（限制地区，中国 IP 不可用）
- 部署后若 Railway 域名变更，只需更新代理地址即可
