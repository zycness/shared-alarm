import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/alarm_service.dart';

class AlarmRingingScreen extends ConsumerStatefulWidget {
  final int alarmId;
  final String label;

  const AlarmRingingScreen({
    super.key,
    required this.alarmId,
    required this.label,
  });

  @override
  ConsumerState<AlarmRingingScreen> createState() => _AlarmRingingScreenState();
}

class _AlarmRingingScreenState extends ConsumerState<AlarmRingingScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  bool _dismissing = false;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _dismiss() async {
    if (_dismissing) return;
    setState(() => _dismissing = true);
    await AlarmService.stopAlarm(widget.alarmId);
    if (mounted) context.go('/');
  }

  Future<void> _snooze() async {
    if (_dismissing) return;
    setState(() => _dismissing = true);
    await AlarmService.snoozeAlarm(
      id: widget.alarmId,
      label: widget.label,
    );
    if (mounted) context.go('/');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final now = DateTime.now();
    final timeStr =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: theme.colorScheme.primary,
        body: SafeArea(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                AnimatedBuilder(
                  animation: _pulseController,
                  builder: (context, child) {
                    final scale = 1.0 + (_pulseController.value * 0.15);
                    return Transform.scale(scale: scale, child: child);
                  },
                  child: const Icon(
                    Icons.alarm,
                    size: 120,
                    color: Colors.white,
                  ),
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
                  widget.label,
                  style: theme.textTheme.headlineMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 64),
                SizedBox(
                  width: 240,
                  height: 64,
                  child: FilledButton.icon(
                    onPressed: _dismissing ? null : _dismiss,
                    icon: const Icon(Icons.stop_circle, size: 32),
                    label: Text(
                      _dismissing ? 'Stopping...' : 'Dismiss',
                      style: const TextStyle(fontSize: 20),
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: theme.colorScheme.primary,
                      disabledBackgroundColor: Colors.white70,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: 240,
                  height: 56,
                  child: OutlinedButton.icon(
                    onPressed: _dismissing ? null : _snooze,
                    icon: const Icon(Icons.snooze, size: 28, color: Colors.white),
                    label: const Text(
                      'Snooze 5 min',
                      style: TextStyle(fontSize: 18, color: Colors.white),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.white, width: 2),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
