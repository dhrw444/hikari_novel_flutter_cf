// Cloudflare Worker — wenku8 反向代理中继
// 部署：Cloudflare Dashboard → Workers & Pages → 粘贴此代码 → Deploy

const UPSTREAM = "www.wenku8.net";

// HTMLRewriter 处理器：替换元素属性中的 wenku8 域名
class DomainRewriter {
  constructor(proxyHost) {
    this.proxyHost = proxyHost;
  }

  element(el) {
    const rewritableAttrs = [
      "action", "href", "src", "data-url",
      "content", "onclick", "onload",
    ];
    for (const attr of rewritableAttrs) {
      const value = el.getAttribute(attr);
      if (value) {
        let newVal = value.replace(/https?:\/\/www\.wenku8\.net/gi, "https://" + this.proxyHost);
        newVal = newVal.replace(/www\.wenku8\.net/gi, this.proxyHost);
        if (newVal !== value) {
          el.setAttribute(attr, newVal);
        }
      }
    }
  }
}

export default {
  async fetch(request) {
    const proxyHost = new URL(request.url).host;
    const url = new URL(request.url);
    url.protocol = "https:";
    url.host = UPSTREAM;

    const headers = new Headers(request.headers);
    headers.set("Host", UPSTREAM);
    headers.set("Referer", `https://${UPSTREAM}/`);
    headers.set("User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
    headers.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
    headers.set("Accept-Language", "zh-CN,zh;q=0.9");
    headers.delete("cf-connecting-ip");
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");
    headers.delete("cf-ipcountry");
    headers.delete("cf-ray");
    headers.delete("cf-visitor");

    const req = new Request(url.toString(), {
      method: request.method,
      headers: headers,
      body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
      redirect: "manual",
    });

    let resp = await fetch(req);

    // 重定向响应：改写 Location + 透传 Set-Cookie
    if ([301, 302, 303, 307, 308].includes(resp.status)) {
      const newResp = new Response(resp.body, resp);

      // 改写 Location
      const location = resp.headers.get("Location");
      if (location) {
        try {
          const escapedUpstream = UPSTREAM.replace(/\./g, "\\.");
          let newLoc = location;
          // 替换所有出现的 wenku8 上游域名（含协议前缀和裸域名）
          newLoc = newLoc.replace(new RegExp("//" + escapedUpstream, "gi"), "//" + proxyHost);
          newLoc = newLoc.replace(new RegExp(escapedUpstream, "g"), proxyHost);
          newResp.headers.set("Location", newLoc);
        } catch (e) {
          newResp.headers.set("Location", location);
        }
      }

      // 透传 Set-Cookie，剥离 Domain 限制
      const setCookies = resp.headers.getSetCookie ? resp.headers.getSetCookie() : [];
      for (let raw of setCookies) {
        raw = raw.replace(/;\s*Domain=[^;]+/gi, "");
        raw = raw.replace(/;\s*SameSite=[^;]+/gi, "");
        newResp.headers.append("Set-Cookie", raw);
      }

      return newResp;
    }

    // 正常响应：用 HTMLRewriter 改写元素属性中的域名（不改编码）
    const contentType = resp.headers.get("Content-Type") || "";
    if (contentType.includes("text/html")) {
      const rewriter = new HTMLRewriter()
        .on("*", new DomainRewriter(proxyHost));
      resp = rewriter.transform(resp);
      // HTMLRewriter.transform 返回的是流式 Response，需要重新包装以添加 CORS 头
      resp = new Response(resp.body, resp);
    } else {
      resp = new Response(resp.body, resp);
    }
    resp.headers.set("Access-Control-Allow-Origin", "*");
    resp.headers.set("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS");
    resp.headers.set("Access-Control-Allow-Headers", "*");
    return resp;
  }
};
