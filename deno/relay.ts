// Wenku8 反代中继（Deno Deploy 版，推荐）
//
// 背景：wenku8.net 的 Cloudflare WAF 按 ASN 硬封（Error 1020，无 challenge 可解），
// Cloudflare Worker 出口 IP（AS13335）在封锁名单内，故 Worker 版中继不可用。
// Deno Deploy 出口为 GCP IP，实测同类平台（AWS）可正常通过，故迁移至此。
//
// 部署步骤：
//   1. 打开 https://dash.deno.com （GitHub 登录，免费）
//   2. New Playground → 粘贴本文件全部内容 → 右上角 Deploy
//   3. 得到域名（如 xxx.deno.dev），填入 App「设置 → 中继节点域名」
//   （可选）在 Deno Deploy 项目 Settings → Domains 绑定自有域名
//
// 注意：wenku8 页面为 GBK 编码，HTML 中的域名替换必须按字节进行，
// 不能 resp.text()（fetch 规范固定按 UTF-8 解码，GBK 中文会乱码）。

const UPSTREAM = "www.wenku8.net";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Max-Age": "86400",
  };
}

// 字节级替换（GBK 安全：GBK 双字节字符的尾字节范围 0x40-0xFE 且不含 0x7F 以下，
// ASCII 字节序列不会在双字节字符内部出现）
function replaceBytes(body: Uint8Array, from: string, to: string): Uint8Array {
  const enc = new TextEncoder();
  const needle = enc.encode(from);
  const replacement = enc.encode(to);
  const out: number[] = [];
  let i = 0;
  outer: while (i < body.length) {
    if (body[i] === needle[0]) {
      for (let j = 1; j < needle.length; j++) {
        if (i + j >= body.length || body[i + j] !== needle[j]) {
          out.push(body[i++]);
          continue outer;
        }
      }
      for (const b of replacement) out.push(b);
      i += needle.length;
      continue;
    }
    out.push(body[i++]);
  }
  return new Uint8Array(out);
}

Deno.serve(async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const proxyHost = url.host;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  url.protocol = "https:";
  url.host = UPSTREAM;

  const headers = new Headers(request.headers);
  headers.set("Host", UPSTREAM);
  for (const h of [
    "cf-connecting-ip", "x-forwarded-for", "x-real-ip", "cf-ipcountry",
    "cf-ray", "cf-visitor", "x-forwarded-proto", "accept-encoding", "via", "x-deno-trace-id",
  ]) {
    headers.delete(h);
  }

  const resp = await fetch(url.toString(), {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
    redirect: "manual",
  });

  const newHeaders = new Headers(resp.headers);
  for (const [k, v] of Object.entries(corsHeaders())) newHeaders.set(k, v);
  newHeaders.delete("content-encoding"); // 已要求上游不压缩，清除残留头

  // Set-Cookie 改写：去掉 Domain/Secure/SameSite 限制，让 WebView/客户端能接受
  const getSetCookie = (resp.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
  const rawCookies = getSetCookie ? getSetCookie.call(resp.headers) : [];
  if (rawCookies.length > 0) newHeaders.delete("set-cookie");
  for (const sc of rawCookies) {
    const cleaned = sc
      .replace(/;\s*Domain=[^;]*/gi, "")
      .replace(/;\s*Secure/gi, "")
      .replace(/;\s*SameSite=[^;]*/gi, "");
    newHeaders.append("Set-Cookie", cleaned);
  }

  // 跳转地址指回中继
  const loc = resp.headers.get("location");
  if (loc) newHeaders.set("location", loc.replaceAll(UPSTREAM, proxyHost));

  const contentType = resp.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    const body = new Uint8Array(await resp.arrayBuffer());
    const rewritten = replaceBytes(body, UPSTREAM, proxyHost);
    newHeaders.delete("content-length");
    return new Response(rewritten, { status: resp.status, headers: newHeaders });
  }
  return new Response(resp.body, { status: resp.status, headers: newHeaders });
});
