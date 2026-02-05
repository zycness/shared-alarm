import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/alarm.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class AlarmListState {
  final List<Alarm> alarms;
  final bool loading;
  final String? error;

  const AlarmListState({
    this.alarms = const [],
    this.loading = false,
    this.error,
  });

  AlarmListState copyWith({
    List<Alarm>? alarms,
    bool? loading,
    String? error,
  }) {
    return AlarmListState(
      alarms: alarms ?? this.alarms,
      loading: loading ?? this.loading,
      error: error,
    );
  }
}

class AlarmListNotifier extends StateNotifier<AlarmListState> {
  final ApiService _api;

  AlarmListNotifier(this._api) : super(const AlarmListState());

  Future<void> loadAlarms() async {
    state = state.copyWith(loading: true, error: null);
    try {
      final alarms = await _api.getAlarms();
      state = state.copyWith(alarms: alarms, loading: false);
    } catch (e) {
      state = state.copyWith(loading: false, error: 'Failed to load alarms');
    }
  }

  Future<Alarm> createAlarm({
    required String targetTime,
    required int minExtensionMinutes,
    required String label,
  }) async {
    final alarm = await _api.createAlarm(
      targetTime: targetTime,
      minExtensionMinutes: minExtensionMinutes,
      label: label,
    );
    state = state.copyWith(alarms: [alarm, ...state.alarms]);
    return alarm;
  }

  Future<void> cancelAlarm(String id) async {
    await _api.cancelAlarm(id);
    state = state.copyWith(
      alarms: state.alarms
          .map((a) => a.id == id
              ? Alarm.fromJson({
                  ...{
                    'id': a.id,
                    'ownerId': a.ownerId,
                    'targetTime': a.targetTime,
                    'minExtensionMinutes': a.minExtensionMinutes,
                    'label': a.label,
                    'shareToken': a.shareToken,
                    'status': 'cancelled',
                    'createdAt': a.createdAt,
                    'updatedAt': DateTime.now().toIso8601String(),
                  }
                })
              : a)
          .toList(),
    );
  }
}

final alarmListProvider =
    StateNotifierProvider<AlarmListNotifier, AlarmListState>((ref) {
  return AlarmListNotifier(ref.read(apiServiceProvider));
});

final alarmDetailProvider =
    FutureProvider.family<Alarm, String>((ref, id) async {
  final api = ref.read(apiServiceProvider);
  return api.getAlarm(id);
});
