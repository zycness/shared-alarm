import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/alarm_service.dart';

class AlarmRingingScreen extends ConsumerWidget {
  final int alarmId;
  final String label;

  const AlarmRingingScreen({
    super.key,
    required this.alarmId,
    required this.label,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final now = DateTime.now();
    final timeStr =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

    return Scaffold(
      backgroundColor: theme.colorScheme.primary,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.alarm,
                size: 120,
                color: Colors.white,
              ),
              const SizedBox(height: 24),
              Text(
                timeStr,
                style: theme.textTheme.displayLarge?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                label,
                style: theme.textTheme.headlineMedium?.copyWith(
                  color: Colors.white.withValues(alpha: 0.9),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 64),
              FilledButton.icon(
                onPressed: () async {
                  await AlarmService.stopAlarm(alarmId);
                  if (context.mounted) context.go('/');
                },
                icon: const Icon(Icons.stop_circle, size: 32),
                label: const Text(
                  'Dismiss',
                  style: TextStyle(fontSize: 20),
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: theme.colorScheme.primary,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 48,
                    vertical: 16,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: () async {
                  await AlarmService.snoozeAlarm(
                    id: alarmId,
                    label: label,
                  );
                  if (context.mounted) context.go('/');
                },
                icon: const Icon(Icons.snooze, size: 28, color: Colors.white),
                label: const Text(
                  'Snooze 5 min',
                  style: TextStyle(fontSize: 18, color: Colors.white),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.white, width: 2),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 40,
                    vertical: 14,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
