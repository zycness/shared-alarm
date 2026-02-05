import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:intl/intl.dart';
import '../providers/alarm_provider.dart';
import '../providers/auth_provider.dart';
import '../models/alarm.dart';
import '../services/ws_service.dart';

class AlarmDetailScreen extends ConsumerStatefulWidget {
  final String alarmId;

  const AlarmDetailScreen({super.key, required this.alarmId});

  @override
  ConsumerState<AlarmDetailScreen> createState() => _AlarmDetailScreenState();
}

class _AlarmDetailScreenState extends ConsumerState<AlarmDetailScreen> {
  final WsService _ws = WsService();
  Timer? _countdownTimer;
  Duration _remaining = Duration.zero;
  Alarm? _alarm;
  bool _loading = true;
  StreamSubscription? _wsSub;

  @override
  void initState() {
    super.initState();
    _loadAlarm();
  }

  Future<void> _loadAlarm() async {
    try {
      final api = ref.read(apiServiceProvider);
      final alarm = await api.getAlarm(widget.alarmId);
      setState(() {
        _alarm = alarm;
        _loading = false;
      });
      _startCountdown();
      _connectWs();
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    _updateRemaining();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      _updateRemaining();
    });
  }

  void _updateRemaining() {
    if (_alarm == null) return;
    final target = DateTime.parse(_alarm!.targetTime);
    final now = DateTime.now().toUtc();
    final diff = target.difference(now);
    setState(() {
      _remaining = diff.isNegative ? Duration.zero : diff;
    });
  }

  void _connectWs() {
    if (_alarm == null) return;
    _ws.connect(_alarm!.id);
    _wsSub = _ws.stream.listen((msg) {
      final type = msg['type'] as String?;
      if (type == 'alarm_extended' || type == 'alarm_triggered') {
        _loadAlarm();
      }
    });
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _wsSub?.cancel();
    _ws.dispose();
    super.dispose();
  }

  void _shareAlarm() {
    if (_alarm == null) return;
    final api = ref.read(apiServiceProvider);
    final url = api.getShareUrl(_alarm!.shareToken);
    Share.share('Extend my alarm "${_alarm!.label}": $url');
  }

  Future<void> _cancelAlarm() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Alarm'),
        content: const Text('Are you sure you want to cancel this alarm?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Yes, Cancel')),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(alarmListProvider.notifier).cancelAlarm(widget.alarmId);
      _loadAlarm();
    }
  }

  String _formatDuration(Duration d) {
    final hours = d.inHours;
    final minutes = d.inMinutes.remainder(60);
    final seconds = d.inSeconds.remainder(60);
    if (hours > 0) {
      return '${hours}h ${minutes}m ${seconds}s';
    }
    return '${minutes}m ${seconds}s';
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Alarm Detail')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_alarm == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Alarm Detail')),
        body: const Center(child: Text('Alarm not found')),
      );
    }

    final alarm = _alarm!;
    final formatter = DateFormat('MMM d, y HH:mm:ss');
    final targetLocal = DateTime.parse(alarm.targetTime).toLocal();
    final isExpired = _remaining == Duration.zero;

    return Scaffold(
      appBar: AppBar(
        title: Text(alarm.label),
        actions: [
          if (alarm.isActive)
            IconButton(
              icon: const Icon(Icons.share),
              onPressed: _shareAlarm,
            ),
          if (alarm.isActive)
            IconButton(
              icon: const Icon(Icons.cancel),
              onPressed: _cancelAlarm,
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadAlarm,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            // Status
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: alarm.isActive
                      ? Colors.green.withValues(alpha: 0.1)
                      : alarm.isTriggered
                          ? Colors.red.withValues(alpha: 0.1)
                          : Colors.grey.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  alarm.status.toUpperCase(),
                  style: TextStyle(
                    color: alarm.isActive ? Colors.green : alarm.isTriggered ? Colors.red : Colors.grey,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Countdown
            if (alarm.isActive && !isExpired) ...[
              Center(
                child: Text(
                  _formatDuration(_remaining),
                  style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  'Target: ${formatter.format(targetLocal)}',
                  style: const TextStyle(color: Colors.grey),
                ),
              ),
            ] else if (alarm.isTriggered || isExpired) ...[
              const Center(
                child: Icon(Icons.alarm_on, size: 80, color: Colors.red),
              ),
              const SizedBox(height: 16),
              const Center(
                child: Text(
                  'ALARM TRIGGERED!',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.red),
                ),
              ),
            ] else ...[
              const Center(
                child: Text(
                  'Alarm Cancelled',
                  style: TextStyle(fontSize: 20, color: Colors.grey),
                ),
              ),
            ],

            const SizedBox(height: 24),

            // Info
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Min Extension: ${alarm.minExtensionMinutes} min',
                        style: const TextStyle(fontSize: 14)),
                    const SizedBox(height: 8),
                    Text('Share Token: ${alarm.shareToken}',
                        style: const TextStyle(fontSize: 14, color: Colors.grey)),
                  ],
                ),
              ),
            ),

            // Extensions
            if (alarm.extensions != null && alarm.extensions!.isNotEmpty) ...[
              const SizedBox(height: 24),
              const Text('Extensions',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              ...alarm.extensions!.map((ext) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: const Icon(Icons.timer, color: Colors.blue),
                      title: Text(ext.extendedByName),
                      subtitle: Text(
                        '+${ext.extensionMinutes} min',
                        style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold),
                      ),
                      trailing: Text(
                        DateFormat('HH:mm').format(DateTime.parse(ext.createdAt).toLocal()),
                        style: const TextStyle(color: Colors.grey),
                      ),
                    ),
                  )),
            ],

            if (alarm.isActive) ...[
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: _shareAlarm,
                icon: const Icon(Icons.share),
                label: const Text('Share this alarm'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
