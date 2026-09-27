plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "pers.cyh128.hikari_novel"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "pers.cyh128.hikari_novel"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        // cronet_http 要求 minSdk >= 24（其 android/build.gradle 固定 minSdkVersion 24）
        minSdk = maxOf(flutter.minSdkVersion, 24)
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
apply(from = "signing-config.gradle")

// 强制使用 embedded Cronet（内置 Chromium 网络栈，无需 Google Play 服务）。
//
// 背景：cronet_http 默认依赖 play-services-cronet，真正的网络栈由 GMS Core 提供，
// 无 GMS 的设备上 Cronet 不可用 → NativeAdapter 回退到 dart:io(BoringSSL)，
// TLS/HTTP2 指纹与 Chromium 不一致，Cloudflare 依旧拦截。
// 这里直接锁定 cronet-embedded，使所有设备（含国产无 GMS 机型）都使用内置 Chromium 指纹。
// 注意：dart-define 方式不可靠（插件子工程读不到 project.property('dart-defines')），
// 实测走 dart-define 时产物 APK 内无 libcronet*.so，故改为在 app 模块显式声明。
dependencies {
    implementation("org.chromium.net:cronet-embedded:143.7445.0")
}

// 与 embedded 版提供重复的 org.chromium.net 类，必须排除其中一个
configurations.configureEach {
    exclude(group = "com.google.android.gms", module = "play-services-cronet")
}
