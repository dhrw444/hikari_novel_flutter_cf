// CF Worker 反代中继节点 —— 集中管理，跟随上游零冲突
// 部署 cloudflare/worker.js 后，把下面的域名换成你自己的 Worker 域名
//
// 说明：本类不 import wenku8_node.dart，避免循环依赖。
// 中继节点在 Wenku8Node 枚举中的成员为 cfWorker。

class CfWorkerNode {
  /// 你的 Cloudflare Worker 域名（部署 worker.js 后替换）
  static const String relayHost = "hikari-relay.w6062598.workers.dev";

  /// 中继节点完整 base URL
  static const String relayUrl = "https://$relayHost";

  /// 节点显示名（用于 UI 展示）
  static const String displayName = "$relayUrl (CF中继)";

  /// 判断 uri 是否命中中继节点（用于登录 WebView 存 cookie 的 URI 判断）
  static bool isRelayUri(Uri uri) => uri.toString().startsWith(relayUrl);
}
