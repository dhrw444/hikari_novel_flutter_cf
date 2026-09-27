import 'package:flutter/material.dart';
import 'package:get/get.dart';

const String kAppName = "Hikari Novel";

const String kLatestUrl = "https://api.github.com/repos/15dd/hikari_novel_flutter/releases/latest";

/// 浏览器 UA：WebView 登录、图片加载、Dio 请求三处必须完全一致
/// （Cloudflare 会校验 UA 与 cf_clearance 的绑定关系）
const String kBrowserUserAgent =
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";

const Map<String, String> kUserAgent = {"User-Agent": kBrowserUserAgent};

/// Dio 请求头：Cloudflare 机器人判定所需的浏览器特征头。
///
/// 实测（直连 www.wenku8.net）：只带 User-Agent、或只带 Referer 时，站内深层接口
/// （toplist.php / reader.php / search.php …）返回 403 + `cf-mitigated: challenge`；
/// 补上 sec-fetch-* 后即可直连源站正常取数据，无需 cf_clearance、无需伪造 TLS 指纹。
/// 三个 sec-fetch 头任意一个单独出现即可通过，这里保留三件套以更贴近真实浏览器。
/// Referer / Origin 由 _BrowserHeaderInterceptor 按目标域名动态补全。
const Map<String, String> kBrowserHeaders = {
  "User-Agent": kBrowserUserAgent,
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "sec-fetch-site": "same-origin",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
};

const int kStatusBarPadding = 30;

const double kSmallIconSize = 16.0;

final TextStyle kBaseTileTitleTextStyle = TextStyle(fontSize: 15, fontWeight: FontWeight.w500);

final TextStyle kBaseTileSubtitleTextStyle = TextStyle(fontSize: 13);

const double kCardBorderRadius = 6.0;

const EdgeInsets kCommentAndReplyCardPadding = EdgeInsets.fromLTRB(20, 16, 20, 16);

final TextStyle kCommentAndReplyUsernameTextStyle = TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Theme.of(Get.context!).colorScheme.primary);

const int kScrollReadMode = 1;

const int kPageReadMode = 2;
