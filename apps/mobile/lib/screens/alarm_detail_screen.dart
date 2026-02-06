import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:intl/intl.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
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
    final l10n = AppLocalizations.of(context)!;
    final api = ref.read(apiServiceProvider);
    final url = api.getShareUrl(_alarm!.shareToken);
    Share.share(l10n.shareAlarmMessage(_alarm!.label, url));
  }

  Future<void> _cancelAlarm() async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.cancelAlarm),
        content: Text(l10n.cancelAlarmConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l10n.no)),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text(l10n.yesCancel)),
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
    final l10n = AppLocalizations.of(context)!;

    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: Text(l10n.alarmDetail)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_alarm == null) {
      return Scaffold(
        appBar: AppBar(title: Text(l10n.alarmDetail)),
        body: Center(child: Text(l10n.alarmNotFound)),
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
                      ? const Color(0xFF34D399).withValues(alpha: 0.1)
                      : alarm.isTriggered
                          ? const Color(0xFFF87171).withValues(alpha: 0.1)
                          : const Color(0xFF64748B).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  alarm.isActive ? l10n.statusActive : alarm.isTriggered ? l10n.statusTriggered : l10n.statusCancelled,
                  style: TextStyle(
                    color: alarm.isActive ? const Color(0xFF34D399) : alarm.isTriggered ? const Color(0xFFF87171) : const Color(0xFF64748B),
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
                  l10n.targetLabel(formatter.format(targetLocal)),
                  style: const TextStyle(color: Color(0xFF64748B)),
                ),
              ),
            ] else if (alarm.isTriggered || isExpired) ...[
              const Center(
                child: Icon(Icons.alarm_on, size: 80, color: Color(0xFFF87171)),
              ),
              const SizedBox(height: 16),
              Center(
                child: Text(
                  l10n.alarmTriggered,
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFFF87171)),
                ),
              ),
            ] else ...[
              Center(
                child: Text(
                  l10n.alarmCancelled,
                  style: const TextStyle(fontSize: 20, color: Color(0xFF64748B)),
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
                    Text(l10n.minExtensionInfo(alarm.minExtensionMinutes),
                        style: const TextStyle(fontSize: 14)),
                    const SizedBox(height: 8),
                    Text(l10n.shareToken(alarm.shareToken),
                        style: const TextStyle(fontSize: 14, color: Colors.grey)),
                  ],
                ),
              ),
            ),

            // Extensions
            if (alarm.extensions != null && alarm.extensions!.isNotEmpty) ...[
              const SizedBox(height: 24),
              Text(l10n.extensions,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              ...alarm.extensions!.map((ext) {
                final isReduction = ext.extensionMinutes < 0;
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: (isReduction ? const Color(0xFFF87171) : const Color(0xFF818CF8)).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        isReduction ? Icons.timer_off : Icons.timer,
                        color: isReduction ? const Color(0xFFF87171) : const Color(0xFF818CF8),
                        size: 20,
                      ),
                    ),
                    title: Text(ext.extendedByName),
                    subtitle: Text(
                      '${ext.extensionMinutes > 0 ? "+" : ""}${ext.extensionMinutes} min',
                      style: TextStyle(
                        color: isReduction ? const Color(0xFFF87171) : const Color(0xFF34D399),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    trailing: Text(
                      DateFormat('HH:mm').format(DateTime.parse(ext.createdAt).toLocal()),
                      style: const TextStyle(color: Color(0xFF64748B)),
                    ),
                  ),
                );
              }),
            ],

            if (alarm.isActive) ...[
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _shareAlarm,
                      icon: const Icon(Icons.share),
                      label: Text(l10n.shareThisAlarm),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        final api = ref.read(apiServiceProvider);
                        final url = api.getShareUrl(alarm.shareToken);
                        Clipboard.setData(ClipboardData(text: url));
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(l10n.linkCopied)),
                        );
                      },
                      icon: const Icon(Icons.copy),
                      label: Text(l10n.copyLink),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
