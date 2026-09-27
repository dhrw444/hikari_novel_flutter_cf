import 'package:flutter/material.dart';
import 'package:get/get.dart';

const String kAppName = "Hikari Novel";

const String kLatestUrl = "https://api.github.com/repos/15dd/hikari_novel_flutter/releases/latest";

const Map<String, String> kUserAgent = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
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
