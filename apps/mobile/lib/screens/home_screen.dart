import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import '../providers/auth_provider.dart';
import '../providers/alarm_provider.dart';
import '../providers/locale_provider.dart';
import '../models/alarm.dart';
import 'package:intl/intl.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(alarmListProvider.notifier).loadAlarms());
  }

  void _showLanguageDialog() {
    final l10n = AppLocalizations.of(context)!;
    showDialog(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: Text(l10n.language),
        children: [
          SimpleDialogOption(
            onPressed: () {
              ref.read(localeProvider.notifier).clearLocale();
              Navigator.pop(ctx);
            },
            child: Text(l10n.systemDefault),
          ),
          SimpleDialogOption(
            onPressed: () {
              ref.read(localeProvider.notifier).setLocale(const Locale('en'));
              Navigator.pop(ctx);
            },
            child: Text(l10n.english),
          ),
          SimpleDialogOption(
            onPressed: () {
              ref.read(localeProvider.notifier).setLocale(const Locale('es'));
              Navigator.pop(ctx);
            },
            child: Text(l10n.spanish),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(authProvider);
    final alarmState = ref.watch(alarmListProvider);
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.myAlarms),
        actions: [
          IconButton(
            icon: const Icon(Icons.language),
            onPressed: _showLanguageDialog,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
        ],
      ),
      body: alarmState.loading
          ? const Center(child: CircularProgressIndicator())
          : alarmState.error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(alarmState.error!, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => ref.read(alarmListProvider.notifier).loadAlarms(),
                        child: Text(l10n.retry),
                      ),
                    ],
                  ),
                )
              : alarmState.alarms.isEmpty
                  ? Center(
                      child: Text(
                        l10n.noAlarmsYet,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 18, color: Colors.grey),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: () => ref.read(alarmListProvider.notifier).loadAlarms(),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: alarmState.alarms.length,
                        itemBuilder: (context, index) {
                          final alarm = alarmState.alarms[index];
                          return _AlarmCard(alarm: alarm);
                        },
                      ),
                    ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/create'),
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _AlarmCard extends StatelessWidget {
  final Alarm alarm;

  const _AlarmCard({required this.alarm});

  Color get _statusColor {
    switch (alarm.status) {
      case 'active':
        return Colors.green;
      case 'triggered':
        return Colors.red;
      case 'cancelled':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  String _statusLabel(AppLocalizations l10n) {
    switch (alarm.status) {
      case 'active':
        return l10n.statusActive;
      case 'triggered':
        return l10n.statusTriggered;
      case 'cancelled':
        return l10n.statusCancelled;
      default:
        return alarm.status.toUpperCase();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final targetDate = DateTime.parse(alarm.targetTime).toLocal();
    final formatter = DateFormat('MMM d, y HH:mm');

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Icon(
          alarm.isActive ? Icons.alarm : alarm.isTriggered ? Icons.alarm_on : Icons.alarm_off,
          color: _statusColor,
          size: 32,
        ),
        title: Text(
          alarm.label,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(formatter.format(targetDate)),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: _statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                _statusLabel(l10n),
                style: TextStyle(color: _statusColor, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push('/alarm/${alarm.id}'),
      ),
    );
  }
}
