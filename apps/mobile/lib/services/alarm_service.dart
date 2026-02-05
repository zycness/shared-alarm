import 'package:alarm/alarm.dart';
import 'package:flutter/foundation.dart';

class AlarmService {
  static bool _initialized = false;

  static Future<void> init() async {
    if (_initialized) return;
    await Alarm.init();
    _initialized = true;
    debugPrint('AlarmService: Initialized');
  }

  static Future<void> triggerAlarm({
    required String alarmId,
    required String label,
  }) async {
    if (!_initialized) await init();

    final id = alarmId.hashCode.abs() % 2147483647;

    final settings = AlarmSettings(
      id: id,
      dateTime: DateTime.now().add(const Duration(seconds: 1)),
      assetAudioPath: 'assets/alarm_sound.mp3',
      loopAudio: true,
      vibrate: true,
      androidFullScreenIntent: true,
      volumeSettings: VolumeSettings.fade(
        volume: 1.0,
        fadeDuration: const Duration(seconds: 3),
        volumeEnforced: true,
      ),
      notificationSettings: NotificationSettings(
        title: label,
        body: 'Your alarm is ringing!',
        stopButton: 'Dismiss',
      ),
    );

    await Alarm.set(alarmSettings: settings);
    debugPrint('AlarmService: Alarm set with id=$id label=$label');
  }

  static Future<void> stopAlarm(int id) async {
    await Alarm.stop(id);
    debugPrint('AlarmService: Alarm stopped id=$id');
  }

  static Future<void> snoozeAlarm({
    required int id,
    required String label,
    int minutes = 5,
  }) async {
    await Alarm.stop(id);

    final settings = AlarmSettings(
      id: id,
      dateTime: DateTime.now().add(Duration(minutes: minutes)),
      assetAudioPath: 'assets/alarm_sound.mp3',
      loopAudio: true,
      vibrate: true,
      androidFullScreenIntent: true,
      volumeSettings: VolumeSettings.fade(
        volume: 1.0,
        fadeDuration: const Duration(seconds: 3),
        volumeEnforced: true,
      ),
      notificationSettings: NotificationSettings(
        title: label,
        body: 'Snoozed - will ring again in $minutes minutes',
        stopButton: 'Dismiss',
      ),
    );

    await Alarm.set(alarmSettings: settings);
    debugPrint('AlarmService: Snoozed id=$id for $minutes minutes');
  }

  /// Returns alarms that are currently set (possibly ringing).
  static Future<List<AlarmSettings>> getActiveAlarms() {
    return Alarm.getAlarms();
  }

  // ignore: deprecated_member_use
  static Stream<AlarmSettings> get ringStream => Alarm.ringStream.stream;
}
