// Cloudflare Worker — wenku8 反向代理中继 v2
// v2 修复：透传真实 UA/指纹头（伪造会导致 CF challenge 永不通过）、
//          challenge 页与 /cdn-cgi/ 路径不做任何改写、本地应答 OPTIONS

const UPSTREAM = "www.wenku8.net";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

class DomainRewriter {
  constructor(proxyHost) { this.proxyHost = proxyHost; }
  element(el) {
    for (const attr of ["action", "href", "src", "data-url", "content", "onclick", "onload"]) {
      const value = el.getAttribute(attr);
      if (value) {
        let v = value.replace(/https?:\/\/www\.wenku8\.net/gi, "https://" + this.proxyHost);
        v = v.replace(/www\.wenku8\.net/gi, this.proxyHost);
        if (v !== value) el.setAttribute(attr, v);
      }
    }
  }
}

function forwardSetCookies(fromResp, toResp) {
  const setCookies = fromResp.headers.getSetCookie ? fromResp.headers.getSetCookie() : [];
  for (let raw of setCookies) {
    raw = raw.replace(/;\s*Domain=[^;]+/gi, "");
    raw = raw.replace(/;\s*SameSite=[^;]+/gi, "");
    toResp.headers.append("Set-Cookie", raw);
  }
}

function isChallenge(resp) {
  // CF challenge 响应：cf-mitigated: challenge，或 /cdn-cgi/ 相关
  return (resp.headers.get("cf-mitigated") || "").includes("challenge");
}

export default {
  async fetch(request) {
    const proxyHost = new URL(request.url).host;

    // OPTIONS 预检本地应答，不转发上游
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    url.protocol = "https:";
    url.host = UPSTREAM;

    // 透传客户端真实请求头（UA/指纹必须真实，否则 CF challenge 必失败）
    // 只改 Host；删除会暴露中继或导致校验失败的头
    const headers = new Headers(request.headers);
    headers.set("Host", UPSTREAM);
    headers.delete("cf-connecting-ip");
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");
    headers.delete("cf-ipcountry");
    headers.delete("cf-ray");
    headers.delete("cf-visitor");
    headers.delete("x-forwarded-proto");
    // 让上游返回未压缩内容，避免 HTMLRewriter 处理压缩流的问题
    headers.delete("accept-encoding");

    const isCdnCgi = url.pathname.startsWith("/cdn-cgi/");

    const req = new Request(url.toString(), {
      method: request.method,
      headers: headers,
      body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
      redirect: "manual",
    });

    let resp = await fetch(req);

    // /cdn-cgi/（challenge 回调）与 challenge 页：原样透传，一个字节都不改
    if (isCdnCgi || isChallenge(resp)) {
      const newResp = new Response(resp.body, resp);
      forwardSetCookies(resp, newResp);
      for (const [k, v] of Object.entries(CORS)) newResp.headers.set(k, v);
      return newResp;
    }

    // 重定向：改写 Location + 透传 Set-Cookie
    if ([301, 302, 303, 307, 308].includes(resp.status)) {
      const newResp = new Response(resp.body, resp);
      const location = resp.headers.get("Location");
      if (location) {
        try {
          const esc = UPSTREAM.replace(/\./g, "\\.");
          let newLoc = location
            .replace(new RegExp("//" + esc, "gi"), "//" + proxyHost)
            .replace(new RegExp(esc, "g"), proxyHost);
          newResp.headers.set("Location", newLoc);
        } catch (e) { /* 保持原样 */ }
      }
      forwardSetCookies(resp, newResp);
      for (const [k, v] of Object.entries(CORS)) newResp.headers.set(k, v);
      return newResp;
    }

    // 正常 HTML：改写页面里的上游域名
    const contentType = resp.headers.get("Content-Type") || "";
    if (contentType.includes("text/html")) {
      resp = new HTMLRewriter().on("*", new DomainRewriter(proxyHost)).transform(resp);
      resp = new Response(resp.body, resp);
      forwardSetCookies(resp, resp);
    } else {
      const orig = resp;
      resp = new Response(orig.body, orig);
      forwardSetCookies(orig, resp);
    }
    for (const [k, v] of Object.entries(CORS)) resp.headers.set(k, v);
    return resp;
  }
};
