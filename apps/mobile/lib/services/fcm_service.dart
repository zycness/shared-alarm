import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'alarm_service.dart';
import 'api_service.dart';

class FcmService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final ApiService _api;

  FcmService(this._api);

  Future<void> initialize() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      criticalAlert: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      debugPrint('FCM: Notification permission denied');
      return;
    }

    final token = await _messaging.getToken();
    if (token != null) {
      await _registerToken(token);
    }

    _messaging.onTokenRefresh.listen(_registerToken);

    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
  }

  Future<void> _registerToken(String token) async {
    final platform = Platform.isIOS ? 'ios' : 'android';
    try {
      await _api.registerFcmToken(token: token, platform: platform);
      debugPrint('FCM: Token registered ($platform)');
    } catch (e) {
      debugPrint('FCM: Failed to register token: $e');
    }
  }

  Future<void> unregister() async {
    try {
      await _api.unregisterFcmToken();
      await _messaging.deleteToken();
      debugPrint('FCM: Token unregistered');
    } catch (e) {
      debugPrint('FCM: Failed to unregister: $e');
    }
  }

  void _handleForegroundMessage(RemoteMessage message) {
    debugPrint('FCM: Foreground message: ${message.data}');
    if (message.data['type'] == 'alarm_triggered') {
      AlarmService.triggerAlarm(
        alarmId: message.data['alarmId'] ?? 'unknown',
        label: message.data['label'] ?? 'Alarm!',
      );
    }
  }
}

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('FCM: Background message: ${message.data}');
  if (message.data['type'] == 'alarm_triggered') {
    await AlarmService.init();
    await AlarmService.triggerAlarm(
      alarmId: message.data['alarmId'] ?? 'unknown',
      label: message.data['label'] ?? 'Alarm!',
    );
  }
}
