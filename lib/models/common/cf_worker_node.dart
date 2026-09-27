// CF 反代中继节点 —— 集中管理，跟随上游零冲突
//
// 中继部署方式（二选一，部署后在 App「设置 → 中继节点域名」填入你的域名即可，无需重新打包）：
//   - deno/relay.ts        ：Deno Deploy（推荐，出口 IP 为 GCP）
//   - cloudflare/worker.js ：Cloudflare Worker（注意：wenku8 的 CF WAF 已按 ASN 封锁 Cloudflare
//                            出口 IP(AS13335)，Worker 版会被 Error 1020 硬封，不可用，仅留档）
//
// 说明：本类不 import wenku8_node.dart / local_storage_service.dart，避免循环依赖。
// 中继域名由 main.dart 启动时从本地存储注入（CfWorkerNode.relayHost = ...）。

class CfWorkerNode {
  /// 默认中继域名
  static const String defaultRelayHost = "dhr.kdns.fr";

  /// 当前生效的中继域名（启动时从本地存储注入，设置页可改）
  static String relayHost = defaultRelayHost;

  /// 中继节点完整 base URL
  static String get relayUrl => "https://$relayHost";

  /// 节点显示名（用于 UI 展示）
  static String get displayName => "$relayUrl (CF中继)";

  /// 判断 uri 是否命中中继节点（用于登录 WebView 存 cookie 的 URI 判断）
  static bool isRelayUri(Uri uri) => uri.toString().startsWith(relayUrl);
}
